'use strict';

const { EmbedBuilder } = require('discord.js');
const Guild    = require('../database/Guild');
const embedder = require('../utils/embedder');
const config   = require('../../config.json');
const {
  buildServerEmbed,
  buildServerRows,
} = require('../../commands/utility/settings');

// =============================================
// ⚙️ SETTINGS — SERVER BUTTON/SELECT HANDLER
// Prefix: settings_toggle_ | settings_channel_
// =============================================

module.exports = {
  customIdPrefix: 'settings_server_',

  async execute(interaction, client) {
    const id = interaction.customId;

    // ── Yetki Kontrolü ────────────────────────
    if (!interaction.memberPermissions?.has(0x20n /* MANAGE_GUILD */)) {
      return interaction.reply({
        embeds: [embedder.error('You need **Manage Server** permission.', 'No Permission')],
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    const guildData = await Guild.findOrCreate(interaction.guild.id, interaction.guild.name);
    if (!guildData.settings) guildData.settings = {};

    // ── TOGGLE BUTONLARI ──────────────────────
    if (id === 'settings_server_toggle_logs') {
      guildData.settings.logsEnabled = !(guildData.settings.logsEnabled ?? true);
      guildData.markModified('settings');
      await guildData.save();
      return refreshServerPanel(interaction, guildData);
    }

    if (id === 'settings_server_toggle_games') {
      guildData.settings.gamesEnabled = !(guildData.settings.gamesEnabled ?? true);
      guildData.markModified('settings');
      await guildData.save();
      return refreshServerPanel(interaction, guildData);
    }

    if (id === 'settings_server_toggle_economy') {
      guildData.settings.economyEnabled = !(guildData.settings.economyEnabled ?? true);
      guildData.markModified('settings');
      await guildData.save();
      return refreshServerPanel(interaction, guildData);
    }

    // ── CHANNEL SELECT MENÜLER ────────────────
    if (id === 'settings_server_channel_joinlog') {
      const channelId = interaction.values?.[0] ?? null;
      if (!guildData.channels) guildData.channels = {};
      guildData.channels.joinLog = channelId;
      guildData.markModified('channels');
      await guildData.save();
      return refreshServerPanel(interaction, guildData);
    }

    if (id === 'settings_server_channel_welcome') {
      const channelId = interaction.values?.[0] ?? null;
      if (!guildData.channels) guildData.channels = {};
      guildData.channels.welcome = channelId;
      guildData.markModified('channels');
      await guildData.save();
      return refreshServerPanel(interaction, guildData);
    }

    if (id === 'settings_server_channel_giveawaylog') {
      const channelId = interaction.values?.[0] ?? null;
      if (!guildData.channels) guildData.channels = {};
      guildData.channels.giveawayLog = channelId;
      guildData.markModified('channels');
      await guildData.save();
      return refreshServerPanel(interaction, guildData);
    }

    if (id === 'settings_server_channel_games') {
      const channelId = interaction.values?.[0] ?? null;
      guildData.settings.gameChannelId = channelId;
      guildData.markModified('settings');
      await guildData.save();
      return refreshServerPanel(interaction, guildData);
    }
  },
};

// ─────────────────────────────────────────────
async function refreshServerPanel(interaction, guildData) {
  const embed = buildServerEmbed(guildData, interaction.guild);
  const rows  = buildServerRows(guildData);
  return interaction.editReply({ embeds: [embed], components: rows }).catch(() => {});
}
