'use strict';

const chalk = require('chalk');

// =============================================
// 🌸 MEI BOT — ADVANCED CONSOLE LOGGER
// Chalk v4.1.2 tabanlı, zaman damgalı renkli logger
// =============================================

/**
 * Şu anki zamanı [HH:MM:SS] formatında döndürür.
 * @returns {string}
 */
function getTimestamp() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `[${h}:${m}:${s}]`;
}

/**
 * Log seviyelerine göre renk ve etiket tanımları.
 */
const LEVELS = {
  INFO:    { color: chalk.cyan,    label: 'INFO'    },
  SUCCESS: { color: chalk.green,   label: 'SUCCESS' },
  WARN:    { color: chalk.yellow,  label: 'WARN'    },
  ERROR:   { color: chalk.red,     label: 'ERROR'   },
  DEBUG:   { color: chalk.magenta, label: 'DEBUG'   },
  DB:      { color: chalk.blue,    label: 'DB'      },
  EVENT:   { color: chalk.white,   label: 'EVENT'   },
  CMD:     { color: chalk.hex('#FFB7C5'), label: 'CMD' },
};

/**
 * Merkezi log yazıcı.
 * @param {'INFO'|'SUCCESS'|'WARN'|'ERROR'|'DEBUG'|'DB'|'EVENT'|'CMD'} level
 * @param {string} message
 */
function log(level, message) {
  const lvl = LEVELS[level] || LEVELS.INFO;
  const timestamp = chalk.gray(getTimestamp());
  const tag = lvl.color(`[MEI/${lvl.label}]`);
  console.log(`${timestamp} ${tag}: ${message}`);
}

// =============================================
// Kısayol metotları — logger.info(), logger.error() vb.
// =============================================

const logger = {
  /**
   * Genel bilgi mesajı.
   * @param {string} message
   */
  info: (message) => log('INFO', message),

  /**
   * Başarı mesajı (bağlantılar, yüklemeler).
   * @param {string} message
   */
  success: (message) => log('SUCCESS', message),

  /**
   * Uyarı mesajı.
   * @param {string} message
   */
  warn: (message) => log('WARN', message),

  /**
   * Hata mesajı.
   * @param {string|Error} message
   */
  error: (message) => {
    const text = message instanceof Error
      ? `${message.message}\n${message.stack}`
      : message;
    log('ERROR', text);
  },

  /**
   * Debug mesajı (geliştirme aşaması).
   * @param {string} message
   */
  debug: (message) => log('DEBUG', message),

  /**
   * Veritabanı işlem mesajı.
   * @param {string} message
   */
  db: (message) => log('DB', message),

  /**
   * Discord event mesajı.
   * @param {string} message
   */
  event: (message) => log('EVENT', message),

  /**
   * Slash command kullanım mesajı.
   * @param {string} commandName
   * @param {string} username
   * @param {string} guildName
   */
  cmd: (commandName, username, guildName) =>
    log('CMD', `/${commandName} — ${username} @ ${guildName}`),

  /**
   * Başlangıç banner'ı — bot hazır olduğunda yazdırılır.
   * @param {string} botTag  - Bot#0000 formatı
   * @param {number} guilds  - Sunucu sayısı
   */
  ready: (botTag, guilds) => {
    const border = chalk.hex('#FFB7C5')('━'.repeat(50));
    console.log('\n' + border);
    console.log(chalk.hex('#FFB7C5').bold('   🌸  MEI BOT — ONLINE  🌸'));
    console.log(chalk.white(`   Tag    : ${chalk.cyan(botTag)}`));
    console.log(chalk.white(`   Guilds : ${chalk.cyan(guilds)}`));
    console.log(chalk.white(`   Time   : ${chalk.cyan(new Date().toISOString())}`));
    console.log(border + '\n');
  },
};

module.exports = logger;
