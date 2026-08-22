const nodemailer = require('nodemailer');

function env(name, fallback = '') {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getSmtpUser() {
  return env('SMTP_USER') || env('EMAIL_USER');
}

function getSmtpPass() {
  return env('SMTP_PASS') || env('EMAIL_PASSWORD');
}

function getMailFrom() {
  return env('EMAIL_FROM') || getSmtpUser() || 'noreply@grow24.ai';
}

function isEmailConfigured() {
  const user = getSmtpUser();
  const pass = getSmtpPass();
  const service = (env('SMTP_SERVICE') || env('EMAIL_SERVICE')).toLowerCase();
  const host = env('SMTP_HOST') || env('EMAIL_HOST');
  if (user && pass && (host || service === 'gmail')) return true;
  return Boolean(env('SENDGRID_API_KEY'));
}

function createMailTransporter() {
  const user = getSmtpUser();
  const pass = getSmtpPass();
  const service = (env('SMTP_SERVICE') || env('EMAIL_SERVICE')).toLowerCase();
  const host = env('SMTP_HOST') || env('EMAIL_HOST');

  // Prefer explicit SMTP / Gmail so an old blocked SendGrid key is not used.
  if (service === 'gmail' && user && pass) {
    return {
      name: 'Gmail',
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      }),
    };
  }

  if (host && user && pass) {
    return {
      name: host,
      transporter: nodemailer.createTransport({
        host,
        port: Number(env('SMTP_PORT') || env('EMAIL_PORT') || 587),
        secure: (env('SMTP_SECURE') || 'false').toLowerCase() === 'true',
        auth: { user, pass },
      }),
    };
  }

  if (env('SENDGRID_API_KEY')) {
    return {
      name: 'SendGrid',
      transporter: nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: env('SENDGRID_API_KEY'),
        },
      }),
    };
  }

  return { name: null, transporter: null };
}

module.exports = {
  createMailTransporter,
  getMailFrom,
  isEmailConfigured,
};
