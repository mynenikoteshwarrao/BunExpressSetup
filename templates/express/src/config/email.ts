import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

const createEmailTransporter = () => {
  const config: EmailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    }
  };

  return nodemailer.createTransport(config);
};

export const transporter = createEmailTransporter();

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

// Email templates
export const emailTemplates = {
  welcomeEmail: (username: string) => ({
    subject: 'Welcome to {{PROJECT_NAME}}!',
    html: `
      <h2>Welcome, ${username}!</h2>
      <p>Thank you for joining {{PROJECT_NAME}}. We're excited to have you on board!</p>
      <p>Best regards,<br>The {{PROJECT_NAME}} Team</p>
    `,
    text: `Welcome, ${username}! Thank you for joining {{PROJECT_NAME}}. We're excited to have you on board!`
  }),

  resetPasswordEmail: (resetToken: string, resetUrl: string) => ({
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your {{PROJECT_NAME}} account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    text: `Password reset request for {{PROJECT_NAME}}. Reset your password using this link: ${resetUrl}. Link expires in 1 hour.`
  }),

  passwordResetConfirmation: (username: string) => ({
    subject: 'Password Reset Successful',
    html: `
      <h2>Password Reset Successful</h2>
      <p>Hello ${username},</p>
      <p>Your password has been successfully reset for your {{PROJECT_NAME}} account.</p>
      <p>If you didn't make this change, please contact us immediately.</p>
    `,
    text: `Password reset successful for ${username}. If you didn't make this change, please contact us.`
  })
};