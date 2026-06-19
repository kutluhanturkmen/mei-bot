'use strict';

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const User     = require('../../src/database/User');
const Cafe     = require('../../src/database/Cafe');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');
const { buildProfileCard } = require('../../src/canvas/profileCard');

// =============================================
// 💰 MODÜL 2 — /profile
// Kullanıcının Lotus Pembesi temalı profil kartını gösterir.
// Bakiye, rozetler, premium durumu, kafe özeti,
// catfight ve trivia istatistikleri yer alır.
// =============================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription("🌸 View your or another user's Mei profile")
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('The user to view (leave empty for yourself)')
        .setRequired(false)
    ),

  cooldown: config.cooldowns.profile,

  async execute(interaction, client) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') ?? interaction.user;
    const isSelf = target.id === interaction.user.id;

    // Kullanıcı kayıtlı mı?
    const user = await User.findOne({ userId: target.id });

    if (!user?.isRegistered) {
      const msg = isSelf
        ? `You haven't registered yet! Use </register:0> to create your account. 🌸`
        : `**${target.displayName}** hasn't registered yet.`;
      return interaction.editReply({
        embeds: [embedder.warn(msg, 'Not Registered')],
      });
    }

    // Kafe verisini getir
    const cafe = await Cafe.findOne({ userId: target.id });

    // Premium kontrolü
    const isPremium = user.checkPremium();

    const { colors } = config;
    const cfStats    = user.catfightStats;
    const tvStats    = user.triviaStats;
    const cafeTier   = config.cafe.tiers.find(t => t.level === (cafe?.level || 1)) || config.cafe.tiers[0];

    // ── Canvas Kart Üretimi ────────────────────
    let imageAttachment = null;
    try {
      const buffer = await buildProfileCard({
        avatarURL:     target.displayAvatarURL({ extension: 'png', size: 256 }),
        username:      target.displayName,
        balance:       user.balance,
        cafeLevel:     cafe?.level || 1,
        cafeName:      cafeTier.name,
        isPremium,
        badges:        user.badges || [],
        spouseAvatarURL: null, // evlilik sistemi ileride eklenebilir
        spouseName:      null,
        catfightWins:  cfStats.wins,
        triviaCorrect: tvStats.correct,
        backgroundURL: null, // shop'tan alınan arka plan ileride
      });
      imageAttachment = new AttachmentBuilder(buffer, { name: 'profile.png' });
    } catch (err) {
      // Canvas üretilemezse embed fallback'e düşer
    }

    // ── Embed (canvas'ın altına özet bilgi) ───
    const embed = new EmbedBuilder()
      .setColor(isPremium ? colors.premium : colors.primary)
      .setAuthor({
        name:    `${isPremium ? '💎 ' : ''}${target.displayName}'s Profile`,
        iconURL: target.displayAvatarURL({ dynamic: true }),
      })
      .addFields(
        {
          name:   '⚔️ Catfight',
          value:  `W: **${cfStats.wins}** | L: **${cfStats.losses}** | Kills: **${cfStats.killCount}**`,
          inline: true,
        },
        {
          name:   '✨ Trivia',
          value:  `✅ **${tvStats.correct}** | ❌ **${tvStats.incorrect}** | 🔥 **${tvStats.bestStreak}**`,
          inline: true,
        }
      )
      .setFooter({
        text: `Registered ${new Date(user.registeredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}${isPremium ? ' • Mei\'s Club Member' : ''}`,
      })
      .setTimestamp();

    if (imageAttachment) {
      embed.setImage('attachment://profile.png');
    }

    return interaction.editReply({
      embeds:  [embed],
      files:   imageAttachment ? [imageAttachment] : [],
    });
  },
};

// ─────────────────────────────────────────────
// YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────

/**
 * Rozet dizisinden görüntülenebilir string oluşturur.
 * @param {object} user
 * @param {boolean} isPremium
 * @param {object} ui
 * @returns {string}
 */
function buildBadges(user, isPremium, ui) {
  const badges = [...user.badges];

  // Premium rozeti otomatik ekle
  if (isPremium && !badges.includes('meis_club')) {
    badges.unshift('meis_club');
  }

  if (!badges.length) return '';

  // Bilinen rozetlerin emoji karşılıkları
  const BADGE_MAP = {
    meis_club:   `${ui.premium} **Mei's Club**`,
    early_bird:  `🐦 **Early Bird**`,
    catfight_champion: `${ui.sword} **Catfight Champion**`,
    trivia_master: `${ui.sparkle} **Trivia Master**`,
    cafe_legend:   `${ui.cafe} **Café Legend**`,
  };

  return badges
    .map(b => BADGE_MAP[b] || `🏷️ ${b}`)
    .join('  ');
}

/**
 * Kafe özetini string olarak oluşturur.
 * @param {object|null} cafe
 * @param {object} ui
 * @returns {string}
 */
function buildCafeInfo(cafe, ui) {
  if (!cafe) return '*No café data found.*';

  const tier      = config.cafe.tiers.find(t => t.level === cafe.level) || config.cafe.tiers[0];
  const statusStr = cafe.isOpen ? '🟢 Open' : '🔴 Closed';
  const cleanBar  = buildBar(cafe.cleanliness, 100, 10);

  return [
    `**${cafe.cafeName}** — *${tier.name}* (Level ${cafe.level})`,
    `Status: ${statusStr} | Cats: **${cafe.cats.length}/${tier.maxCats}**`,
    `Cleanliness: ${cleanBar} **${cafe.cleanliness}%**`,
    `Pending Income: ${ui.coin} **${cafe.pendingIncome.toLocaleString()}**`,
  ].join('\n');
}

/**
 * İlerleme çubuğu oluşturur.
 * @param {number} value
 * @param {number} max
 * @param {number} length
 * @returns {string}
 */
function buildBar(value, max, length) {
  const filled = Math.round((value / max) * length);
  const empty  = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}
