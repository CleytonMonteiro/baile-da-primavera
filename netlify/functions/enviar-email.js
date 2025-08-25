const QRCode = require('qrcode');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://cleytonmonteiro.github.io',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { numero, nome, email } = body;

    if (!numero || !nome || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Dados incompletos.' })
      };
    }

    const qrData = JSON.stringify({
      mesa: numero,
      nome: nome,
      evento: "AABB ARACAJU",
      data: "2025-08-12"
    });
    // Gera o QR Code como um buffer, que pode ser anexado a um e-mail
    const qrCodeBuffer = await QRCode.toBuffer(qrData, { type: 'png' });

    const { data, error } = await resend.emails.send({
      from: 'Seu E-mail Verificado <onboarding@resend.dev>',
      to: [email],
      subject: `Confirmação de Venda - Mesa ${String(numero).padStart(2, '0')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #007bff;">Confirmação de Compra - AABB ARACAJU</h2>
          <p>Olá, <strong>${nome}</strong>,</p>
          <p>Obrigado por sua compra! A sua reserva da <strong>Mesa ${String(numero).padStart(2, '0')}</strong> foi confirmada.</p>
          <p>O QR Code de acesso foi enviado como anexo. Por favor, baixe o arquivo para apresentação na entrada do evento.</p>
          <p style="margin-top: 30px;">Atenciosamente,</p>
          <p><strong>AABB ARACAJU</strong></p>
        </div>
      `,
      // Adiciona o QR Code como um anexo de arquivo
      attachments: [{
        filename: `qrcode-mesa-${numero}.png`,
        content: qrCodeBuffer,
      }],
    });

    if (error) {
      console.error({ error });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Erro ao enviar e-mail.', details: error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'E-mail enviado com sucesso!', emailData: data })
    };

  } catch (error) {
    console.error('Erro fatal na função:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Falha interna do servidor.', details: error.message })
    };
  }
};