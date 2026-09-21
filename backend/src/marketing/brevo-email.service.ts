import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendEmailOptions {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  unsubscribeUrl?: string;
}

@Injectable()
export class BrevoEmailService {
  private readonly logger = new Logger(BrevoEmailService.name);
  private readonly apiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('BREVO_API_KEY') || '';
    this.senderEmail = this.config.get<string>('BREVO_SENDER_EMAIL') || 'ladakhvacation@gmail.com';
    this.senderName = this.config.get<string>('BREVO_SENDER_NAME') || 'Ladakh Vacation';

    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY not configured — outbound email broadcast will run in simulated test mode.');
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Sends a transactional / broadcast HTML email via Brevo REST API.
   * If not configured, logs to console and returns simulated messageId.
   */
  async sendEmail(opts: SendEmailOptions): Promise<{ messageId: string }> {
    let finalHtml = opts.htmlContent;
    if (opts.unsubscribeUrl) {
      finalHtml += `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
          You received this email because you expressed interest in Ladakh Vacation travel packages.<br />
          <a href="${opts.unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Unsubscribe from marketing emails</a>
        </div>
      `;
    }

    if (!this.apiKey) {
      this.logger.log(`[SIMULATED EMAIL] To: ${opts.toEmail} | Subject: ${opts.subject}`);
      return { messageId: `mock-brevo-${Date.now()}-${Math.random().toString(36).substring(7)}` };
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [
          {
            email: opts.toEmail,
            name: opts.toName || opts.toEmail,
          },
        ],
        subject: opts.subject,
        htmlContent: finalHtml,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      this.logger.error(`Brevo send error: ${JSON.stringify(data)}`);
      throw new Error(`Brevo API Error: ${data.message || res.statusText}`);
    }

    return { messageId: data.messageId || '' };
  }
}
