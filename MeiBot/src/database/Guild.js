'use strict';

const mongoose = require('mongoose');
const config   = require('../../config.json');

// =============================================
// 🌸 MEI BOT — GUILD SCHEMA
// Sunucu bazlı ayarlar: early supporter, çekiliş
// limiti, özel catfight mesajları, button rolleri,
// invite logger kanalı vb.
// =============================================

const guildSchema = new mongoose.Schema(
  {
    // ── Kimlik ────────────────────────────────
    guildId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    guildName: {
      type:    String,
      default: 'Unknown Guild',
    },

    // ── Early Supporter ───────────────────────
    // Destek sunucusuna katılan sunucular Early Supporter
    // avantajlarından yararlanır: x2 economy, custom catfight,
    // sınırsız giveaway.
    isEarlySupporter: {
      type:    Boolean,
      default: false,
    },
    earlySupporterSince: {
      type:    Date,
      default: null,
    },
    // Early Supporter'ı etkinleştiren kullanıcının ID'si
    earlySupporterActivatedBy: {
      type:    String,
      default: null,
    },

    // ── Ekonomi Boost ─────────────────────────
    // Early Supporter sunucularda 2x, normal sunucularda 1x
    economyMultiplier: {
      type:    Number,
      default: 1,
      min:     1,
      max:     config.earlySupporter.economyBoostMultiplier,
    },

    // ── Çekiliş Limiti ────────────────────────
    activeGiveawayCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Özel Catfight Mesajları ───────────────
    // Early Supporter sunucular kendi elenme mesajlarını ekleyebilir
    customCatfightMessages: {
      type:    [String],
      default: [],
    },
    useCustomCatfightMessages: {
      type:    Boolean,
      default: false,
    },

    // ── Kanal Ayarları ────────────────────────
    channels: {
      joinLog:     { type: String, default: null },
      giveawayLog: { type: String, default: null },
      modLog:      { type: String, default: null },
      welcome:     { type: String, default: null },
    },

    // ── Hoş Geldin Mesajı ─────────────────────
    welcomeMessage: {
      enabled: { type: Boolean, default: false },
      template: {
        type:    String,
        default: 'Welcome to **{guild}**, {user}! 🌸 You are member #{memberCount}.',
      },
    },

    // ── Button Roller ─────────────────────────
    buttonRoleMenus: {
      type:    [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // ── Invite Tracker ────────────────────────
    inviteCache: {
      type:    Map,
      of:      mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Moderasyon Ayarları ───────────────────
    moderation: {
      antiSpam:   { type: Boolean, default: false },
      antiRaid:   { type: Boolean, default: false },
      muteRoleId: { type: String,  default: null  },
    },

    // ── Settings Flags ────────────────────────
    settings: {
      logsEnabled:       { type: Boolean, default: true  },
      gamesEnabled:      { type: Boolean, default: true  },
      economyEnabled:    { type: Boolean, default: true  },
      gameChannelId:     { type: String,  default: null  },
      wordGameChannelId: { type: String,  default: null  },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─────────────────────────────────────────────
// INSTANCE METOTLARI
// ─────────────────────────────────────────────

/**
 * Sunucunun Early Supporter olup olmadığını döndürür.
 * @returns {boolean}
 */
guildSchema.methods.isSupporter = function () {
  return this.isEarlySupporter === true;
};

/**
 * Aktif çekiliş sayısının limitini aşıp aşmadığını kontrol eder.
 * Early Supporter sunuculara sınırsız çekiliş hakkı.
 * @returns {boolean}
 */
guildSchema.methods.canCreateGiveaway = function () {
  if (this.isEarlySupporter) return true; // Early Supporter: sınırsız
  return this.activeGiveawayCount < config.earlySupporter.freeGiveawayLimit;
};

/**
 * Catfight elenme mesajlarını döndürür.
 * Early Supporter sunucularda özel mesajlar önceliklidir.
 * @returns {string[]}
 */
guildSchema.methods.getCatfightMessages = function () {
  if (
    this.isEarlySupporter &&
    this.useCustomCatfightMessages &&
    this.customCatfightMessages.length > 0
  ) {
    return this.customCatfightMessages;
  }
  return config.catfight.eliminationMessages;
};

// ─────────────────────────────────────────────
// STATİK METOTLAR
// ─────────────────────────────────────────────

/**
 * guildId'ye göre sunucu dökümanı getirir; yoksa oluşturur.
 * @param {string} guildId
 * @param {string} [guildName]
 * @returns {Promise<import('mongoose').Document>}
 */
guildSchema.statics.findOrCreate = async function (guildId, guildName) {
  let guild = await this.findOne({ guildId });
  if (!guild) {
    guild = await this.create({ guildId, guildName: guildName || 'Unknown Guild' });
  }
  return guild;
};

module.exports = mongoose.model('Guild', guildSchema);
