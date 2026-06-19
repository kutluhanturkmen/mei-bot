'use strict';

const path     = require('path');
const fs       = require('fs');
const logger   = require('../utils/logger');
const embedder = require('../utils/embedder');

// =============================================
// 🌸 MEI BOT — BUTTON INTERACTION HANDLER
// commands/ ve src/buttons/ içindeki tüm
// button handler dosyalarını tarar.
//
// Her button dosyası şu yapıyı export etmeli:
// {
//   customId: 'button_id',         // Tam eşleşme
//   // VEYA
//   customIdPrefix: 'catfight_',   // Prefix eşleşme (dinamik ID'ler için)
//   execute(interaction, client, idSuffix) { }
// }
// =============================================

/**
 * Özyinelemeli dizin tarayıcı — .js dosyalarını döndürür.
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

// ─────────────────────────────────────────────
// Yüklenen button handler'larını tutan Map:
// exactMap    → customId → handler
// prefixList  → [{ prefix, handler }]
// ─────────────────────────────────────────────
const exactMap   = new Map();
const prefixList = [];

/**
 * Tüm button handler dosyalarını yükler.
 * @param {import('discord.js').Client} client
 */
function loadButtons(client) {
  // Button handler dosyaları: src/buttons/ dizininde tutulacak
  const buttonsPath = path.join(__dirname, '../buttons');
  const files       = walkDir(buttonsPath);

  let loadedCount = 0;
  let errorCount  = 0;

  for (const file of files) {
    try {
      delete require.cache[require.resolve(file)];
      const handler = require(file);

      if (!handler?.execute) {
        logger.warn(`Skipped invalid button file: ${path.basename(file)}`);
        continue;
      }

      if (handler.customId) {
        exactMap.set(handler.customId, handler);
        loadedCount++;
        logger.info(`Loaded button [exact]: ${handler.customId}`);
      } else if (handler.customIdPrefix) {
        prefixList.push({ prefix: handler.customIdPrefix, handler });
        loadedCount++;
        logger.info(`Loaded button [prefix]: ${handler.customIdPrefix}*`);
      } else {
        logger.warn(`Button file missing customId or customIdPrefix: ${path.basename(file)}`);
      }
    } catch (err) {
      errorCount++;
      logger.error(`Failed to load button file: ${path.basename(file)}\n${err.message}`);
    }
  }

  logger.success(`Buttons loaded: ${loadedCount} success, ${errorCount} failed.`);

  // client'a referans ekle (gerektiğinde dışarıdan erişim için)
  client.buttonHandlers = { exactMap, prefixList };
}

/**
 * Gelen button interaction'ı işler.
 * interactionCreate event'inden çağrılır.
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {import('discord.js').Client} client
 */
async function handleButton(interaction, client) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isChannelSelectMenu()) return;

  const { customId } = interaction;

  // 1) Tam eşleşme dene
  let handler = exactMap.get(customId);

  // 2) Prefix eşleşme dene
  let idSuffix = '';
  if (!handler) {
    for (const { prefix, handler: h } of prefixList) {
      if (customId.startsWith(prefix)) {
        handler  = h;
        idSuffix = customId.slice(prefix.length);
        break;
      }
    }
  }

  if (!handler) {
    // Tanınmayan button — sessizce ephemeral hata döndür
    logger.warn(`Unknown button interaction: ${customId}`);
    return interaction.reply({
      embeds: [embedder.error('This button is no longer active.', 'Expired Interaction')],
      ephemeral: true,
    }).catch(() => {});
  }

  try {
    await handler.execute(interaction, client, idSuffix);
  } catch (err) {
    logger.error(`Button handler error [${customId}]: ${err.message}`);

    const payload = {
      embeds: [embedder.error('Something went wrong while processing this button.', 'Button Error')],
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

module.exports = { loadButtons, handleButton };
