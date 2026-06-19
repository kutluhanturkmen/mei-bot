'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User     = require('../../src/database/User');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// 💎 MODÜL 1 — MEI'S CLUB (PREMIUM SYSTEM)
// /meiclub info   → Premium avantajlarını gösterir
// /meiclub status → Kullanıcının/sunucunun durumunu gösterir
// /meiclub activate user/server → (Bot sahibi / admin tarafından)
// =============================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meiclub')
    .setDescription("💎 Mei's Club premium system")
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription("Learn about Mei's Club perks")
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check your or this server\'s premium status')
    )
    .addSubcommand(sub =>
      sub
        .setName('activate')
        .setDescription('(Owner only) Activate premium for a user or server')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Activate for user or server?')
            .setRequired(true)
            .addChoices(
              { name: '👤 User Premium', value: 'user' },
              { name: '🏠 Server Premium', value: 'server' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('target_id')
            .setDescription('User ID or Guild ID to activate premium for')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('days')
            .setDescription('How many days to grant (default: 30)')
            .setMinValue(1)
            .setMaxValue(365)
        )
    ),

  cooldown: 5000,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'info')     return handleInfo(interaction);
    if (sub === 'status')   return handleStatus(interaction);
    if (sub === 'activate') return handleActivate(interaction, client);
  },
};

// ─────────────────────────────────────────────
// /meiclub info
// ─────────────────────────────────────────────
async function handleInfo(interaction) {
  const { colors, emojis, premium } = config;
  const ui = emojis.ui;

  const embed = new EmbedBuilder()
    .setColor(colors.premium)
    .setTitle(`${ui.premium} Mei's Club — Premium Membership`)
    .setDescription(
      `*Unlock the full Mei experience with exclusive perks for you and your server.*`
    )
    .addFields(
      {
        name: `${ui.star} User Premium — $${premium.price.user.monthly}/mo`,
        value: [
          `${ui.premium} Shining **Mei's Club** badge on your profile`,
          `${ui.paw} Access to rare & exclusive shop backgrounds`,
          `${ui.sparkle} **50% reduced cooldowns** on all commands`,
        ].join('\n'),
        inline: false,
      },
      {
        name: `${ui.shield} Server Premium — $${premium.price.server.monthly}/mo`,
        value: [
          `${ui.coin} **x2 Economy Boost** — all /work, /daily & café income doubled`,
          `${ui.sword} **Custom Catfight Messages** — personalize elimination lines`,
          `${ui.gift} **Unlimited Giveaways** — free servers limited to ${premium.freeGiveawayLimit}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: `${ui.flower} How to Subscribe`,
        value: `Visit our [support server](${config.bot.supportServer}) to purchase Mei's Club.`,
        inline: false,
      }
    )
    .setFooter({ text: config.footer.text })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────
// /meiclub status
// ─────────────────────────────────────────────
async function handleStatus(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const [user, guild] = await Promise.all([
    User.findOrCreate(interaction.user.id, interaction.user.username),
    interaction.guild
      ? Guild.findOrCreate(interaction.guild.id, interaction.guild.name)
      : Promise.resolve(null),
  ]);

  const userPremium  = user.checkPremium();
  const guildPremium = guild ? guild.checkPremium() : false;

  const { colors, emojis } = config;
  const ui = emojis.ui;

  const formatDate = (d) => d ? `<t:${Math.floor(new Date(d).getTime() / 1000)}:D>` : 'N/A';

  const embed = new EmbedBuilder()
    .setColor(userPremium || guildPremium ? colors.premium : colors.primary)
    .setTitle(`${ui.premium} Mei's Club Status`)
    .addFields(
      {
        name: `${ui.star} Your Premium`,
        value: userPremium
          ? `${ui.check} **Active** — expires ${formatDate(user.premiumExpires)}`
          : `${ui.cross} Not active`,
        inline: true,
      },
      {
        name: `${ui.shield} Server Premium`,
        value: guildPremium && guild
          ? `${ui.check} **Active** — expires ${formatDate(guild.premiumExpires)}`
          : `${ui.cross} Not active`,
        inline: true,
      }
    )
    .setFooter({ text: config.footer.text })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────
// /meiclub activate  (Bot sahibi korumalı)
// ─────────────────────────────────────────────
async function handleActivate(interaction, client) {
  // Sadece bot sahibi kullanabilir
  const appInfo = await client.application.fetch();
  if (interaction.user.id !== appInfo.owner?.id) {
    return interaction.reply({
      embeds: [embedder.error('Only the bot owner can activate premium.', 'Access Denied')],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const type     = interaction.options.getString('type');
  const targetId = interaction.options.getString('target_id');
  const days     = interaction.options.getInteger('days') ?? 30;
  const expires  = new Date(Date.now() + days * 86_400_000);

  try {
    if (type === 'user') {
      const user = await User.findOneAndUpdate(
        { userId: targetId },
        {
          isPremium:      true,
          premiumSince:   new Date(),
          premiumExpires: expires,
        },
        { upsert: true, new: true }
      );
      return interaction.editReply({
        embeds: [
          embedder.success(
            `User **${user.username || targetId}** has been granted **User Premium** for **${days} day(s)**.\nExpires: <t:${Math.floor(expires.getTime() / 1000)}:D>`,
            "💎 Premium Activated"
          ),
        ],
      });
    }

    if (type === 'server') {
      await Guild.findOneAndUpdate(
        { guildId: targetId },
        {
          isPremium:         true,
          premiumSince:      new Date(),
          premiumExpires:    expires,
          economyMultiplier: config.premium.economyBoostMultiplier,
          premiumActivatedBy: interaction.user.id,
        },
        { upsert: true, new: true }
      );
      return interaction.editReply({
        embeds: [
          embedder.success(
            `Server **${targetId}** has been granted **Server Premium** for **${days} day(s)**.\nExpires: <t:${Math.floor(expires.getTime() / 1000)}:D>`,
            "💎 Server Premium Activated"
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
