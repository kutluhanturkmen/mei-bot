'use strict';

const { SlashCommandBuilder } = require('discord.js');
const User     = require('../../src/database/User');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// 💰 MODÜL 2 — /daily
// Günlük ödül komutu. 24 saatte bir kullanılabilir.
// Premium sunucularda 2x ödül.
// =============================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('🌸 Collect your daily Lotus Coins reward!'),

  cooldown: 0, // Cooldown DB'de yönetilir

  async execute(interaction, client) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const user   = await User.findOne({ userId });

    if (!user?.isRegistered) {
      return interaction.editReply({
        embeds: [embedder.warn('You need to register first! Use </register:0> to get started. 🌸', 'Not Registered')],
      });
    }

    // Cooldown kontrolü
    const { onCooldown, remaining } = user.getCooldown('lastDaily', config.economy.dailyCooldown);
    if (onCooldown) {
      return interaction.editReply({
        embeds: [embedder.cooldown('daily', remaining)],
      });
    }

    // Sunucu Early Supporter çarpanı
    let multiplier = 1;
    if (interaction.guild) {
      const guild = await Guild.findOne({ guildId: interaction.guild.id });
      if (guild?.isEarlySupporter) multiplier = guild.economyMultiplier;
    }

    const baseAmount  = config.economy.dailyAmount;
    const finalAmount = Math.floor(baseAmount * multiplier);

    user.addBalance(finalAmount);
    user.lastDaily = new Date();
    await user.save();

    const { emojis } = config;
    const ui = emojis.ui;
    const boosted = multiplier > 1;

    const embed = embedder.economy(
      `Daily reward collected!${boosted ? ' *(Early Supporter x2 boost!)* 🌟' : ''}`,
      finalAmount,
      user.balance
    );

    embed.setTitle(`${ui.flower} Daily Reward`);
    embed.setDescription(
      [
        `Here are your daily **${finalAmount.toLocaleString()} ${ui.coin} Lotus Coins**, ${interaction.user.displayName}!`,
        boosted ? `\n✨ *This server's Early Supporter boost doubled your reward!*` : '',
        `\nCome back in **24 hours** for your next reward.`,
      ].join('')
    );
    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed] });
  },
};
