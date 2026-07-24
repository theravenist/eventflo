import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  constructor() {
    this.isMock = process.env.EMAIL_MOCK !== 'false';
    this.from = process.env.SMTP_FROM || 'noreply@eventhub.com';

    if (!this.isMock) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '2525', 10),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendMail({ to, subject, html, text }) {
    if (this.isMock) {
      console.log('==================================================');
      console.log(`[EMAIL MOCK] Sending email to: ${to}`);
      console.log(`[EMAIL MOCK] Subject: ${subject}`);
      console.log(`[EMAIL MOCK] Content:\n${text || html}`);
      console.log('==================================================');
      return { messageId: 'mock-id-' + Math.random().toString(36).substring(2, 10) };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      console.log(`Email successfully sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendRegistrationEmail(userEmail, userName) {
    const subject = 'Welcome to EventFlo!';
    const text = `Hi ${userName},\n\nWelcome to EventFlo! Your account has been registered successfully.\n\nBest regards,\nThe EventFlo Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4a6b82;">Welcome to EventFlo!</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your account has been registered successfully. You can now browse events and book tickets.</p>
        <p>Best regards,<br/>The EventFlo Team</p>
      </div>
    `;
    return this.sendMail({ to: userEmail, subject, text, html });
  }

  async sendBookingConfirmationEmail(userEmail, userName, bookingDetails) {
    const { eventTitle, quantity, totalPrice, qrCode } = bookingDetails;
    const subject = `Booking Confirmation - ${eventTitle}`;
    const text = `Hi ${userName},\n\nYour booking is confirmed for ${eventTitle}.\nTickets: ${quantity}\nTotal Paid: ₹${totalPrice}\nTicket Code: ${qrCode}\n\nThank you for choosing EventFlo!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4a6b82;">Booking Confirmed!</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your booking details for the event <strong>${eventTitle}</strong> are below:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Tickets Purchased:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${quantity}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Total Price:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">₹${totalPrice}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Ticket QR Code Content:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-family: monospace;">${qrCode}</td>
          </tr>
        </table>
        <p>Download your QR code ticket from your EventFlo Dashboard to scan upon entry.</p>
        <p>Thank you for choosing EventFlo!</p>
      </div>
    `;
    return this.sendMail({ to: userEmail, subject, text, html });
  }

  async sendBookingCancellationEmail(userEmail, userName, bookingDetails) {
    const { eventTitle, quantity, refundedAmount } = bookingDetails;
    const subject = `Booking Cancelled - ${eventTitle}`;
    const text = `Hi ${userName},\n\nYour booking of ${quantity} tickets for ${eventTitle} has been cancelled.\nAmount Refunded: ₹${refundedAmount}\n\nBest regards,\nThe EventFlo Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ef4444;">Booking Cancelled</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your booking of ${quantity} tickets for <strong>${eventTitle}</strong> has been cancelled.</p>
        <p>A refund of <strong>₹${refundedAmount}</strong> has been processed to your payment method.</p>
        <p>Best regards,<br/>The EventFlo Team</p>
      </div>
    `;
    return this.sendMail({ to: userEmail, subject, text, html });
  }

  async sendPasswordResetEmail(userEmail, userName, resetLink) {
    const subject = 'Reset Your EventFlo Password';
    const text = `Hi ${userName},\n\nYou requested a password reset. Click the link below to set a new password:\n${resetLink}\n\nIf you did not request this, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4a6b82;">Reset Your Password</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${resetLink}" style="background-color: #4a6b82; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4a5568;">${resetLink}</p>
        <p>Best regards,<br/>The EventFlo Team</p>
      </div>
    `;
    return this.sendMail({ to: userEmail, subject, text, html });
  }

  async sendEventReminderEmail(userEmail, userName, eventTitle, eventDate) {
    const subject = `Reminder: Upcoming Event - ${eventTitle}`;
    const text = `Hi ${userName},\n\nThis is a reminder that the event "${eventTitle}" is coming up on ${new Date(eventDate).toLocaleString()}.\n\nWe look forward to seeing you there!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4a6b82;">Upcoming Event Reminder</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>This is a reminder that the event <strong>${eventTitle}</strong> is happening soon!</p>
        <p><strong>Date & Time:</strong> ${new Date(eventDate).toLocaleString()}</p>
        <p>Please make sure to have your QR ticket ready for check-in.</p>
        <p>We look forward to seeing you there!</p>
      </div>
    `;
    return this.sendMail({ to: userEmail, subject, text, html });
  }
}

export default new EmailService();
