import { Body, Controller, Post, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PreflightDto } from './dto/preflight.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';




@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('preflight')
  @HttpCode(HttpStatus.OK)
  async preflight(@Body() dto: PreflightDto) {
    return this.authService.preflight(dto.email);
  }

  @Post('invites')
@UseGuards(JwtAuthGuard)
@HttpCode(HttpStatus.OK)
async createInvite(@Req() req: any, @Body() dto: CreateInviteDto) {
  return this.authService.createInvite({
    inviterEmail: req.user.email,   // comes from JWT payload
    email: dto.email,
    role: dto.role,
    country: dto.country,
  });
}


  @Post('accept-invite')
@HttpCode(HttpStatus.OK)
async acceptInvite(@Body() dto: AcceptInviteDto) {
  return this.authService.acceptInvite(dto.token, dto.password);
}
@Post('login')
@HttpCode(HttpStatus.OK)
async login(
  @Body() dto: LoginDto,
  @Headers('user-agent') userAgent: string,
) {
  return this.authService.login(dto.email, dto.password, { userAgent });
}

@Post('refresh')
@HttpCode(HttpStatus.OK)
async refresh(
  @Body() dto: RefreshDto,
  @Headers('user-agent') userAgent: string,
) {
  return this.authService.refresh(dto.refreshToken, { userAgent });
}

@Post('logout')
@HttpCode(HttpStatus.OK)
async logout(@Body() dto: LogoutDto) {
  return this.authService.logout(dto.refreshToken);
}

@Get('me')
@UseGuards(JwtAuthGuard)
@HttpCode(HttpStatus.OK)
async me(@Req() req: any) {
  // req.user comes from JwtStrategy.validate(payload)
  return this.authService.me(req.user.sub);
}
@Post('forgot-password')
@HttpCode(HttpStatus.OK)
async forgotPassword(@Body() dto: ForgotPasswordDto) {
  return this.authService.forgotPassword(dto.email);
}

@Post('reset-password')
@HttpCode(HttpStatus.OK)
async resetPassword(@Body() dto: ResetPasswordDto) {
  return this.authService.resetPassword(dto.token, dto.newPassword);
}

@Post('change-password')
@UseGuards(JwtAuthGuard)
@HttpCode(HttpStatus.OK)
async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
  return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
}

}
