'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');
const { activeGiveaways } = require('../../src/store/giveawayStore');

// =============================================
// 🛡️ MODÜL 5 — /giveaway
// Butonlu, şık ve loglama destekli çekiliş sistemi.
// Premium sunucular sınırsız, ücretsiz sunucular max 3.
// =============================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('🎁 Manage giveaways!')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s =>
      s.setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(o =>
          o.setName('prize')
            .setDescription('What are you giving away?')
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(o =>
          o.setName('duration')
            .setDescription('Duration (e.g. 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName('winners')
            .setDescription('Number of winners (default: 1)')
            .setMinValue(1)
            .setMaxValue(20)
        )
    )
    .addSubcommand(s =>
      s.setName('end')
        .setDescription('End a giveaway early')
        .addStringOption(o =>
          o.setName('message_id')
            .setDescription('Message ID of the giveaway to end')
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName('reroll')
        .setDescription('Reroll a giveaway winner')
        .addStringOption(o =>
          o.setName('message_id')
            .setDescription('Message ID of the ended giveaway')
            .setRequired(true)
        )
    ),

  cooldown: 5000,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'start')  return handleStart(interaction, client);
    if (sub === 'end')    return handleEnd(interaction, client);
    if (sub === 'reroll') return handleReroll(interaction, client);
  },
};

// ─────────────────────────────────────────────
// PARSE DURATION  (e.g. "1h", "30m", "2d")
// ─────────────────────────────────────────────
function parseDuration(str) {
  const match = str.trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const val  = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return val * mult[unit];
}

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
async function handleStart(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const guild = await Guild.findOrCreate(interaction.guild.id, interaction.guild.name);

  // Çekiliş limiti kontrolü
  if (!guild.canCreateGiveaway()) {
    return interaction.editReply({
      embeds: [
        embedder.warn(
          `Free servers can only have **${config.earlySupporter.freeGiveawayLimit}** active giveaways at a time.\n` +
          `Join our [support server](${config.bot.supportServer}) and get the **Early Supporter** role for unlimited giveaways! 🌟`,
          'Giveaway Limit Reached'
        ),
      ],
    });
  }

  const prize     = interaction.options.getString('prize');
  const durationStr = interaction.options.getString('duration');
  const winnerCount = interaction.options.getInteger('winners') ?? 1;

  const durationMs = parseDuration(durationStr);
  if (!durationMs) {
    return interaction.editReply({
      embeds: [embedder.error('Invalid duration format. Use: `30m`, `1h`, `2d`, etc.', 'Invalid Duration')],
    });
  }

  if (durationMs < config.limits.giveawayMinDuration || durationMs > config.limits.giveawayMaxDuration) {
    return interaction.editReply({
      embeds: [embedder.error(
        `Duration must be between **1 minute** and **7 days**.`,
        'Invalid Duration'
      )],
    });
  }

  const endsAt    = new Date(Date.now() + durationMs);
  const endsAtTs  = Math.floor(endsAt.getTime() / 1000);

  const { emojis, colors } = config;
  const ui = emojis.ui;

  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(`${ui.gift} GIVEAWAY`)
    .setDescription(
      [
        `**Prize:** 🎁 ${prize}`,
        `**Winners:** ${winnerCount}`,
        `**Hosted by:** ${interaction.user}`,
        `**Ends:** <t:${endsAtTs}:R> (<t:${endsAtTs}:f>)`,
        ``,
        `Click **Enter Giveaway** to participate!`,
        `**Entries: 0**`,
      ].join('\n')
    )
    .setFooter({ text: `${winnerCount} winner(s) • ${config.footer.text}` })
    .setTimestamp(endsAt);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel('🎁 Enter Giveaway')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('giveaway_entries')
      .setLabel('👥 View Entries')
      .setStyle(ButtonStyle.Secondary),
  );

  const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

  // Çekilişi kaydet
  activeGiveaways.set(msg.id, {
    messageId:    msg.id,
    guildId:      interaction.guild.id,
    channelId:    interaction.channelId,
    prize,
    winnerCount,
    hostId:       interaction.user.id,
    endsAt,
    entries:      new Set(),
    ended:        false,
  });

  // Guild aktif sayısını artır
  guild.activeGiveawayCount += 1;
  await guild.save();

  // Timer — süre dolunca çekilişi bitir
  setTimeout(async () => {
    await endGiveaway(msg.id, client);
  }, durationMs);

  await interaction.editReply({
    embeds: [embedder.success(`Giveaway started in ${interaction.channel}! 🎁`, 'Giveaway Created')],
  });
}

// ─────────────────────────────────────────────
// END GIVEAWAY (timer veya manual)
// ─────────────────────────────────────────────
async function endGiveaway(messageId, client) {
  const giveaway = activeGiveaways.get(messageId);
  if (!giveaway || giveaway.ended) return;

  giveaway.ended = true;

  try {
    const guild   = await client.guilds.fetch(giveaway.guildId).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) return;

    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (!msg) return;

    const entries  = [...giveaway.entries];
    const winners  = pickWinners(entries, giveaway.winnerCount);
    const winText  = winners.length
      ? winners.map(id => `<@${id}>`).join(', ')
      : '*No valid entries.*';

    const { emojis, colors } = config;

    // Embed güncelle
    const endEmbed = new EmbedBuilder()
      .setColor(colors.success)
      .setTitle(`${emojis.ui.gift} GIVEAWAY ENDED`)
      .setDescription(
        [
          `**Prize:** 🎁 ${giveaway.prize}`,
          `**Winners:** ${winText}`,
          `**Total Entries:** ${entries.length}`,
          `**Hosted by:** <@${giveaway.hostId}>`,
          ``,
          winners.length
            ? `Congratulations to the winner(s)! 🎉`
            : `*Nobody entered this giveaway.*`,
        ].join('\n')
      )
      .setFooter({ text: config.footer.text })
      .setTimestamp();

    await msg.edit({ embeds: [endEmbed], components: [] });

    // Kazanan mesajı
    if (winners.length) {
      await channel.send({
        content: winners.map(id => `<@${id}>`).join(' '),
        embeds: [
          new EmbedBuilder()
            .setColor(colors.premium)
            .setTitle('🎉 Congratulations!')
            .setDescription(
              `${winners.map(id => `<@${id}>`).join(', ')} won **${giveaway.prize}**!\n` +
              `Contact <@${giveaway.hostId}> to claim your prize.`
            )
            .setTimestamp(),
        ],
      });
    }

    // Guild sayısını güncelle
    const dbGuild = await Guild.findOne({ guildId: giveaway.guildId });
    if (dbGuild && dbGuild.activeGiveawayCount > 0) {
      dbGuild.activeGiveawayCount -= 1;
      await dbGuild.save();
    }

    // Log kanalına bildir
    if (dbGuild?.channels?.giveawayLog) {
      const logCh = await guild.channels.fetch(dbGuild.channels.giveawayLog).catch(() => null);
      if (logCh) {
        await logCh.send({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.info)
              .setTitle('📋 Giveaway Log')
              .addFields(
                { name: 'Prize',    value: giveaway.prize,          inline: true },
                { name: 'Entries',  value: `${entries.length}`,      inline: true },
                { name: 'Winners',  value: winText,                  inline: false },
                { name: 'Host',     value: `<@${giveaway.hostId}>`,  inline: true },
              )
              .setTimestamp(),
          ],
        }).catch(() => {});
      }
    }

    // Ended giveaway'leri temizleme — 10 dakika sonra Map'ten çıkar
    setTimeout(() => activeGiveaways.delete(messageId), 600_000);

  } catch (err) {
    // Sessizce yoksay
  }
}

// ─────────────────────────────────────────────
// MANUAL END
// ─────────────────────────────────────────────
async function handleEnd(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const messageId = interaction.options.getString('message_id');
  const giveaway  = activeGiveaways.get(messageId);

  if (!giveaway || giveaway.ended) {
    return interaction.editReply({
      embeds: [embedder.error('No active giveaway found with that message ID.', 'Not Found')],
    });
  }

  if (giveaway.guildId !== interaction.guild.id) {
    return interaction.editReply({
      embeds: [embedder.error('That giveaway is not from this server.', 'Wrong Server')],
    });
  }

  await endGiveaway(messageId, client);
  return interaction.editReply({
    embeds: [embedder.success('Giveaway ended successfully!', 'Giveaway Ended')],
  });
}

// ─────────────────────────────────────────────
// REROLL
// ─────────────────────────────────────────────
async function handleReroll(interaction, client) {
  await interaction.deferReply({ ephemeral: false });

  const messageId = interaction.options.getString('message_id');
  const giveaway  = activeGiveaways.get(messageId);

  if (!giveaway) {
    return interaction.editReply({
      embeds: [embedder.error('Giveaway not found. Note: reroll is only available for 10 minutes after ending.', 'Not Found')],
    });
  }

  const entries  = [...giveaway.entries];
  const winners  = pickWinners(entries, giveaway.winnerCount);
  const winText  = winners.map(id => `<@${id}>`).join(', ');

  await interaction.editReply({
    content: winners.length ? winners.map(id => `<@${id}>`).join(' ') : '',
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎲 Giveaway Rerolled!')
        .setDescription(
          winners.length
            ? `New winner(s): ${winText}\nCongratulations! 🎉`
            : '*No valid entries to reroll.*'
        )
        .setTimestamp(),
    ],
  });
}

// ─────────────────────────────────────────────
// YARDIMCI — Kazanan seç
// ─────────────────────────────────────────────
function pickWinners(entries, count) {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports.endGiveaway = endGiveaway;
