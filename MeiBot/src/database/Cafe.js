'use strict';

const mongoose = require('mongoose');
const config   = require('../../config.json');

// =============================================
// 🌸 MEI BOT — CAT CAFÉ SCHEMA
// Kullanıcının sanal kedi kafesini tutar:
// kediler, dekorasyon, temizlik, pasif gelir.
// =============================================

// ─────────────────────────────────────────────
// Alt Şema: Kafe'deki bir kedi
// ─────────────────────────────────────────────
const catSchema = new mongoose.Schema(
  {
    catId:    { type: String, required: true },   // Benzersiz kedi ID (ör: "persian_01")
    name:     { type: String, required: true },   // Kedi türü adı (ör: "Persian")
    emoji:    { type: String, default: '🐱' },    // Temsil emojisi
    rarity:   {
      type:    String,
      enum:    ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    purchasedAt: { type: Date, default: Date.now },
    // Bu kedinin saatlik katkısı (pasif gelire eklenir)
    incomeBonus: { type: Number, default: 0 },
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// Alt Şema: Satın alınmış bir dekorasyon
// ─────────────────────────────────────────────
const decorationSchema = new mongoose.Schema(
  {
    decorId:     { type: String, required: true },
    name:        { type: String, required: true },
    emoji:       { type: String, default: '🪴' },
    // Dekorasyon temizlik bozulma hızını yavaşlatır (%)
    cleanlinessBonus: { type: Number, default: 0 },
    purchasedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// Alt Şema: Kahve aroması
// ─────────────────────────────────────────────
const aromaSchema = new mongoose.Schema(
  {
    aromaId:     { type: String, required: true },
    name:        { type: String, required: true },
    emoji:       { type: String, default: '☕' },
    // Aroma müşteri memnuniyetini artırır → daha fazla gelir
    revenueBonus: { type: Number, default: 0 },
    purchasedAt:  { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// Ana Kafe Şeması
// ─────────────────────────────────────────────
const cafeSchema = new mongoose.Schema(
  {
    // ── Sahiplik ──────────────────────────────
    userId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },

    // ── Kafe Temel Bilgileri ──────────────────
    cafeName: {
      type:      String,
      default:   'Cozy Cat Café',
      maxlength: 32,
    },
    isOpen: {
      type:    Boolean,
      default: false,  // /cafe open komutuyla açılır
    },
    level: {
      type:    Number,
      default: 1,
      min:     1,
      max:     5,
    },

    // ── Temizlik Sistemi ──────────────────────
    // 0–100 arası. Düşerse pasif gelir azalır.
    cleanliness: {
      type:    Number,
      default: 100,
      min:     0,
      max:     100,
    },
    lastCleanlinessDecay: {
      type:    Date,
      default: Date.now,
    },

    // ── Pasif Gelir ───────────────────────────
    lastPassiveCollection: {
      type:    Date,
      default: null,
    },
    // Birikmiş ve henüz toplanmamış pasif gelir
    pendingIncome: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Kediler ───────────────────────────────
    cats: {
      type:    [catSchema],
      default: [],
    },

    // ── Dekorasyonlar ─────────────────────────
    decorations: {
      type:    [decorationSchema],
      default: [],
    },

    // ── Kahve Aromaları ───────────────────────
    aromas: {
      type:    [aromaSchema],
      default: [],
    },

    // ── Kedi Maması ───────────────────────────
    // Stok tükenirse kediler verim düşürür
    foodStock: {
      type:    Number,
      default: 100,
      min:     0,
    },
    lastFoodRefill: {
      type:    Date,
      default: null,
    },

    // ── İstatistikler ─────────────────────────
    stats: {
      totalEarned:    { type: Number, default: 0 },
      totalCleaned:   { type: Number, default: 0 },
      totalCatsBought:{ type: Number, default: 0 },
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
 * Mevcut kafe tier bilgisini config'den döndürür.
 * @returns {{ level, name, passiveIncome, maxCats }}
 */
cafeSchema.methods.getTier = function () {
  return config.cafe.tiers.find(t => t.level === this.level)
    || config.cafe.tiers[0];
};

/**
 * Kafeye eklenebilecek maksimum kedi sayısını döndürür.
 * @returns {number}
 */
cafeSchema.methods.getMaxCats = function () {
  return this.getTier().maxCats;
};

/**
 * Saatlik pasif geliri hesaplar.
 * Temizlik ve kedi bonusları dikkate alınır.
 * @param {boolean} [isPremiumGuild=false] - Sunucu premiumsa 2x
 * @returns {number}
 */
cafeSchema.methods.calculateHourlyIncome = function (isPremiumGuild = false) {
  const tier          = this.getTier();
  const cleanFactor   = this.cleanliness / 100;           // 0.0 – 1.0
  const foodFactor    = this.foodStock > 0 ? 1 : 0.5;    // Mama bitmişse yarı gelir
  const catBonus      = this.cats.reduce((sum, c) => sum + c.incomeBonus, 0);
  const aromaBonus    = this.aromas.reduce((sum, a) => sum + a.revenueBonus, 0);
  const guildMult     = isPremiumGuild ? config.premium.economyBoostMultiplier : 1;

  const base  = tier.passiveIncome + catBonus + aromaBonus;
  const total = Math.floor(base * cleanFactor * foodFactor * guildMult);
  return Math.max(0, total);
};

/**
 * Temizlik bozulmasını uygular (saatlik decay).
 * Dekorasyonların temizlik bonusu düşüş hızını azaltır.
 */
cafeSchema.methods.applyCleanlinessDecay = function () {
  const now          = Date.now();
  const last         = this.lastCleanlinessDecay
    ? new Date(this.lastCleanlinessDecay).getTime()
    : now;
  const hoursElapsed = (now - last) / config.cafe.cleanlinessDecayInterval;

  if (hoursElapsed < 1) return;

  const decayBonus   = this.decorations.reduce((s, d) => s + d.cleanlinessBonus, 0);
  const decayRate    = Math.max(1, config.cafe.cleanlinessDecayRate - decayBonus);
  const totalDecay   = Math.floor(hoursElapsed * decayRate);

  this.cleanliness            = Math.max(0, this.cleanliness - totalDecay);
  this.lastCleanlinessDecay   = new Date();
};

/**
 * Birikmiş pasif geliri hesaplayıp pendingIncome'a ekler.
 * @param {boolean} [isPremiumGuild=false]
 */
cafeSchema.methods.accumulateIncome = function (isPremiumGuild = false) {
  if (!this.isOpen || !this.lastPassiveCollection) return;

  const now          = Date.now();
  const last         = new Date(this.lastPassiveCollection).getTime();
  const hoursElapsed = (now - last) / config.economy.passiveIncomeInterval;

  if (hoursElapsed < 1) return;

  const hourlyIncome  = this.calculateHourlyIncome(isPremiumGuild);
  const earned        = Math.floor(hoursElapsed * hourlyIncome);

  this.pendingIncome         += earned;
  this.stats.totalEarned     += earned;
  this.lastPassiveCollection  = new Date();
};

// ─────────────────────────────────────────────
// STATİK METOTLAR
// ─────────────────────────────────────────────

/**
 * userId'ye göre kafe belgesi getirir; yoksa oluşturur.
 * @param {string} userId
 * @returns {Promise<import('mongoose').Document>}
 */
cafeSchema.statics.findOrCreate = async function (userId) {
  let cafe = await this.findOne({ userId });
  if (!cafe) {
    cafe = await this.create({ userId });
  }
  return cafe;
};

module.exports = mongoose.model('Cafe', cafeSchema);
