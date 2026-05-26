import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private fromEmail: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (apiKey) sgMail.setApiKey(apiKey);

    this.fromEmail = this.config.get<string>('SENDGRID_FROM_EMAIL') || '';
  }

  async sendInviteEmail(params: {
    to: string;
    role: 'OPS_MANAGER' | 'ENGINEER';
    invitedByEmail: string;
    setupLink: string;
    webLoginUrl?: string;
    androidUrl?: string;
    iosUrl?: string;
  }) {
    const { to, role, invitedByEmail, setupLink, webLoginUrl, androidUrl, iosUrl } = params;

    const subject =
      role === 'OPS_MANAGER'
        ? 'You’ve been invited to UnitedCPS Staff Management (Ops Manager)'
        : 'You’ve been invited to UnitedCPS Staff Management (Engineer)';

    const lines: string[] = [
      `Hello,`,
      ``,
      `${invitedByEmail} has invited you to join UnitedCPS Staff Management as ${role.replace('_', ' ')}.`,
      ``,
      `Set up your password using this link:`,
      setupLink,
      ``,
    ];

    if (role === 'OPS_MANAGER' && webLoginUrl) {
      lines.push(`Ops Manager login:`, webLoginUrl, ``);
    }

    if (role === 'ENGINEER') {
      lines.push(`Engineer app:`);
      if (androidUrl) lines.push(`Android: ${androidUrl}`);
      if (iosUrl) lines.push(`iPhone: ${iosUrl}`);
      lines.push(``);
    }

    lines.push(`If you were not expecting this invitation, you can ignore this email.`);

    await sgMail.send({
      to,
      from: this.fromEmail,
      subject,
      text: lines.join('\n'),
    });
  }
  async sendPasswordResetEmail(params: { to: string; resetLink: string }) {
  const { to, resetLink } = params;

  const subject = 'Reset your UnitedCPS password';

  const lines: string[] = [
    `Hello,`,
    ``,
    `We received a request to reset your password.`,
    `Use the link below to set a new password:`,
    resetLink,
    ``,
    `If you did not request this, you can ignore this email.`,
  ];

  await sgMail.send({
    to,
    from: this.fromEmail,
    subject,
    text: lines.join('\n'),
  });
}
}
