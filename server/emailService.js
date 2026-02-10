const nodemailer = require('nodemailer');

// Konfigurasi transporter email
// Gunakan environment variables untuk keamanan
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password',
  },
});

/**
 * Mengirim email pengingat absensi kepada karyawan
 * @param {string} to - Alamat email karyawan
 * @param {string} name - Nama lengkap karyawan
 * @returns {Promise}
 */
async function sendAttendanceReminder(to, name) {
  const mailOptions = {
    from: '"Sistem Absensi HR" <noreply@attendance-system.com>',
    to: to,
    subject: 'Pengingat: Jam Absensi Masuk (08:00 AM)',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Halo ${name},</h2>
        <p>Kami menyadari bahwa Anda belum melakukan absensi masuk hingga pukul 08:00 pagi ini.</p>
        <p>Mohon segera melakukan absensi melalui aplikasi sistem absensi untuk mencatat kehadiran Anda tepat waktu.</p>
        <p>Jika Anda mengalami kendala teknis atau sedang dalam perjalanan dinas/sakit, mohon informasikan kepada HR.</p>
        <br>
        <p>Terima kasih,</p>
        <p><strong>Tim HR</strong></p>
      </div>
    `,
  };

  try {
    // Jika tidak ada kredensial yang valid, kita hanya log saja di mode pengembangan
    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-email@gmail.com') {
      console.log(`[Email Mock] Mengirim email pengingat ke: ${to} (${name})`);
      return { success: true, message: 'Mock email sent' };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = {
  sendAttendanceReminder,
};
