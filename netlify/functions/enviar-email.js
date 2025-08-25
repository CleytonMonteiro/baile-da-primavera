import QRCode from 'qrcode';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Adiciona o cabeçalho CORS para permitir requisições de qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Lida com a requisição de pré-verificação (preflight request)
  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  
  // Use um bloco try-catch para capturar qualquer falha durante a execução
  try {
    let body;
    try {
      // Tenta parsear o corpo da requisição. Se falhar, o corpo está vazio ou mal-formado.
      body = JSON.parse(req.body);
    } catch (e) {
      console.error('Falha ao parsear JSON:', e);
      return res.status(400).json({ message: 'Corpo da requisição inválido.' });
    }

    const { numero, nome, email } = body;

    if (!numero || !nome || !email) {
      return res.status(400).json({ message: 'Dados incompletos.' });
    }

    const qrData = JSON.stringify({
      mesa: numero,
      nome: nome,
      evento: "AABB ARACAJU",
      data: "2025-06-26"
    });
    const qrCodeDataURL = await QRCode.toDataURL(qrData);

    const { data, error } = await resend.emails.send({
      from: 'cleyton30@gmail.com',
      to: [email],
      subject: `Confirmação de Venda - Mesa ${String(numero).padStart(2, '0')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #007bff;">Confirmação de Compra - AABB ARACAJU</h2>
          <p>Olá, <strong>${nome}</strong>,</p>
          <p>Obrigado por sua compra! A sua reserva da <strong>Mesa ${String(numero).padStart(2, '0')}</strong> foi confirmada.</p>
          <p>Apresente o QR Code abaixo na entrada do evento para validação.</p>
          <div style="text-align: center; margin-top: 20px; padding: 10px; border: 1px dashed #ccc;">
            <img src="${qrCodeDataURL}" alt="QR Code da Mesa ${numero}" style="width: 200px; height: 200px;" />
            <p style="font-size: 0.8em; color: #666;">Número da Mesa: ${String(numero).padStart(2, '0')}</p>
          </div>
          <p style="margin-top: 30px;">Atenciosamente,</p>
          <p><strong>AABB ARACAJU</strong></p>
        </div>
      `,
    });

    if (error) {
      console.error({ error });
      return res.status(500).json({ message: 'Erro ao enviar e-mail.', details: error.message });
    }

    res.status(200).json({ message: 'E-mail enviado com sucesso!', emailData: data });
  } catch (error) {
    console.error('Erro fatal na função:', error);
    res.status(500).json({ message: 'Falha interna do servidor.', details: error.message });
  }
}