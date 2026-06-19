'use strict';

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// =============================================
// ⚔️ CATFIGHT BUTTON HANDLER — LEAVE
// customId: 'catfight_leave'
// =============================================

const {
  activeLobbies,
  buildLobbyEmbed,
  buildLobbyButtons,
} = require('../../commands/games/catfight');

module.exports = {
  customId: 'catfight_leave',

  async execute(interaction, client) {
    const guildId = interaction.guild?.id;
    const lobby   = activeLobbies.get(guildId);

    if (!lobby || lobby.started) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${config.emojis.ui.cross} No active lobby to leave.`),
        ],
        ephemeral: true,
      });
    }

    if (!lobby.players.has(interaction.user.id)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`${config.emojis.ui.warning} You're not in this lobby!`),
        ],
        ephemeral: true,
      });
    }

    // Host ayrılamaz — sadece cancel komutuyla kapatabilir
    if (lobby.hostId === interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`${config.emojis.ui.warning} As the host, use \`/catfight cancel\` to close the lobby.`),
        ],
        ephemeral: true,
      });
    }

    lobby.players.delete(interaction.user.id);

    const canStart    = lobby.players.size >= config.catfight.minPlayers;
    const updatedEmbed = buildLobbyEmbed(
      lobby,
      config.catfight.minPlayers,
      config.catfight.maxPlayers,
      config.emojis.ui,
      config.colors
    );
    const updatedRow = buildLobbyButtons(!canStart);

    await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
  },
};
