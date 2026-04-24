import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  auth: {
    user: process.env.SMTP_USER || "test_user",
    pass: process.env.SMTP_PASS || "test_pass",
  },
});

export async function sendAlertEmail(emails: string[], alert: any) {
  if (!emails || emails.length === 0) return false;

  const CHUNK_SIZE = 50;
  let allBatchesSent = true;

  for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
    const chunk = emails.slice(i, i + CHUNK_SIZE);

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Humanitarian Ops" <alerts@humanitarian.org>',
      to: process.env.SMTP_NOREPLY || '"Equipe de Alertas" <noreply@equipehumanitaria.org>',
      bcc: chunk, // Cópia Oculta para proteger a privacidade dos usuários e evitar bloqueios por SPAM
      subject: `🚨 ALERTA: ${alert.severity.toUpperCase()} - ${alert.disaster_type} em ${alert.region}`,
      text: `
        Alerta Crítico Emitido:
        Região: ${alert.region}
        Tipo: ${alert.disaster_type}
        Severidade: ${alert.severity}
        
        Descrição:
        ${alert.description}

        Acesse o painel para mais informações: ${process.env.APP_URL}/alert/${alert.id}
      `,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f7f7f7; color: #333;">
          <div style="max-w: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; border-top: 4px solid #ff5451;">
            <div style="padding: 20px; text-align: center; background-color: #1a1a1a; color: white;">
              <h1 style="margin: 0; font-size: 24px;">ALERTA DE DESASTRE</h1>
            </div>
            <div style="padding: 20px;">
              <p><strong>Severidade:</strong> <span style="background-color: #ffb4ab; color: #690005; padding: 2px 6px; border-radius: 4px;">${alert.severity}</span></p>
              <p><strong>Localidade:</strong> ${alert.region}</p>
              <p><strong>Tipo:</strong> ${alert.disaster_type}</p>
              <p style="margin-top: 20px;"><strong>Detalhes:</strong></p>
              <p style="background-color: #f0f0f0; padding: 10px; border-left: 3px solid #ff5451;">${alert.description}</p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/alert/${alert.id}" style="background-color: #ff5451; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold;">Acessar Dashboard</a>
              </div>
            </div>
          </div>
        </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Lote de emails enviado (tamanho: ${chunk.length}):`, info.messageId);
    } catch (error) {
      console.error(`Erro ao enviar lote de emails (tamanho: ${chunk.length}):`, error);
      allBatchesSent = false;
    }
  }

  return allBatchesSent;
}
