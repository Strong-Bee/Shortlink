const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramPhoto(formData: FormData) {
  // Masukkan Chat ID ke dalam FormData
  formData.append('chat_id', CHAT_ID!);
  formData.append('parse_mode', 'HTML');

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}