'use strict';

const { EmbedBuilder } = require('discord.js');
const User     = require('../database/User');
const config   = require('../../config.json');

// =============================================
// 🌸 TRIVIA BUTTON HANDLER
// customIdPrefix: 'trivia_'
// customId formatı: trivia_{userId}_{optionIndex}
// =============================================

// trivia.js komut dosyasındaki activeSessions Map'ine erişim
const { activeSessions } = require('../../commands/economy/trivia');

module.exports = {
  customIdPrefix: 'trivia_',

  /**
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('discord.js').Client} client
   * @param {string} suffix  — "{userId}_{optionIndex}"
   */
  async execute(interaction, client, suffix) {
    const parts       = suffix.split('_');
    const ownerId     = parts[0];
    const chosenIndex = parseInt(parts[1], 10);

    // Sadece soruyu açan kişi cevaplayabilir
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`${config.emojis.ui.warning} This trivia question belongs to someone else!`),
        ],
        ephemeral: true,
      });
    }

    const session = activeSessions.get(ownerId);
    if (!session) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${config.emojis.ui.cross} This trivia session has expired.`),
        ],
        ephemeral: true,
      });
    }

    // Oturumu temizle
    clearTimeout(session.timeout);
    activeSessions.delete(ownerId);

    await interaction.deferUpdate();

    const isCorrect  = chosenIndex === session.correctIndex;
    const labels     = ['A', 'B', 'C', 'D'];
    const { emojis, colors } = config;
    const ui = emojis.ui;

    if (isCorrect) {
      // Para ödülü ver
      const user = await User.findOne({ userId: ownerId });
      if (user) {
        user.addBalance(session.reward);
        user.lastTrivia              = new Date();
        user.triviaStats.correct    += 1;
        user.triviaStats.streak     += 1;
        if (user.triviaStats.streak > user.triviaStats.bestStreak) {
          user.triviaStats.bestStreak = user.triviaStats.streak;
        }
        await user.save();
      }

      const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle(`${ui.check} Correct Answer!`)
        .setDescription(
          [
            `**${labels[session.correctIndex]}. ${session.options[session.correctIndex]}** was right! 🎉`,
            '',
            `${ui.coin} You earned **${session.reward.toLocaleString()} Lotus Coins**!`,
            user ? `${ui.star} New balance: **${user.balance.toLocaleString()}** coins` : '',
            user?.triviaStats.streak > 1
              ? `\n🔥 Streak: **${user.triviaStats.streak}** in a row!`
              : '',
          ].join('\n')
        )
        .setFooter({ text: config.footer.text })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed], components: [] });
    } else {
      // Yanlış cevap
      const user = await User.findOne({ userId: ownerId });
      if (user) {
        user.lastTrivia             = new Date();
        user.triviaStats.incorrect += 1;
        user.triviaStats.streak     = 0;
        await user.save();
      }

      const embed = new EmbedBuilder()
        .setColor(colors.error)
        .setTitle(`${ui.cross} Wrong Answer!`)
        .setDescription(
          [
            `You chose **${labels[chosenIndex]}. ${session.options[chosenIndex]}** — that's incorrect. 😿`,
            '',
            `The correct answer was **${labels[session.correctIndex]}. ${session.options[session.correctIndex]}**.`,
            `\nBetter luck next time! Try again in **5 minutes**.`,
          ].join('\n')
        )
        .setFooter({ text: config.footer.text })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed], components: [] });
    }
  },
};
