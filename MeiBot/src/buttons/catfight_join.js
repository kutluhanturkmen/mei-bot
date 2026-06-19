'use strict';

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// =============================================
// ⚔️ CATFIGHT BUTTON HANDLER — JOIN
// customId: 'catfight_join'
// =============================================

const {
  activeLobbies,
  buildLobbyEmbed,
  buildLobbyButtons,
} = require('../../commands/games/catfight');

module.exports = {
  customId: 'catfight_join',

  async execute(interaction, client) {
    const guildId = interaction.guild?.id;
    const lobby   = activeLobbies.get(guildId);

    if (!lobby || lobby.started) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${config.emojis.ui.cross} This lobby is no longer active.`),
        ],
        ephemeral: true,
      });
    }

    if (lobby.players.has(interaction.user.id)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`${config.emojis.ui.warning} You're already in the lobby!`),
        ],
        ephemeral: true,
      });
    }

    if (lobby.players.size >= config.catfight.maxPlayers) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${config.emojis.ui.cross} The lobby is full (${config.catfight.maxPlayers} players max)!`),
        ],
        ephemeral: true,
      });
    }

    lobby.players.set(interaction.user.id, {
      userId:   interaction.user.id,
      username: interaction.user.displayName,
    });

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
