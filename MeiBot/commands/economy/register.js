'use strict';

const { SlashCommandBuilder } = require('discord.js');
const User     = require('../../src/database/User');
const Cafe     = require('../../src/database/Cafe');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// 💰 MODÜL 2 — /register
// Kullanıcıyı ekonomi sistemine kaydeder.
// User + Cafe belgesi oluşturur.
// =============================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('🌸 Create your Mei account and start your journey!'),

  cooldown: 0, // Bir kez yapılır, cooldown gereksiz

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const userId   = interaction.user.id;
    const username = interaction.user.username;

    // Zaten kayıtlı mı?
    const existing = await User.findOne({ userId });
    if (existing?.isRegistered) {
      return interaction.editReply({
        embeds: [
          embedder.warn(
            `You're already registered! Use </profile:0> to view your account.\n${config.emojis.ui.coin} Balance: **${existing.balance.toLocaleString()} Lotus Coins**`,
            'Already Registered'
          ),
        ],
      });
    }

    // User + Cafe belgesi oluştur (transaction-benzeri)
    const [user] = await Promise.all([
      User.findOneAndUpdate(
        { userId },
        {
          userId,
          username,
          isRegistered: true,
          registeredAt: new Date(),
          balance:      config.economy.startingBalance,
        },
        { upsert: true, new: true }
      ),
      Cafe.findOrCreate(userId),
    ]);

    const { emojis, economy, colors } = config;
    const ui = emojis.ui;

    const embed = embedder.success(
      [
        `Welcome to Mei's world, **${interaction.user.displayName}**! ${ui.flower}`,
        '',
        `You've received **${economy.startingBalance.toLocaleString()} ${ui.coin} Lotus Coins** to get started.`,
        '',
        `**What's next?**`,
        `${ui.coin} \`/daily\` — Collect your daily reward`,
        `${ui.cafe} \`/cafe\` — Open your Cat Café`,
        `${ui.star} \`/work\` — Earn more coins`,
        `${ui.premium} \`/meiclub\` — Learn about premium perks`,
      ].join('\n'),
      '🌸 Registration Complete!'
    );

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed] });
  },
};
