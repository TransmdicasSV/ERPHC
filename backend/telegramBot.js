import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

export function startTelegramBot(pool) {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token || token === 'TOKEN_AQUI') {
    console.warn('⚠️ TELEGRAM_TOKEN no configurado en .env. Bot de alertas desactivado.');
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const v = await pool.query('SELECT COUNT(*) FROM vehiculos');
      const i = await pool.query('SELECT COUNT(*) FROM inspecciones_flota');
      bot.sendMessage(chatId, `🟢 NEXUS C.O.R.E. Operativo\n\n🚛 Total Vehículos: ${v.rows[0].count}\n📋 Inspecciones: ${i.rows[0].count}`);
    } catch (e) {
      bot.sendMessage(chatId, '🔴 Error de conexión con la Base de Datos.');
    }
  });

  bot.onText(/\/suscribir/, (msg) => {
    const chatId = msg.chat.id;
    global.nexusTelegramChatId = chatId;
    bot.sendMessage(chatId, '✅ Este chat ahora es la Central de Mando Móvil. Recibirás alertas críticas del Radar.');
  });

  bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
      bot.sendMessage(msg.chat.id, 'Comandos disponibles:\n/status - Estado del sistema\n/suscribir - Recibir alertas de radar');
    }
  });

  console.log('🤖 Bot Táctico de Telegram en línea.');
  global.nexusBot = bot;
}

export function sendTelegramAlert(message) {
  if (global.nexusBot && global.nexusTelegramChatId) {
    global.nexusBot.sendMessage(global.nexusTelegramChatId, `🚨 ALERTA NEXUS:\n${message}`);
  }
}
