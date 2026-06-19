'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// 🏠 /server — Sunucu bilgi komutu
// /profile benzeri ama sunucu için.
// Early Supporter rozeti, ayarlar, istatistikler.
// =============================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('🏠 View this server\'s profile and Early Supporter status'),

  cooldown: 10000,

  async execute(interaction, client) {
    await interaction.deferReply();

    const { guild } = interaction;
    if (!guild) {
      return interaction.editReply({
        embeds: [embedder.error('This command can only be used in a server!', 'Server Only')],
      });
    }

    const guildData = await Guild.findOne({ guildId: guild.id });

    const { colors, emojis } = config;
    const ui = emojis.ui;

    // Temel sunucu bilgileri
    const owner        = await guild.fetchOwner().catch(() => null);
    const createdTs    = Math.floor(guild.createdTimestamp / 1000);
    const memberCount  = guild.memberCount;
    const boostLevel   = guild.premiumTier;
    const boostCount   = guild.premiumSubscriptionCount ?? 0;

    const isES         = guildData?.isEarlySupporter ?? false;
    const esSince      = guildData?.earlySupporterSince
      ? Math.floor(new Date(guildData.earlySupporterSince).getTime() / 1000)
      : null;

    // Economy multiplier
    const multiplier   = guildData?.economyMultiplier ?? 1;

    // Settings summary
    const settings     = guildData?.settings ?? {};
    const activeModules = [
      settings.logsEnabled    !== false && '📋 Logs',
      settings.gamesEnabled   !== false && '⚔️ Games',
      settings.economyEnabled !== false && '🪙 Economy',
    ].filter(Boolean);

    const embed = new EmbedBuilder()
      .setColor(isES ? colors.premium : colors.primary)
      .setTitle(
        `${isES ? `${ui.star} ` : ''}${guild.name}`
      )
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name:   `${ui.shield} Server Info`,
          value:  [
            `**Owner:** ${owner ? `${owner.user.tag}` : 'Unknown'}`,
            `**Created:** <t:${createdTs}:D>`,
            `**Members:** ${memberCount.toLocaleString()}`,
            `**Boosts:** ${boostCount} (Level ${boostLevel})`,
          ].join('\n'),
          inline: true,
        },
        {
          name:   `${ui.star} Early Supporter`,
          value:  isES
            ? [
                `${ui.check} **Active**`,
                esSince ? `Since <t:${esSince}:D>` : '',
                `${ui.coin} **x${multiplier} Economy Boost**`,
                `${ui.gift} **Unlimited Giveaways**`,
                `${ui.sword} **Custom Catfight Messages**`,
              ].filter(Boolean).join('\n')
            : [
                `${ui.cross} Not an Early Supporter`,
                ``,
                `Join our [support server](${config.bot.supportServer})`,
                `and get the role to unlock perks!`,
              ].join('\n'),
          inline: true,
        },
        {
          name:   `${ui.sparkle} Active Modules`,
          value:  activeModules.length ? activeModules.join(' • ') : '*None configured*',
          inline: false,
        },
      )
      .setFooter({ text: `${config.footer.text} • ID: ${guild.id}` })
      .setTimestamp();

    // Bot bu sunucuda ne kadar süredir?
    const botMember = guild.members.cache.get(client.user.id);
    if (botMember) {
      const joinedTs = Math.floor(botMember.joinedTimestamp / 1000);
      embed.addFields({
        name:   `${ui.paw} Bot Added`,
        value:  `<t:${joinedTs}:R> (<t:${joinedTs}:D>)`,
        inline: true,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
