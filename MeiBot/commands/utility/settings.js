'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const Guild    = require('../../src/database/Guild');
const User     = require('../../src/database/User');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// ⚙️ MODÜL 6 — /settings
// Sunucu ve kişisel ayar kontrol paneli.
// Tamamen buton + select menu tabanlı, interaktif.
// =============================================

// Mevcut arka plan kataloğu (shop'tan)
const BACKGROUNDS = [
  { id: 'default',      label: 'Default (Dark)',       emoji: '🌑' },
  { id: 'sakura',       label: 'Sakura Garden',        emoji: '🌸' },
  { id: 'night_city',   label: 'Night City',           emoji: '🌃' },
  { id: 'cotton_candy', label: 'Cotton Candy',         emoji: '🍬' },
  { id: 'starfield',    label: 'Starfield',            emoji: '✨' },
];

// Bilinen rozet etiketleri
const BADGE_OPTIONS = [
  { id: 'meis_club',          label: "Mei's Club",         emoji: '💎' },
  { id: 'early_bird',         label: 'Early Bird',          emoji: '🐦' },
  { id: 'catfight_champion',  label: 'Catfight Champion',   emoji: '⚔️' },
  { id: 'trivia_master',      label: 'Trivia Master',       emoji: '✨' },
  { id: 'cafe_legend',        label: 'Café Legend',         emoji: '☕' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('⚙️ Configure Mei Bot settings')
    .addSubcommand(s =>
      s.setName('server')
        .setDescription('🛠️ Server control panel (Admin only)')
    )
    .addSubcommand(s =>
      s.setName('profile')
        .setDescription('🎨 Personal profile settings')
    ),

  cooldown: 3000,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'server')  return handleServerSettings(interaction);
    if (sub === 'profile') return handleProfileSettings(interaction);
  },
};

// ─────────────────────────────────────────────
// SERVER SETTINGS
// ─────────────────────────────────────────────
async function handleServerSettings(interaction) {
  // Sadece yöneticiler
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      embeds: [embedder.error('You need **Manage Server** permission to access server settings.', 'No Permission')],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const guildData = await Guild.findOrCreate(interaction.guild.id, interaction.guild.name);
  const s         = guildData.settings || {};

  const embed = buildServerEmbed(guildData, interaction.guild);
  const rows  = buildServerRows(guildData);

  return interaction.editReply({ embeds: [embed], components: rows });
}

// ─────────────────────────────────────────────
// PROFILE SETTINGS
// ─────────────────────────────────────────────
async function handleProfileSettings(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const user = await User.findOne({ userId: interaction.user.id });

  if (!user?.isRegistered) {
    return interaction.editReply({
      embeds: [embedder.warn('Register first with </register:0>! 🌸', 'Not Registered')],
    });
  }

  const embed = buildProfileEmbed(user, interaction.user);
  const rows  = buildProfileRows(user);

  return interaction.editReply({ embeds: [embed], components: rows });
}

// ─────────────────────────────────────────────
// SERVER EMBED
// ─────────────────────────────────────────────
function buildServerEmbed(guildData, guild) {
  const s = guildData.settings || {};
  const ch = guildData.channels || {};

  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`⚙️ Server Settings — ${guild.name}`)
    .setThumbnail(guild.iconURL({ dynamic: true }) || null)
    .addFields(
      {
        name:   '📋 Log System',
        value:  s.logsEnabled !== false ? '🟢 **Enabled**' : '🔴 **Disabled**',
        inline: true,
      },
      {
        name:   '🎮 Games',
        value:  s.gamesEnabled !== false ? '🟢 **Enabled**' : '🔴 **Disabled**',
        inline: true,
      },
      {
        name:   '💰 Economy',
        value:  s.economyEnabled !== false ? '🟢 **Enabled**' : '🔴 **Disabled**',
        inline: true,
      },
      {
        name:   '📁 Join Log Channel',
        value:  ch.joinLog ? `<#${ch.joinLog}>` : '*Not set*',
        inline: true,
      },
      {
        name:   '🎁 Giveaway Log Channel',
        value:  ch.giveawayLog ? `<#${ch.giveawayLog}>` : '*Not set*',
        inline: true,
      },
      {
        name:   '🌸 Welcome Channel',
        value:  ch.welcome ? `<#${ch.welcome}>` : '*Not set*',
        inline: true,
      },
      {
        name:   '🎮 Game Channel',
        value:  s.gameChannelId ? `<#${s.gameChannelId}>` : '*All channels*',
        inline: true,
      },
    )
    .setFooter({ text: `${config.footer.text} • Changes are saved instantly` })
    .setTimestamp();
}

// ─────────────────────────────────────────────
// SERVER ROWS (butonlar + channel select)
// ─────────────────────────────────────────────
function buildServerRows(guildData) {
  const s = guildData.settings || {};

  // Satır 1: Toggle butonları
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('settings_server_toggle_logs')
      .setLabel(s.logsEnabled !== false ? '🟢 Disable Logs' : '🔴 Enable Logs')
      .setStyle(s.logsEnabled !== false ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('settings_server_toggle_games')
      .setLabel(s.gamesEnabled !== false ? '🎮 Disable Games' : '🎮 Enable Games')
      .setStyle(s.gamesEnabled !== false ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('settings_server_toggle_economy')
      .setLabel(s.economyEnabled !== false ? '💰 Disable Economy' : '💰 Enable Economy')
      .setStyle(s.economyEnabled !== false ? ButtonStyle.Success : ButtonStyle.Danger),
  );

  // Satır 2: Join Log kanal seç
  const row2 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('settings_server_channel_joinlog')
      .setPlaceholder('📋 Select Join Log Channel')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(0)
      .setMaxValues(1),
  );

  // Satır 3: Welcome kanal seç
  const row3 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('settings_server_channel_welcome')
      .setPlaceholder('🌸 Select Welcome Channel')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(0)
      .setMaxValues(1),
  );

  // Satır 4: Giveaway log kanal seç
  const row4 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('settings_server_channel_giveawaylog')
      .setPlaceholder('🎁 Select Giveaway Log Channel')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(0)
      .setMaxValues(1),
  );

  // Satır 5: Game kanal seç
  const row5 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('settings_server_channel_games')
      .setPlaceholder('🎮 Select Game Channel (optional)')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(0)
      .setMaxValues(1),
  );

  return [row1, row2, row3, row4, row5];
}

// ─────────────────────────────────────────────
// PROFILE EMBED
// ─────────────────────────────────────────────
function buildProfileEmbed(user, discordUser) {
  const owned = user.ownedBackgrounds || ['default'];
  const bg    = BACKGROUNDS.find(b => b.id === (user.profileBackground || 'default')) || BACKGROUNDS[0];
  const pinned = (user.pinnedBadges || []).slice(0, 3);

  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`🎨 Profile Settings — ${discordUser.displayName}`)
    .setThumbnail(discordUser.displayAvatarURL({ dynamic: true }))
    .addFields(
      {
        name:   '🖼️ Active Background',
        value:  `${bg.emoji} **${bg.label}**`,
        inline: true,
      },
      {
        name:   '🗂️ Owned Backgrounds',
        value:  `**${owned.length}** / ${BACKGROUNDS.length}`,
        inline: true,
      },
      {
        name:   '🎖️ Pinned Badges',
        value:  pinned.length
          ? pinned.map(b => {
              const opt = BADGE_OPTIONS.find(o => o.id === b);
              return opt ? `${opt.emoji} ${opt.label}` : `🏷️ ${b}`;
            }).join('\n')
          : '*None pinned*',
        inline: false,
      },
      {
        name:   '🏅 All Badges',
        value:  (user.badges || []).length
          ? user.badges.map(b => {
              const opt = BADGE_OPTIONS.find(o => o.id === b);
              return opt ? `${opt.emoji} ${opt.label}` : `🏷️ ${b}`;
            }).join('  ')
          : '*No badges yet*',
        inline: false,
      },
    )
    .setFooter({ text: `${config.footer.text} • Changes are saved instantly` })
    .setTimestamp();
}

// ─────────────────────────────────────────────
// PROFILE ROWS
// ─────────────────────────────────────────────
function buildProfileRows(user) {
  const owned = (user.ownedBackgrounds || ['default']);
  const available = BACKGROUNDS.filter(b => owned.includes(b.id));

  // Satır 1: Arka plan seç
  const bgOptions = available.map(b => ({
    label:   b.label,
    value:   b.id,
    emoji:   b.emoji,
    default: b.id === (user.profileBackground || 'default'),
  }));

  const row1 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('settings_profile_bg')
      .setPlaceholder('🖼️ Change Background')
      .addOptions(bgOptions.length ? bgOptions : [{ label: 'Default', value: 'default', emoji: '🌑', default: true }]),
  );

  // Satır 2: Rozet sabitle (kullanıcının sahip olduğu rozetlerden)
  const userBadges = (user.badges || []);
  if (userBadges.length === 0) {
    // Rozet yoksa sadece arka plan satırı döndür
    return [row1];
  }

  const badgeOpts = userBadges.slice(0, 25).map(b => {
    const opt = BADGE_OPTIONS.find(o => o.id === b);
    return {
      label:   opt ? opt.label : b,
      value:   b,
      emoji:   opt ? opt.emoji : '🏷️',
      default: (user.pinnedBadges || []).includes(b),
    };
  });

  const row2 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('settings_profile_badges')
      .setPlaceholder('🎖️ Pin Badges (max 3)')
      .setMinValues(0)
      .setMaxValues(Math.min(3, badgeOpts.length))
      .addOptions(badgeOpts),
  );

  return [row1, row2];
}

// ─────────────────────────────────────────────
// Dışa aç: embed/row builder'ları button handler'lar kullanır
// ─────────────────────────────────────────────
module.exports.buildServerEmbed  = buildServerEmbed;
module.exports.buildServerRows   = buildServerRows;
module.exports.buildProfileEmbed = buildProfileEmbed;
module.exports.buildProfileRows  = buildProfileRows;
module.exports.BACKGROUNDS       = BACKGROUNDS;
module.exports.BADGE_OPTIONS     = BADGE_OPTIONS;
