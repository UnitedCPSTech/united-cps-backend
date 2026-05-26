import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';

import type { StringValue } from 'ms';


import { User, UserDocument, UserRole } from '../users/user.schema';
import { Invite, InviteDocument } from '../invites/invite.schema';
import { RefreshToken, RefreshTokenDocument } from './refresh-token.schema';
import { MailService } from './mail.service';
import { PasswordResetToken, PasswordResetTokenDocument } from './password-reset-token.schema';
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Invite.name) private inviteModel: Model<InviteDocument>,
    @InjectModel(PasswordResetToken.name) private resetTokenModel: Model<PasswordResetTokenDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  // -----------------------------
  // Helpers
  // -----------------------------
  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private async issueAccessToken(user: any) {
    const payload = {
      sub: String(user._id),
      email: user.email,
      role: user.role,
      country: user.country,
      scopeType: user.scopeType,
      scopeCountries: user.scopeCountries || [],
    };
    return this.jwt.signAsync(payload);
  }

  private async issueAndStoreRefreshToken(params: {
    userId: Types.ObjectId;
    userAgent?: string | null;
    ip?: string | null;
  }) {
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new BadRequestException('JWT_REFRESH_SECRET is not configured.');
    }

    const refreshExpiresInRaw =
  this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d';

const refreshExpiresIn: number | StringValue =
  /^\d+$/.test(refreshExpiresInRaw)
    ? Number(refreshExpiresInRaw)
    : (refreshExpiresInRaw as StringValue);

const refreshToken = await this.jwt.signAsync(
  { sub: String(params.userId), typ: 'refresh' },
  { secret: refreshSecret, expiresIn: refreshExpiresIn },
);


    const tokenHash = this.sha256(refreshToken);

    // derive expiresAt (simple approach: 30 days fixed)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.refreshTokenModel.create({
      userId: params.userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
      createdAt: now,
      userAgent: params.userAgent ?? null,
      ip: params.ip ?? null,
    });

    return refreshToken;
  }

  private canInvite(inviterRole: UserRole, targetRole: 'OPS_MANAGER' | 'ENGINEER') {
  if (inviterRole === UserRole.GENERAL_MANAGER) return targetRole === 'OPS_MANAGER' || targetRole === 'ENGINEER';
  if (inviterRole === UserRole.OPS_MANAGER) return targetRole === 'ENGINEER';
  return false;
}


  async preflight(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1) Check if active user exists
    const user = await this.userModel.findOne({ email: normalizedEmail }).lean();

    if (user && user.passwordHash) {
      return {
        status: 'ACTIVE',
      };
    }

    // 2) Check for valid invite
    const now = new Date();
    const invite = await this.inviteModel
      .findOne({
        email: normalizedEmail,
        usedAt: null,
        expiresAt: { $gt: now },
      })
      .lean();

    if (invite) {
      return {
        status: 'INVITED',
      };
    }

    // 3) Nothing found
    return {
      status: 'NOT_FOUND',
    };
  }

  async createInvite(params: {
    inviterEmail: string;
    email: string;
    role: 'OPS_MANAGER' | 'ENGINEER';
    country: string;
  }) {
    const inviterEmail = params.inviterEmail.toLowerCase().trim();
    const email = params.email.toLowerCase().trim();

    const inviter = await this.userModel.findOne({ email: inviterEmail }).lean();
    if (!inviter) throw new ForbiddenException('Inviter is not recognized.');

    if (!this.canInvite(inviter.role as UserRole, params.role)) {
      throw new ForbiddenException('You are not allowed to invite this role.');
    }

    // If user already exists, block
    const existingUser = await this.userModel.findOne({ email }).lean();
    if (existingUser)
      throw new ConflictException('A user with this email already exists.');

    // If an active invite already exists, block (simple and effective)
    const now = new Date();
    const existingInvite = await this.inviteModel
      .findOne({
        email,
        usedAt: null,
        expiresAt: { $gt: now },
      })
      .lean();

    if (existingInvite)
      throw new ConflictException(
        'An active invite already exists for this email.',
      );

    // Generate raw token (send by email), store only hash in DB
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const days = Number(this.config.get<string>('INVITE_EXPIRES_DAYS') || '7');
    if (!Number.isFinite(days) || days <= 0)
      throw new BadRequestException('Invalid INVITE_EXPIRES_DAYS');

    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    await this.inviteModel.create({
      email,
      role: params.role,
      country: params.country,
      tokenHash,
      expiresAt,
      usedAt: null,
      createdBy: new Types.ObjectId(inviter._id),
      createdAt: now,
    });

    const publicBase =
      this.config.get<string>('PUBLIC_WEB_BASE_URL') ||
      'http://localhost:5173';
const setupLink = `${publicBase.replace(/\/$/, '')}/accept-invite?token=${rawToken}`;

    const webLoginUrl = `${publicBase.replace(/\/$/, '')}/opsmanager`;
    const androidUrl = this.config.get<string>('ENGINEER_APP_ANDROID_URL') || '';
    const iosUrl = this.config.get<string>('ENGINEER_APP_IOS_URL') || '';

    await this.mail.sendInviteEmail({
      to: email,
      role: params.role,
      invitedByEmail: inviterEmail,
      setupLink,
      webLoginUrl,
      androidUrl,
      iosUrl,
    });

    return { status: 'INVITE_SENT' };
  }

  // -----------------------------
  // New: Login / Refresh / Logout
  // -----------------------------
  async login(
  email: string,
  password: string,
  meta?: { userAgent?: string; ip?: string },
) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await this.userModel.findOne({ email: normalizedEmail }).lean();
  if (!user) throw new UnauthorizedException('Invalid credentials.');
  if (!user.isActive) throw new ForbiddenException('Account is inactive.');
  if (!user.passwordHash) {
    throw new ForbiddenException('Password not set. Please complete setup.');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new UnauthorizedException('Invalid credentials.');

  const now = new Date();
  await this.userModel.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: now, updatedAt: now } },
  );

  const accessToken = await this.issueAccessToken(user);
  const refreshToken = await this.issueAndStoreRefreshToken({
    userId: user._id,
    userAgent: meta?.userAgent ?? null,
    ip: meta?.ip ?? null,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      country: user.country ?? null,
      scopeType: user.scopeType ?? null,
      scopeCountries: user.scopeCountries ?? [],
      mustChangePassword: !!user.mustChangePassword,
    },
  };
}

  async refresh(
    refreshToken: string,
    meta?: { userAgent?: string; ip?: string },
  ) {
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new BadRequestException('JWT_REFRESH_SECRET is not configured.');
    }

    let decoded: any;
    try {
      decoded = await this.jwt.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (decoded?.typ !== 'refresh' || !decoded?.sub) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const tokenHash = this.sha256(refreshToken);

    const record = await this.refreshTokenModel.findOne({ tokenHash }).lean();
    if (!record) throw new UnauthorizedException('Refresh token not recognized.');

    if (record.revokedAt)
      throw new UnauthorizedException('Refresh token revoked.');
    if (record.expiresAt <= new Date())
      throw new UnauthorizedException('Refresh token expired.');

    // revoke old token (rotation)
    await this.refreshTokenModel.updateOne(
      { _id: record._id },
      { $set: { revokedAt: new Date() } },
    );

    const user = await this.userModel.findById(record.userId).lean();
    if (!user || !user.isActive)
      throw new UnauthorizedException('User not available.');

    const accessToken = await this.issueAccessToken(user);
    const newRefreshToken = await this.issueAndStoreRefreshToken({
      userId: user._id,
      userAgent: meta?.userAgent ?? null,
      ip: meta?.ip ?? null,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.sha256(refreshToken);

    await this.refreshTokenModel.updateOne(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    return { status: 'LOGGED_OUT' };
  }

  // -----------------------------
  // Updated: Accept invite returns tokens
  // -----------------------------
  async acceptInvite(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const invite = await this.inviteModel.findOne({ tokenHash }).lean();

    if (!invite) {
      throw new UnauthorizedException('Invalid invite token.');
    }

    if (invite.usedAt) {
      throw new GoneException('This invite has already been used.');
    }

    if (invite.expiresAt <= new Date()) {
      throw new GoneException('This invite has expired.');
    }

    const existingUser = await this.userModel.findOne({ email: invite.email }).lean();
    if (existingUser) {
      throw new UnauthorizedException('User already exists.');
    }

    const rounds = Number(this.config.get('BCRYPT_ROUNDS') || 10);
    const passwordHash = await bcrypt.hash(password, rounds);
    const now = new Date();

    const user = await this.userModel.create({
      email: invite.email,
      passwordHash,
      role: invite.role,
      country: invite.country,
      scopeType: 'COUNTRY',
      scopeCountries: [invite.country],
      isActive: true,
      mustChangePassword: false,
      lastLoginAt: now,
      passwordSetAt: now,
      createdBy: invite.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    await this.inviteModel.updateOne(
      { _id: invite._id },
      { $set: { usedAt: now } },
    );

    const accessToken = await this.issueAccessToken(user);
    const refreshToken = await this.issueAndStoreRefreshToken({
      userId: user._id,
    });

    return {
      status: 'ACCOUNT_CREATED',
      accessToken,
      refreshToken,
    };
  }
  async me(userId: string) {
  const user = await this.userModel.findById(userId).lean();
  if (!user) return null;

  // remove passwordHash from response
  const { passwordHash, ...safe } = user as any;
  return safe;
}
async forgotPassword(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  // Always return OK to avoid account enumeration
  const user = await this.userModel.findOne({ email: normalizedEmail }).lean();
  if (!user || !user.isActive) {
    return { status: 'OK' };
  }

  // Optional: if password not set yet, still allow reset
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = this.sha256(rawToken);

  const ttlMinutes = Number(this.config.get<string>('PASSWORD_RESET_TTL_MINUTES') || '30');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  await this.resetTokenModel.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    usedAt: null,
    createdAt: now,
  });

  const publicBase =
    this.config.get<string>('PUBLIC_WEB_BASE_URL') || 'http://localhost:5173';

  // You can change this path to whatever your frontend will implement
  const resetLink = `${publicBase.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

  await this.mail.sendPasswordResetEmail({
    to: normalizedEmail,
    resetLink,
  });

  return { status: 'OK' };
}

async resetPassword(token: string, newPassword: string) {
  const tokenHash = this.sha256(token);
  const now = new Date();

  const record = await this.resetTokenModel.findOne({ tokenHash }).lean();
  if (!record) throw new UnauthorizedException('Invalid or expired reset token.');

  if (record.usedAt) throw new GoneException('This reset token has already been used.');
  if (record.expiresAt <= now) throw new GoneException('This reset token has expired.');

  const user = await this.userModel.findById(record.userId).lean();
  if (!user || !user.isActive) throw new UnauthorizedException('User not available.');

  const rounds = Number(this.config.get('BCRYPT_ROUNDS') || 10);
  const passwordHash = await bcrypt.hash(newPassword, rounds);

  await this.userModel.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash,
        mustChangePassword: false,
        passwordSetAt: now,
        updatedAt: now,
      },
    },
  );

  await this.resetTokenModel.updateOne(
    { _id: record._id },
    { $set: { usedAt: now } },
  );

  return { status: 'PASSWORD_RESET' };
}

async changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await this.userModel.findById(userId).lean();
  if (!user) throw new UnauthorizedException('User not found.');
  if (!user.isActive) throw new ForbiddenException('Account is inactive.');
  if (!user.passwordHash) throw new ForbiddenException('Password not set.');

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new UnauthorizedException('Current password is incorrect.');

  const rounds = Number(this.config.get('BCRYPT_ROUNDS') || 10);
  const passwordHash = await bcrypt.hash(newPassword, rounds);

  const now = new Date();
  await this.userModel.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash,
        mustChangePassword: false,
        passwordSetAt: now,
        updatedAt: now,
      },
    },
  );

  return { status: 'PASSWORD_CHANGED' };
}

}
