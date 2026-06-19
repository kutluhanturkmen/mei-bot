'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User     = require('../../src/database/User');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// 🌟 EARLY SUPPORTER — /earlysupporter
// /earlysupporter info   → Avantajları gösterir
// /earlysupporter status → Kullanıcının/sunucunun durumunu gösterir
// /earlysupporter grant  → (Bot sahibi) Manuel ver
// /earlysupporter revoke → (Bot sahibi) Manuel al
// =============================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('earlysupporter')
    .setDescription('🌟 Early Supporter program information and status')
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Learn about Early Supporter perks')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check your or this server\'s Early Supporter status')
    )
    .addSubcommand(sub =>
      sub
        .setName('grant')
        .setDescription('(Owner only) Manually grant Early Supporter status')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Grant for user or server?')
            .setRequired(true)
            .addChoices(
              { name: '👤 User',   value: 'user'   },
              { name: '🏠 Server', value: 'server' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('target_id')
            .setDescription('User ID or Guild ID')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('revoke')
        .setDescription('(Owner only) Manually revoke Early Supporter status')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Revoke for user or server?')
            .setRequired(true)
            .addChoices(
              { name: '👤 User',   value: 'user'   },
              { name: '🏠 Server', value: 'server' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('target_id')
            .setDescription('User ID or Guild ID')
            .setRequired(true)
        )
    ),

  cooldown: 5000,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'info')   return handleInfo(interaction);
    if (sub === 'status') return handleStatus(interaction);
    if (sub === 'grant')  return handleGrant(interaction, client);
    if (sub === 'revoke') return handleRevoke(interaction, client);
  },
};

// ─────────────────────────────────────────────
// /earlysupporter info
// ─────────────────────────────────────────────
async function handleInfo(interaction) {
  const { colors, emojis, earlySupporter } = config;
  const ui = emojis.ui;

  const embed = new EmbedBuilder()
    .setColor(colors.premium)
    .setTitle(`${ui.star} Early Supporter Program`)
    .setDescription(
      `*Join our [Support Server](${config.bot.supportServer}) and grab the **Early Supporter** role to unlock exclusive perks — completely free while Mei is just starting out!*`
    )
    .addFields(
      {
        name: `${ui.star} User Early Supporter`,
        value: [
          `${ui.premium} Exclusive **Early Supporter** badge on your profile`,
          `${ui.sparkle} **${Math.round(earlySupporter.cooldownReduction * 100)}% reduced cooldowns** on all commands`,
          `${ui.paw} Access to rare & exclusive shop backgrounds`,
        ].join('\n'),
        inline: false,
      },
      {
        name: `${ui.shield} Server Early Supporter`,
        value: [
          `${ui.coin} **x${earlySupporter.economyBoostMultiplier} Economy Boost** — all /work, /daily & café income doubled`,
          `${ui.sword} **Custom Catfight Messages** — personalize elimination lines`,
          `${ui.gift} **Unlimited Giveaways** — free servers limited to ${earlySupporter.freeGiveawayLimit}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: `${ui.flower} How to Get It`,
        value: `Join our [Support Server](${config.bot.supportServer}), head to the roles channel and pick up the **Early Supporter** role. That's it — the bot handles the rest automatically!`,
        inline: false,
      }
    )
    .setFooter({ text: `${config.footer.text} • Limited-time program` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────
// /earlysupporter status
// ─────────────────────────────────────────────
async function handleStatus(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const [user, guild] = await Promise.all([
    User.findOrCreate(interaction.user.id, interaction.user.username),
    interaction.guild
      ? Guild.findOrCreate(interaction.guild.id, interaction.guild.name)
      : Promise.resolve(null),
  ]);

  const userES  = user.isEarlySupporter;
  const guildES = guild ? guild.isEarlySupporter : false;

  const { colors, emojis } = config;
  const ui = emojis.ui;

  const formatDate = (d) =>
    d ? `<t:${Math.floor(new Date(d).getTime() / 1000)}:D>` : 'N/A';

  const embed = new EmbedBuilder()
    .setColor(userES || guildES ? colors.premium : colors.primary)
    .setTitle(`${ui.star} Early Supporter Status`)
    .addFields(
      {
        name:   `${ui.star} Your Status`,
        value:  userES
          ? `${ui.check} **Early Supporter** — since ${formatDate(user.earlySupporterSince)}`
          : `${ui.cross} Not an Early Supporter`,
        inline: true,
      },
      {
        name:   `${ui.shield} Server Status`,
        value:  guildES && guild
          ? `${ui.check} **Early Supporter** — since ${formatDate(guild.earlySupporterSince)}`
          : `${ui.cross} Not an Early Supporter`,
        inline: true,
      }
    )
    .setFooter({ text: `${config.footer.text} • Join our support server to get the role!` })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────
// /earlysupporter grant  (Bot sahibi)
// ─────────────────────────────────────────────
async function handleGrant(interaction, client) {
  const appInfo = await client.application.fetch();
  if (interaction.user.id !== appInfo.owner?.id) {
    return interaction.reply({
      embeds: [embedder.error('Only the bot owner can use this command.', 'Access Denied')],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const type     = interaction.options.getString('type');
  const targetId = interaction.options.getString('target_id');

  try {
    if (type === 'user') {
      const result = await User.findOneAndUpdate(
        { userId: targetId },
        {
          $set:      { isEarlySupporter: true, earlySupporterSince: new Date() },
          $addToSet: { badges: 'early_supporter' },
        },
        { new: true }
      );

      if (!result) {
        return interaction.editReply({
          embeds: [embedder.error(`No registered user found with ID \`${targetId}\`.`, 'Not Found')],
        });
      }

      return interaction.editReply({
        embeds: [
          embedder.success(
            `User **${result.username || targetId}** granted Early Supporter status.`,
            '🌟 Early Supporter Granted'
          ),
        ],
      });
    }

    if (type === 'server') {
      const result = await Guild.findOneAndUpdate(
        { guildId: targetId },
        {
          $set: {
            isEarlySupporter:          true,
            earlySupporterSince:       new Date(),
            earlySupporterActivatedBy: interaction.user.id,
            economyMultiplier:         config.earlySupporter.economyBoostMultiplier,
          },
        },
        { new: true }
      );

      if (!result) {
        return interaction.editReply({
          embeds: [embedder.error(`No guild found with ID \`${targetId}\` in the database.`, 'Not Found')],
        });
      }

      return interaction.editReply({
        embeds: [
          embedder.success(
            `Server **${result.guildName || targetId}** granted Early Supporter status.`,
            '🌟 Server Early Supporter Granted'
          ),
        ],
      });
    }
  } catch (err) {
    return interaction.editReply({
      embeds: [embedder.error(`Database error: ${err.message}`)],
    });
  }
}

// ─────────────────────────────────────────────
// /earlysupporter revoke  (Bot sahibi)
// ─────────────────────────────────────────────
async function handleRevoke(interaction, client) {
  const appInfo = await client.application.fetch();
  if (interaction.user.id !== appInfo.owner?.id) {
    return interaction.reply({
      embeds: [embedder.error('Only the bot owner can use this command.', 'Access Denied')],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const type     = interaction.options.getString('type');
  const targetId = interaction.options.getString('target_id');

  try {
    if (type === 'user') {
      const result = await User.findOneAndUpdate(
        { userId: targetId },
        { $set: { isEarlySupporter: false } },
        { new: true }
      );

      if (!result) {
        return interaction.editReply({
          embeds: [embedder.error(`No registered user found with ID \`${targetId}\`.`, 'Not Found')],
        });
      }

      return interaction.editReply({
        embeds: [
          embedder.success(
            `User **${result.username || targetId}** Early Supporter status revoked.`,
            '🌟 Early Supporter Revoked'
          ),
        ],
      });
    }

    if (type === 'server') {
      const result = await Guild.findOneAndUpdate(
        { guildId: targetId },
        { $set: { isEarlySupporter: false, economyMultiplier: 1 } },
        { new: true }
      );

      if (!result) {
        return interaction.editReply({
          embeds: [embedder.error(`No guild found with ID \`${targetId}\` in the database.`, 'Not Found')],
        });
      }

      return interaction.editReply({
        embeds: [
          embedder.success(
            `Server **${result.guildName || targetId}** Early Supporter status revoked.`,
            '🌟 Server Early Supporter Revoked'
          ),
        ],
      });
    }
  } catch (err) {
    return interaction.editReply({
      embeds: [embedder.error(`Database error: ${err.message}`)],
    });
  }
}
