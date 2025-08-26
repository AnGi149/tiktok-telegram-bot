const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN || '7871299218:AAHJArDwt1615D2PeeqtYBQCBgHRRvEEtcg';

const bot = new TelegramBot(token, { polling: true });

bot.onText(/https?:\/\/(www\.)?tiktok\.com\/.+/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[0];

  await bot.sendMessage(chatId, '📹 Підтверди, що це твоє відео:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Це моє відео', callback_data: `confirm_${url}` }],
        [{ text: '❌ Скасувати', callback_data: 'cancel' }]
      ]
    }
  });
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  try { await bot.answerCallbackQuery(query.id); } catch {}

  if (data.startsWith('confirm_')) {
    const url = data.replace('confirm_', '');
    await bot.sendMessage(chatId, '⏳ Завантаження відео...');

    try {
      const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
      const response = await axios.get(apiUrl);
      const videoUrl = response.data?.data?.play;

      if (!videoUrl) throw new Error('Відео не знайдено.');

      const fileName = `video_${Date.now()}.mp4`;
      const filePath = path.join(__dirname, fileName);

      const videoStream = await axios({ url: videoUrl, method: 'GET', responseType: 'stream' });
      const writer = fs.createWriteStream(filePath);
      videoStream.data.pipe(writer);

      writer.on('finish', async () => {
        await bot.sendVideo(chatId, filePath, { filename: 'video.mp4', contentType: 'video/mp4' });
        fs.unlinkSync(filePath);
      });

      writer.on('error', () => {
        bot.sendMessage(chatId, '❌ Помилка при завантаженні відео.');
      });

    } catch {
      bot.sendMessage(chatId, '🚫 Не вдалося обробити відео.');
    }

  } else if (data === 'cancel') {
    await bot.sendMessage(chatId, '❌ Скасовано.');
  }
});
