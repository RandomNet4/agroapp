import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendRegistrationEmail(email: string, nama: string, noHp: string, passwordPlain: string) {
  if (!resend) {
    console.warn('Resend API key is not configured. Email will not be sent.');
    return;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Pendaftaran dan Verifikasi Akun AgroTani Berhasil',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #059669; text-align: center;">Selamat Datang di AgroTani!</h2>
          <p>Halo <strong>${nama}</strong>,</p>
          <p>Akun Anda telah berhasil terdaftar dan diverifikasi di platform AgroTani sebagai Petani Mitra.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Detail Akun Anda:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; color: #4b5563; width: 120px;"><strong>Email:</strong></td>
                <td style="padding: 5px 0; color: #111827;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #4b5563;"><strong>No. HP:</strong></td>
                <td style="padding: 5px 0; color: #111827;">${noHp}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #4b5563;"><strong>Password:</strong></td>
                <td style="padding: 5px 0; color: #111827;"><code>${passwordPlain}</code></td>
              </tr>
            </table>
          </div>
          
          <p>Anda sekarang dapat login ke aplikasi menggunakan nomor HP / email dan password di atas.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Layanan Otomatis AgroTani &copy; 2026</p>
        </div>
      `,
    });

    if (error) {
      throw error;
    }

    console.log('Registration email sent successfully to', email, ':', data?.id);
  } catch (error) {
    console.error('Error sending registration email to', email, ':', error);
    throw error;
  }
}

export async function sendAccountApprovalEmail(email: string, nama: string, gudangNama?: string) {
  if (!resend) {
    console.warn('Resend API key is not configured. Email will not be sent.');
    return;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Akun AgroTani Anda Telah Aktif! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #059669; text-align: center;">Selamat, Akun Anda Telah Aktif!</h2>
          <p>Halo <strong>${nama}</strong>,</p>
          <p>Dengan gembira kami sampaikan bahwa pendaftaran akun Anda di platform <strong>AgroTani</strong> telah disetujui oleh admin dan kini berstatus <strong>Aktif</strong>.</p>
          
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #065f46;">Informasi Gudang Hubungan Anda:</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #047857;">${gudangNama || '-'}</p>
          </div>
          
          <p>Anda sekarang dapat login ke aplikasi menggunakan email/nomor HP serta password yang telah Anda daftarkan sebelumnya.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:5173" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Masuk ke Aplikasi</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Layanan Otomatis AgroTani &copy; 2026. Mohon tidak membalas email ini.</p>
        </div>
      `,
    });

    if (error) {
      throw error;
    }

    console.log('Account approval email sent successfully to', email, ':', data?.id);
  } catch (error) {
    console.error('Error sending account approval email to', email, ':', error);
    throw error;
  }
}
