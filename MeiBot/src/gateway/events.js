'use strict';

const path   = require('path');
const fs     = require('fs');
const logger = require('../utils/logger');

// =============================================
// 🌸 MEI BOT — EVENT HANDLER
// src/events/ klasöründeki tüm event dosyalarını
// otomatik olarak client'a bağlar.
//
// Her event dosyası şu yapıyı export etmeli:
// {
//   name: 'eventName',      // discord.js Events enum değeri
//   once: false,            // true ise client.once, false ise client.on
//   execute(...args) { }    // handler fonksiyonu
// }
// =============================================

/**
 * Tüm event dosyalarını yükler ve client'a bağlar.
 * @param {import('discord.js').Client} client
 */
function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');

  if (!fs.existsSync(eventsPath)) {
    logger.warn(`Events directory not found: ${eventsPath}`);
    return;
  }

  const files = fs
    .readdirSync(eventsPath)
    .filter(f => f.endsWith('.js'));

  let loadedCount = 0;
  let errorCount  = 0;

  for (const file of files) {
    const filePath = path.join(eventsPath, file);

    try {
      delete require.cache[require.resolve(filePath)];
      const event = require(filePath);

      if (!event?.name || !event?.execute) {
        logger.warn(`Skipped invalid event file: ${file}`);
        continue;
      }

      // client nesnesini her event'e geç
      const wrappedExecute = (...args) => event.execute(client, ...args);

      if (event.once) {
        client.once(event.name, wrappedExecute);
      } else {
        client.on(event.name, wrappedExecute);
      }

      loadedCount++;
      logger.info(`Loaded event: ${event.name}${event.once ? ' (once)' : ''}`);
    } catch (err) {
      errorCount++;
      logger.error(`Failed to load event file: ${file}\n${err.message}`);
    }
  }

  logger.success(`Events loaded: ${loadedCount} success, ${errorCount} failed.`);
}

module.exports = { loadEvents };
