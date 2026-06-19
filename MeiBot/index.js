'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');

const logger              = require('./src/utils/logger');
const embedder            = require('./src/utils/embedder');
const { loadCommands }    = require('./src/gateway/commands');
const { loadEvents }      = require('./src/gateway/events');
const { loadButtons }     = require('./src/gateway/buttons');

// =============================================
// 🌸 MEI BOT — MAIN ENTRY POINT (index.js)
// =============================================

// ── Gerekli environment değişkeni kontrolü ──
const REQUIRED_ENV = ['DISCORD_TOKEN', 'CLIENT_ID', 'MONGO_URI'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────
// Discord Client — Gerekli Intent'ler
// ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

// ── Global yardımcıları client'a bağla ────────
// Komutlardan client.embeds.success(...) ile erişilebilir
client.embeds   = embedder;
client.commands = new Collection();
client.cooldowns = new Collection();

// ─────────────────────────────────────────────
// MongoDB Bağlantısı
// ─────────────────────────────────────────────
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.success('Connected to MongoDB!');
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

// Mongoose bağlantı event'leri
mongoose.connection.on('disconnected', () =>
  logger.warn('MongoDB disconnected. Attempting to reconnect...')
);
mongoose.connection.on('reconnected', () =>
  logger.success('MongoDB reconnected!')
);

// ─────────────────────────────────────────────
// Bot Başlatma Sırası
// ─────────────────────────────────────────────
async function bootstrap() {
  logger.info('Starting Mei Bot...');

  // 1) Veritabanına bağlan
  await connectDatabase();

  // 2) Event handler'ları yükle (ready eventi dahil)
  loadEvents(client);

  // 3) Button handler'ları yükle
  loadButtons(client);

  // 4) Discord'a giriş yap
  await client.login(process.env.DISCORD_TOKEN);

  // 5) Komutlar client.isReady() sonrası yüklenir (ready event içinde)
  //    loadCommands(client) — src/events/ready.js içinden çağrılır
}

// ─────────────────────────────────────────────
// Yakalanmamış Hata Yönetimi
// ─────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Promise Rejection: ${reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}\n${err.stack}`);
  // Kritik hata: güvenli kapatma
  process.exit(1);
});

process.on('SIGINT', async () => {
  logger.warn('SIGINT received. Shutting down gracefully...');
  client.destroy();
  await mongoose.connection.close();
  logger.info('Goodbye! 🌸');
  process.exit(0);
});

// ── Başlat ───────────────────────────────────
bootstrap().catch((err) => {
  logger.error(`Bootstrap failed: ${err.message}`);
  process.exit(1);
});
