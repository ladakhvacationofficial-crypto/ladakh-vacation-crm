import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfigService } from '@nestjs/config';
import { crmBaseUrl } from '../common/site';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid credentials');

    const access_token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      return { message: 'If the email is registered, a reset link will be sent.' };
    }
    const secret = this.config.get<string>('JWT_SECRET') + user.passwordHash;
    const token = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret, expiresIn: '15m' }
    );

    // If Brevo is configured, transactional reset email is dispatched
    const brevoKey = this.config.get<string>('BREVO_API_KEY');
    if (brevoKey) {
      try {
        const base = crmBaseUrl(this.config.get<string>('CRM_BASE_URL'));
        const resetUrl = `${base}/reset-password?token=${token}`;
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: 'Ladakh Vacation CRM',
              email: this.config.get<string>('BREVO_SENDER_EMAIL') || 'ladakhvacation@gmail.com',
            },
            to: [{ email: user.email, name: user.name }],
            subject: 'Reset your Ladakh Vacation CRM password',
            htmlContent: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2>Password Reset Request</h2>
                <p>Hello ${user.name},</p>
                <p>A password reset was requested for your Ladakh Vacation CRM account. Click the button below to reset your password. This link expires in 15 minutes.</p>
                <p style="margin: 24px 0;">
                  <a href="${resetUrl}" style="background: #1e4fa8; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </p>
                <p style="font-size: 12px; color: #64748b;">If you did not request this, you can safely ignore this email.</p>
              </div>
            `,
          }),
        });
      } catch {
        // Suppress email dispatch errors to prevent timing attacks
      }
    }

    return { 
      message: 'If the email is registered, a reset link will be sent.'
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const decoded = this.jwt.decode(dto.token) as any;
      if (!decoded || !decoded.sub) throw new UnauthorizedException('Invalid token');
      
      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) throw new UnauthorizedException('Invalid token');
      
      const secret = this.config.get<string>('JWT_SECRET') + user.passwordHash;
      await this.jwt.verifyAsync(dto.token, { secret });
      
      const passwordHash = await bcrypt.hash(dto.newPassword, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      });
      return { message: 'Password reset successfully' };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}