'use strict';

const mongoose = require('mongoose');
const config   = require('../../config.json');

// =============================================
// 🌸 MEI BOT — USER SCHEMA
// Kullanıcının ekonomi, early supporter, rozet
// ve oyun istatistiklerini tutar.
// =============================================

const userSchema = new mongoose.Schema(
  {
    // ── Kimlik ────────────────────────────────
    userId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    username: {
      type:    String,
      default: 'Unknown User',
    },

    // ── Ekonomi ───────────────────────────────
    balance: {
      type:    Number,
      default: config.economy.startingBalance,
      min:     0,
    },
    totalEarned: {
      type:    Number,
      default: 0,
    },
    totalSpent: {
      type:    Number,
      default: 0,
    },

    // ── Cooldown Zaman Damgaları ───────────────
    lastDaily: {
      type:    Date,
      default: null,
    },
    lastWork: {
      type:    Date,
      default: null,
    },
    lastTrivia: {
      type:    Date,
      default: null,
    },

    // ── Early Supporter ───────────────────────
    // Destek sunucusunda Early Supporter rolü
    // alınınca guildMemberUpdate event'i tarafından set edilir.
    isEarlySupporter: {
      type:    Boolean,
      default: false,
    },
    earlySupporterSince: {
      type:    Date,
      default: null,
    },

    // ── Rozetler ──────────────────────────────
    badges: {
      type:    [String],
      default: [],
    },
    activeBadge: {
      type:    String,
      default: null,
    },
    // Profilde öncelikli gösterilecek rozetler (en fazla 3)
    pinnedBadges: {
      type:    [String],
      default: [],
    },

    // ── Profil Özelleştirme ───────────────────
    profileBackground: {
      type:    String,
      default: 'default',
    },
    ownedBackgrounds: {
      type:    [String],
      default: ['default'],
    },

    // ── Catfight İstatistikleri ────────────────
    catfightStats: {
      wins:         { type: Number, default: 0 },
      losses:       { type: Number, default: 0 },
      totalGames:   { type: Number, default: 0 },
      killCount:    { type: Number, default: 0 },
    },

    // ── Trivia İstatistikleri ─────────────────
    triviaStats: {
      correct:    { type: Number, default: 0 },
      incorrect:  { type: Number, default: 0 },
      streak:     { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
    },

    // ── Kayıt Durumu ──────────────────────────
    isRegistered: {
      type:    Boolean,
      default: false,
    },
    registeredAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps:  true,
    versionKey:  false,
  }
);

// ─────────────────────────────────────────────
// INSTANCE METOTLARI
// ─────────────────────────────────────────────

/**
 * Kullanıcının Early Supporter olup olmadığını döndürür.
 * @returns {boolean}
 */
userSchema.methods.isSupporter = function () {
  return this.isEarlySupporter === true;
};

/**
 * Bakiyeye para ekler ve totalEarned'ı günceller.
 * @param {number} amount
 */
userSchema.methods.addBalance = function (amount) {
  this.balance     += amount;
  this.totalEarned += amount;
};

/**
 * Bakiyeden para çıkarır. Yetersiz bakiyede false döner.
 * @param {number} amount
 * @returns {boolean}
 */
userSchema.methods.removeBalance = function (amount) {
  if (this.balance < amount) return false;
  this.balance    -= amount;
  this.totalSpent += amount;
  return true;
};

/**
 * Cooldown süresini kontrol eder.
 * Early Supporter kullanıcılar için cooldown azaltma uygulanır.
 * @param {'lastDaily'|'lastWork'|'lastTrivia'} field
 * @param {number} cooldownMs
 * @returns {{ onCooldown: boolean, remaining: number }}
 */
userSchema.methods.getCooldown = function (field, cooldownMs) {
  const last = this[field];
  if (!last) return { onCooldown: false, remaining: 0 };

  // Early Supporter: %50 cooldown azaltma
  const effectiveCooldown = this.isEarlySupporter
    ? Math.floor(cooldownMs * (1 - config.earlySupporter.cooldownReduction))
    : cooldownMs;

  const elapsed   = Date.now() - new Date(last).getTime();
  const remaining = effectiveCooldown - elapsed;
  return {
    onCooldown: remaining > 0,
    remaining:  Math.max(0, remaining),
  };
};

// ─────────────────────────────────────────────
// STATİK METOTLAR
// ─────────────────────────────────────────────

/**
 * userId'ye göre kullanıcı getirir; yoksa oluşturur.
 * @param {string} userId
 * @param {string} [username]
 * @returns {Promise<import('mongoose').Document>}
 */
userSchema.statics.findOrCreate = async function (userId, username) {
  let user = await this.findOne({ userId });
  if (!user) {
    user = await this.create({ userId, username: username || 'Unknown User' });
  }
  return user;
};

module.exports = mongoose.model('User', userSchema);
