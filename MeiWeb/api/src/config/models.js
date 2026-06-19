'use strict';

// =============================================
// SHARED MONGOOSE MODELS — API kendi instance'ı
// Bot'un node_modules/mongoose ile API'nin
// node_modules/mongoose FARKLI instance'lar.
// Bu dosya API'nin mongoose'unu kullanarak
// aynı collection'lara erişen modelleri tanımlar.
// Collection adları Bot ile birebir aynı olmalı:
//   users, guilds, cafes
// =============================================

const mongoose = require('mongoose'); // API'nin mongoose'u

// ── User ──────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    userId:       { type: String, required: true, unique: true, index: true },
    username:     { type: String, default: 'Unknown User' },
    balance:      { type: Number, default: 0 },
    totalEarned:  { type: Number, default: 0 },
    totalSpent:   { type: Number, default: 0 },
    isEarlySupporter:    { type: Boolean, default: false },
    earlySupporterSince: { type: Date,    default: null  },
    badges:           { type: [String], default: [] },
    activeBadge:      { type: String,  default: null },
    pinnedBadges:     { type: [String], default: [] },
    profileBackground:  { type: String, default: 'default' },
    ownedBackgrounds:   { type: [String], default: ['default'] },
    catfightStats: {
      wins:       { type: Number, default: 0 },
      losses:     { type: Number, default: 0 },
      totalGames: { type: Number, default: 0 },
      killCount:  { type: Number, default: 0 },
    },
    triviaStats: {
      correct:    { type: Number, default: 0 },
      incorrect:  { type: Number, default: 0 },
      streak:     { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
    },
    isRegistered:  { type: Boolean, default: false },
    registeredAt:  { type: Date, default: null },
    lastDaily:     { type: Date, default: null },
    lastWork:      { type: Date, default: null },
    lastTrivia:    { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

// ── Guild ─────────────────────────────────────────────────────────
const guildSchema = new mongoose.Schema(
  {
    guildId:   { type: String, required: true, unique: true, index: true },
    guildName: { type: String, default: 'Unknown Guild' },
    isEarlySupporter:          { type: Boolean, default: false },
    earlySupporterSince:       { type: Date,    default: null  },
    earlySupporterActivatedBy: { type: String,  default: null  },
    economyMultiplier:         { type: Number,  default: 1     },
    activeGiveawayCount:  { type: Number, default: 0 },
    customCatfightMessages:     { type: [String],  default: [] },
    useCustomCatfightMessages:  { type: Boolean,   default: false },
    channels: {
      joinLog:     { type: String, default: null },
      giveawayLog: { type: String, default: null },
      modLog:      { type: String, default: null },
      welcome:     { type: String, default: null },
    },
    welcomeMessage: {
      enabled:  { type: Boolean, default: false },
      template: { type: String,  default: 'Welcome to **{guild}**, {user}! 🌸 You are member #{memberCount}.' },
    },
    buttonRoleMenus: { type: [mongoose.Schema.Types.Mixed], default: [] },
    inviteCache:     { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    moderation: {
      antiSpam:   { type: Boolean, default: false },
      antiRaid:   { type: Boolean, default: false },
      muteRoleId: { type: String,  default: null  },
    },
    settings: {
      logsEnabled:       { type: Boolean, default: true  },
      gamesEnabled:      { type: Boolean, default: true  },
      economyEnabled:    { type: Boolean, default: true  },
      gameChannelId:     { type: String,  default: null  },
      wordGameChannelId: { type: String,  default: null  },
    },
  },
  { timestamps: true, versionKey: false }
);

// ── Cafe ──────────────────────────────────────────────────────────
const cafeSchema = new mongoose.Schema(
  {
    userId:   { type: String, required: true, unique: true, index: true },
    cafeName: { type: String, default: 'My Café' },
    level:    { type: Number, default: 1 },
    stats: {
      totalEarned: { type: Number, default: 0 },
      totalCleans: { type: Number, default: 0 },
    },
  },
  { timestamps: true, versionKey: false }
);

// ── Model registration (mongoose.model caches by name) ────────────
// "User" → collection "users", "Guild" → "guilds", "Cafe" → "cafes"
const User  = mongoose.models.User  || mongoose.model('User',  userSchema);
const Guild = mongoose.models.Guild || mongoose.model('Guild', guildSchema);
const Cafe  = mongoose.models.Cafe  || mongoose.model('Cafe',  cafeSchema);

module.exports = { User, Guild, Cafe };
