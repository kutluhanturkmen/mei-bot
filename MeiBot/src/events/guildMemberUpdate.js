'use strict';

const { Events } = require('discord.js');
const User   = require('../database/User');
const Guild  = require('../database/Guild');
const config = require('../../config.json');

// =============================================
// 🌟 EARLY SUPPORTER — GUILD MEMBER UPDATE EVENT
// Destek sunucusunda bir üyeye Early Supporter
// rolü verilince veya alınınca tetiklenir.
//
// Kullanıcı rolü alınca:
//   → User.isEarlySupporter = true
//   → User.badges'e 'early_supporter' eklenir
//   → User.earlySupporterSince = now
//
// Kullanıcı rolü kaybedince:
//   → User.isEarlySupporter = false
//   → (badge korunur — kazanılmış rozet kalmaya devam eder)
//
// Sunucu rolü (serverRoleId) verilince:
//   → Guild.isEarlySupporter = true
//   → Guild.economyMultiplier = 2
//   → Guild.earlySupporterSince = now
//
// Sunucu rolü alınınca:
//   → Guild.isEarlySupporter = false
//   → Guild.economyMultiplier = 1
// =============================================

const { supportServerId, userRoleId, serverRoleId } = config.earlySupporter;

module.exports = {
  name: Events.GuildMemberUpdate,
  once: false,

  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').GuildMember} oldMember
   * @param {import('discord.js').GuildMember} newMember
   */
  async execute(client, oldMember, newMember) {
    // Sadece destek sunucusundaki değişiklikleri izle
    if (newMember.guild.id !== supportServerId) return;

    const userId = newMember.user.id;

    // ── Kullanıcı Early Supporter rolü ─────────
    if (userRoleId) {
      const hadRole = oldMember.roles.cache.has(userRoleId);
      const hasRole = newMember.roles.cache.has(userRoleId);

      if (!hadRole && hasRole) {
        // Rol VERİLDİ
        await User.findOneAndUpdate(
          { userId },
          {
            $set:      { isEarlySupporter: true, earlySupporterSince: new Date() },
            $addToSet: { badges: 'early_supporter' },
          },
          { upsert: false } // Kayıtlı değilse işlem yapma
        ).catch((err) => console.error('[EarlySupporter] User grant error:', err.message));

        console.log(`[EarlySupporter] User role granted → ${newMember.user.tag}`);

      } else if (hadRole && !hasRole) {
        // Rol ALINDI
        await User.findOneAndUpdate(
          { userId },
          { $set: { isEarlySupporter: false } }
        ).catch((err) => console.error('[EarlySupporter] User revoke error:', err.message));

        console.log(`[EarlySupporter] User role revoked → ${newMember.user.tag}`);
      }
    }

    // ── Sunucu Early Supporter rolü ────────────
    // Sunucu sahibi destek sunucusuna katılıp rol alırsa,
    // o kişinin sahip olduğu tüm sunucular Early Supporter olur.
    // Not: Bu akış basit tutulmak için sunucu sahibinin userId'si
    // ile eşleştirme yapılır. Guild kayıtlarını güncellemek için
    // bot'un o sunucularda da bulunması gerekir.
    if (serverRoleId) {
      const hadServerRole = oldMember.roles.cache.has(serverRoleId);
      const hasServerRole = newMember.roles.cache.has(serverRoleId);

      if (!hadServerRole && hasServerRole) {
        // Sunucu rolü VERİLDİ — bu kullanıcının sahip olduğu
        // tüm guild kayıtlarını Early Supporter yap
        await Guild.updateMany(
          { guildId: { $in: getOwnerGuildIds(client, userId) } },
          {
            $set: {
              isEarlySupporter:          true,
              earlySupporterSince:       new Date(),
              earlySupporterActivatedBy: userId,
              economyMultiplier:         config.earlySupporter.economyBoostMultiplier,
            },
          }
        ).catch((err) => console.error('[EarlySupporter] Guild grant error:', err.message));

        console.log(`[EarlySupporter] Server role granted → ${newMember.user.tag}`);

      } else if (hadServerRole && !hasServerRole) {
        // Sunucu rolü ALINDI
        await Guild.updateMany(
          { guildId: { $in: getOwnerGuildIds(client, userId) } },
          {
            $set: {
              isEarlySupporter: false,
              economyMultiplier: 1,
            },
          }
        ).catch((err) => console.error('[EarlySupporter] Guild revoke error:', err.message));

        console.log(`[EarlySupporter] Server role revoked → ${newMember.user.tag}`);
      }
    }
  },
};

// ─────────────────────────────────────────────
// YARDIMCI — Client cache'inden kullanıcının
// sahip olduğu sunucu ID'lerini döndürür.
// ─────────────────────────────────────────────
function getOwnerGuildIds(client, ownerId) {
  return client.guilds.cache
    .filter(g => g.ownerId === ownerId)
    .map(g => g.id);
}
