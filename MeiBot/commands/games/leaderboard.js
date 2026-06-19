'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User     = require('../../src/database/User');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// ⚔️ MODÜL 3 — /leaderboard
// Sunucu içi ve global Catfight liderlik tablosu.
// Subcommands: catfight | coins
// =============================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 View the top players!')
    .addSubcommand(s =>
      s.setName('catfight')
        .setDescription('Top Catfight Games winners')
        .addStringOption(o =>
          o.setName('scope')
            .setDescription('Global or server leaderboard?')
            .addChoices(
              { name: '🌍 Global', value: 'global' },
              { name: '🏠 Server', value: 'server' },
            )
        )
    )
    .addSubcommand(s =>
      s.setName('coins')
        .setDescription('Top Lotus Coin earners')
        .addStringOption(o =>
          o.setName('scope')
            .setDescription('Global or server leaderboard?')
            .addChoices(
              { name: '🌍 Global', value: 'global' },
              { name: '🏠 Server', value: 'server' },
            )
        )
    ),

  cooldown: 5000,

  async execute(interaction, client) {
    await interaction.deferReply();

    const sub   = interaction.options.getSubcommand();
    const scope = interaction.options.getString('scope') ?? 'global';

    if (sub === 'catfight') return handleCatfight(interaction, scope);
    if (sub === 'coins')    return handleCoins(interaction, scope);
  },
};

// ─────────────────────────────────────────────
// CATFIGHT LEADERBOARD
// ─────────────────────────────────────────────
async function handleCatfight(interaction, scope) {
  const query = buildQuery(scope, interaction);
  const top   = await User.find(query)
    .sort({ 'catfightStats.wins': -1 })
    .limit(config.limits.leaderboardSize)
    .lean();

  const scopeLabel = scope === 'server' ? `🏠 ${interaction.guild?.name}` : '🌍 Global';
  const entries    = top.map((u, i) => ({
    rank:     i + 1,
    username: u.username,
    value:    `**${u.catfightStats.wins}** wins (${u.catfightStats.totalGames} games)`,
  }));

  const embed = embedder.leaderboard(`Catfight Leaderboard — ${scopeLabel}`, entries);
  embed.setDescription(
    entries.length
      ? entries.map(e => formatEntry(e)).join('\n')
      : '*No data yet — start a Catfight with `/catfight create`!*'
  );

  return interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────
// COINS LEADERBOARD
// ─────────────────────────────────────────────
async function handleCoins(interaction, scope) {
  const query = buildQuery(scope, interaction);
  const top   = await User.find(query)
    .sort({ totalEarned: -1 })
    .limit(config.limits.leaderboardSize)
    .lean();

  const scopeLabel = scope === 'server' ? `🏠 ${interaction.guild?.name}` : '🌍 Global';
  const entries    = top.map((u, i) => ({
    rank:     i + 1,
    username: u.username,
    value:    `${config.emojis.ui.coin} **${u.totalEarned.toLocaleString()}** earned`,
  }));

  const embed = embedder.leaderboard(`Lotus Coins Leaderboard — ${scopeLabel}`, entries);
  embed.setDescription(
    entries.length
      ? entries.map(e => formatEntry(e)).join('\n')
      : '*No data yet — start earning with `/daily` and `/work`!*'
  );

  return interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────
// YARDIMCILAR
// ─────────────────────────────────────────────

/**
 * Scope'a göre MongoDB query filtresi oluşturur.
 * Server scope'da sunucudaki member ID'leriyle filtreler.
 */
function buildQuery(scope, interaction) {
  const base = { isRegistered: true };
  if (scope === 'server' && interaction.guild) {
    const memberIds = [...interaction.guild.members.cache.keys()];
    return { ...base, userId: { $in: memberIds } };
  }
  return base;
}

/**
 * Liderlik tablosu satırını formatlar.
 */
function formatEntry(e) {
  const medals = ['🥇', '🥈', '🥉'];
  const prefix = medals[e.rank - 1] ?? `**${e.rank}.**`;
  return `${prefix} **${e.username}** — ${e.value}`;
}
