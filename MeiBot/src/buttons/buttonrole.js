'use strict';

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// =============================================
// 🛡️ BUTTON ROLE HANDLER
// customIdPrefix: 'buttonrole_'
// customId formatı: buttonrole_{roleId}
// =============================================

module.exports = {
  customIdPrefix: 'buttonrole_',

  async execute(interaction, client, suffix) {
    const roleId = suffix; // suffix = roleId

    await interaction.deferReply({ ephemeral: true });

    const guild  = interaction.guild;
    const member = interaction.member;

    // Rolü al
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${config.emojis.ui.cross} This role no longer exists. Please contact an administrator.`),
        ],
      });
    }

    // Bot'un rolü verebilecek yetkisi var mı?
    const botMember = await guild.members.fetchMe();
    if (role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(
              `${config.emojis.ui.cross} I don't have permission to assign **${role.name}**.\n` +
              `Please ask an admin to move my role higher.`
            ),
        ],
      });
    }

    try {
      if (member.roles.cache.has(roleId)) {
        // Rol zaten var — kaldır
        await member.roles.remove(roleId);
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle(`${config.emojis.ui.paw} Role Removed`)
              .setDescription(`The **${role.name}** role has been removed from you.`),
          ],
        });
      } else {
        // Rol yok — ekle
        await member.roles.add(roleId);
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.success)
              .setTitle(`${config.emojis.ui.paw} Role Added`)
              .setDescription(`You now have the **${role.name}** role! ${config.emojis.ui.sparkle}`),
          ],
        });
      }
    } catch (err) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(
              `${config.emojis.ui.cross} Failed to update your role: \`${err.message}\``
            ),
        ],
      });
    }
  },
};
