'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

// =============================================
// 🛡️ GIVEAWAY BUTTON HANDLER — ENTER
// customId: 'giveaway_enter'
// =============================================

const { activeGiveaways } = require('../store/giveawayStore');

module.exports = {
  customId: 'giveaway_enter',

  async execute(interaction, client) {
    const messageId = interaction.message.id;
    const giveaway  = activeGiveaways.get(messageId);

    if (!giveaway || giveaway.ended) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${config.emojis.ui.cross} This giveaway has already ended!`),
        ],
        ephemeral: true,
      });
    }

    const userId = interaction.user.id;

    if (giveaway.entries.has(userId)) {
      // Çekilişten ayrıl
      giveaway.entries.delete(userId);

      await updateGiveawayEmbed(interaction.message, giveaway);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`${config.emojis.ui.warning} You've been **removed** from the giveaway for **${giveaway.prize}**.`),
        ],
        ephemeral: true,
      });
    } else {
      // Çekilişe katıl
      giveaway.entries.add(userId);

      await updateGiveawayEmbed(interaction.message, giveaway);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setDescription(
              `${config.emojis.ui.check} You've entered the giveaway for **${giveaway.prize}**! Good luck! 🎁\n` +
              `*Click the button again to leave the giveaway.*`
            ),
        ],
        ephemeral: true,
      });
    }
  },
};

// ─────────────────────────────────────────────
// Giveaway embed'ini güncel katılımcı sayısıyla güncelle
// ─────────────────────────────────────────────
async function updateGiveawayEmbed(message, giveaway) {
  const endsAtTs  = Math.floor(new Date(giveaway.endsAt).getTime() / 1000);
  const { emojis, colors } = config;

  const updatedEmbed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(`${emojis.ui.gift} GIVEAWAY`)
    .setDescription(
      [
        `**Prize:** 🎁 ${giveaway.prize}`,
        `**Winners:** ${giveaway.winnerCount}`,
        `**Hosted by:** <@${giveaway.hostId}>`,
        `**Ends:** <t:${endsAtTs}:R> (<t:${endsAtTs}:f>)`,
        ``,
        `Click **Enter Giveaway** to participate!`,
        `**Entries: ${giveaway.entries.size}**`,
      ].join('\n')
    )
    .setFooter({ text: `${giveaway.winnerCount} winner(s) • ${config.footer.text}` })
    .setTimestamp(new Date(giveaway.endsAt));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel(`🎁 Enter Giveaway (${giveaway.entries.size})`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('giveaway_entries')
      .setLabel('👥 View Entries')
      .setStyle(ButtonStyle.Secondary),
  );

  await message.edit({ embeds: [updatedEmbed], components: [row] }).catch(() => {});
}
