'use strict';

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// =============================================
// ⚔️ CATFIGHT BUTTON HANDLER — START
// customId: 'catfight_start'
// Sadece host başlatabilir. Min oyuncu kontrolü yapılır.
// =============================================

const {
  activeLobbies,
  startGame,
  buildLobbyButtons,
} = require('../../commands/games/catfight');

module.exports = {
  customId: 'catfight_start',

  async execute(interaction, client) {
    const guildId = interaction.guild?.id;
    const lobby   = activeLobbies.get(guildId);

    if (!lobby || lobby.started) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${config.emojis.ui.cross} No active lobby found.`),
        ],
        ephemeral: true,
      });
    }

    // Sadece host başlatabilir
    if (lobby.hostId !== interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`${config.emojis.ui.warning} Only **${lobby.hostName}** (the host) can start the game!`),
        ],
        ephemeral: true,
      });
    }

    // Minimum oyuncu kontrolü
    if (lobby.players.size < config.catfight.minPlayers) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(
              `${config.emojis.ui.warning} Need at least **${config.catfight.minPlayers}** players to start. ` +
              `Currently **${lobby.players.size}** in lobby.`
            ),
        ],
        ephemeral: true,
      });
    }

    // Başlangıç embed'i — butonları kaldır
    const startEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('⚔️ Catfight Games — Starting!')
      .setDescription(
        `**${lobby.players.size}** contestants are locked in!\n` +
        `The games begin in the arena... 🐾\n\n` +
        [...lobby.players.values()].map(p => `${config.emojis.ui.paw} **${p.username}**`).join('\n')
      )
      .setFooter({ text: config.footer.text })
      .setTimestamp();

    await interaction.update({ embeds: [startEmbed], components: [] });

    // Oyunu başlat
    const channel = interaction.channel;
    await startGame(client, guildId, channel, lobby);
  },
};
