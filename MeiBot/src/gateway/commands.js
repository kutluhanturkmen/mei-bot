'use strict';

const { REST, Routes, Collection } = require('discord.js');
const path = require('path');
const fs   = require('fs');
const logger = require('../utils/logger');

// =============================================
// 🌸 MEI BOT — COMMAND HANDLER
// commands/ klasörünü tarar, tüm slash komutlarını
// client.commands Collection'ına yükler ve
// Discord API'ye kayıt eder.
// =============================================

/**
 * Bir dizini özyinelemeli olarak tarayıp .js dosyalarını döndürür.
 * @param {string} dir
 * @returns {string[]}
 */
function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Tüm komutları yükler ve Discord'a kayıt eder.
 * @param {import('discord.js').Client} client
 */
async function loadCommands(client) {
  // client.commands Collection'ı yoksa oluştur
  if (!client.commands) client.commands = new Collection();
  // cooldown takibi için
  if (!client.cooldowns) client.cooldowns = new Collection();

  const commandsPath = path.join(__dirname, '../../commands');
  const files        = walkDir(commandsPath);

  const commandData  = []; // Discord API'ye gönderilecek JSON listesi
  let   loadedCount  = 0;
  let   errorCount   = 0;

  for (const file of files) {
    try {
      // require cache'ini temizle (hot-reload için)
      delete require.cache[require.resolve(file)];
      const command = require(file);

      // Geçerli komut kontrolü: data (SlashCommandBuilder) ve execute gerekli
      if (!command?.data || !command?.execute) {
        logger.warn(`Skipped invalid command file: ${path.relative(process.cwd(), file)}`);
        continue;
      }

      client.commands.set(command.data.name, command);
      commandData.push(command.data.toJSON());
      loadedCount++;
      logger.info(`Loaded command: /${command.data.name}`);
    } catch (err) {
      errorCount++;
      logger.error(`Failed to load command file: ${file}\n${err.message}`);
    }
  }

  logger.success(`Commands loaded: ${loadedCount} success, ${errorCount} failed.`);

  // Discord API'ye komutları kaydet
  await registerToDiscord(commandData);
}

/**
 * Komutları Discord REST API'ye kayıt eder.
 * GUILD_ID varsa sadece o sunucuya (hızlı güncelleme),
 * yoksa global olarak kayıt edilir (1 saate kadar sürebilir).
 * @param {Object[]} commandData
 */
async function registerToDiscord(commandData) {
  if (!commandData.length) {
    logger.warn('No commands to register to Discord.');
    return;
  }

  const rest     = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const clientId = process.env.CLIENT_ID;
  const guildId  = process.env.GUILD_ID;

  try {
    logger.info(`Registering ${commandData.length} slash command(s) to Discord...`);

    if (guildId) {
      // Geliştirme modu: tek sunucuya anında kayıt
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandData }
      );
      logger.success(`Registered ${commandData.length} command(s) to guild [${guildId}] (dev mode).`);
    } else {
      // Prodüksiyon: global kayıt
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commandData }
      );
      logger.success(`Registered ${commandData.length} command(s) globally.`);
    }
  } catch (err) {
    logger.error(`Failed to register commands to Discord: ${err.message}`);
  }
}

module.exports = { loadCommands };
