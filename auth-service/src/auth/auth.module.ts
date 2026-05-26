import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { StringValue } from 'ms';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';

import { User, UserSchema } from '../users/user.schema';
import { Invite, InviteSchema } from '../invites/invite.schema';
import { RefreshToken, RefreshTokenSchema } from './refresh-token.schema';

import { JwtStrategy } from './jwt.strategy';

import { PasswordResetToken, PasswordResetTokenSchema } from './password-reset-token.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Invite.name, schema: InviteSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_ACCESS_SECRET');
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET is not configured');
        }

        const expiresInRaw =
          config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';

        const expiresIn: number | StringValue =
          /^\d+$/.test(expiresInRaw)
            ? Number(expiresInRaw)
            : (expiresInRaw as StringValue);

        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService, JwtStrategy],
})
export class AuthModule {}
