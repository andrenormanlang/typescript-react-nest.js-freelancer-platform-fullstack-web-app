import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host =
      this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const portEnv = this.configService.get<string>('SMTP_PORT');
    const port = portEnv ? Number(portEnv) : 465;
    const secureEnv = this.configService.get<string>('SMTP_SECURE');
    const secure =
      typeof secureEnv === 'string' ? secureEnv === 'true' : port === 465;

    const authUser = this.configService.get<string>('SMTP_USER');
    const authPass = this.configService.get<string>('SMTP_PASS');

    const transportOptions: any = {
      host,
      port,
      secure,
      auth: {
        user: authUser,
        pass: authPass,
      },
    };

    // For STARTTLS (port 587) ensure TLS upgrade is required
    if (!secure) {
      transportOptions.requireTLS = true;
      // Require modern TLS version
      transportOptions.tls = { minVersion: 'TLSv1.2' };
    }

    console.log('Creating SMTP transporter', {
      host,
      port,
      secure,
      user: !!authUser,
    });
    this.transporter = nodemailer.createTransport(transportOptions);

    // Verify connection configuration early to log helpful errors
    this.transporter.verify((err, success) => {
      if (err) {
        console.error('SMTP connection verify failed:', err);
      } else {
        console.log('SMTP connection verified');
      }
    });
  }

  async sendVerificationEmail(
    to: string,
    verificationLink: string
  ): Promise<void> {
    const msg = {
      from:
        this.configService.get<string>('EMAIL_FROM') ||
        this.configService.get<string>('SMTP_USER'),
      to,
      subject: 'Email Verification',
      html: `
        <p>Thank you for registering. Please verify your email by clicking the link below:</p>
        <a href="${verificationLink}">Verify Email</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(msg as any);
      console.log(`Verification email sent to ${to}: ${info.messageId}`);
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const msg = {
      from:
        this.configService.get<string>('EMAIL_FROM') ||
        this.configService.get<string>('SMTP_USER'),
      to,
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(msg as any);
      console.log(`Password reset email sent to ${to}: ${info.messageId}`);
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}
