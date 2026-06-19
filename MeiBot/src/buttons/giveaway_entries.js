'use strict';

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// =============================================
// 🛡️ GIVEAWAY BUTTON HANDLER — VIEW ENTRIES
// customId: 'giveaway_entries'
// =============================================

const { activeGiveaways } = require('../store/giveawayStore');

module.exports = {
  customId: 'giveaway_entries',

  async execute(interaction, client) {
    const messageId = interaction.message.id;
    const giveaway  = activeGiveaways.get(messageId);

    if (!giveaway) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${config.emojis.ui.cross} Giveaway data not found.`),
        ],
        ephemeral: true,
      });
    }

    const entries    = [...giveaway.entries];
    const entryCount = entries.length;

    // İlk 20 katılımcıyı mention olarak listele
    const listed = entries
      .slice(0, 20)
      .map((id, i) => `**${i + 1}.** <@${id}>`)
      .join('\n');

    const extra = entryCount > 20
      ? `\n*...and ${entryCount - 20} more.*`
      : '';

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`${config.emojis.ui.gift} Giveaway Entries`)
          .setDescription(
            entryCount > 0
              ? `**Prize:** ${giveaway.prize}\n**Total Entries:** ${entryCount}\n\n${listed}${extra}`
              : `**Prize:** ${giveaway.prize}\n\n*No entries yet! Be the first to join! 🎁*`
          )
          .setFooter({ text: config.footer.text })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};
