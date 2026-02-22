const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: process.env.SMTP_PORT || 2525,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'your-user',
    pass: process.env.SMTP_PASS || 'your-pass',
  },
});

const sendAttendanceReminder = async (email, fullName) => {
  const mailOptions = {
    from: '"HRGA Team" <hr@thunusa.com>',
    to: email,
    subject: 'Absence Reminder',
    text: `Holo Rekan-rekan ${fullName},

Semoga hari kalian menyenangkan!

Kami ingin memberikan pengingat kecil mengenai pentingnya melakukan absensi tepat waktu, baik saat memulai pekerjaan maupun saat selesai (check-in & check-out).

Mengapa ini penting?
- Akurasi Data: Membantu HR memastikan data kehadiran kalian tercatat dengan benar.
- Kelancaran Payroll: Mempercepat proses rekapitulasi gaji dan tunjangan tanpa kendala data manual.
- Profesionalisme: Menjaga budaya disiplin yang sudah kita bangun bersama.

Jika rekan-rekan mengalami kendala teknis pada sistem absensi, mohon segera hubungi tim HR agar bisa segera kami bantu solusinya.

Terima kasih atas kerja sama dan dedikasi rekan-rekan semua. Semangat beraktivitas!

Salam hangat,
Tim HR`,
    html: `
      <p>Holo Rekan-rekan <strong>${fullName}</strong>,</p>
      <p>Semoga hari kalian menyenangkan!</p>
      <p>Kami ingin memberikan pengingat kecil mengenai pentingnya melakukan absensi tepat waktu, baik saat memulai pekerjaan maupun saat selesai (check-in & check-out).</p>
      <p><strong>Mengapa ini penting?</strong></p>
      <ul>
        <li><strong>Akurasi Data:</strong> Membantu HR memastikan data kehadiran kalian tercatat dengan benar.</li>
        <li><strong>Kelancaran Payroll:</strong> Mempercepat proses rekapitulasi gaji dan tunjangan tanpa kendala data manual.</li>
        <li><strong>Profesionalisme:</strong> Menjaga budaya disiplin yang sudah kita bangun bersama.</li>
      </ul>
      <p>Jika rekan-rekan mengalami kendala teknis pada sistem absensi, mohon segera hubungi tim HR agar bisa segera kami bantu solusinya.</p>
      <p>Terima kasih atas kerja sama dan dedikasi rekan-rekan semua. Semangat beraktivitas!</p>
      <p>Salam hangat,<br><strong>Tim HR</strong></p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendAttendanceReminder };
