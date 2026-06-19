'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const User     = require('../../src/database/User');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// ⚔️ MODÜL 3 — /catfight
// Kedi temalı Açlık Oyunları simülasyonu.
// Subcommands: create | leaderboard (leaderboard ayrı dosyada)
// =============================================

// Aktif lobiler: guildId → { hostId, players: Set, messageId, channelId, started }
const activeLobbies = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('catfight')
    .setDescription('⚔️ Start a Catfight Games lobby!')
    .addSubcommand(s =>
      s.setName('create')
        .setDescription('Create a new Catfight Games lobby in this channel')
    )
    .addSubcommand(s =>
      s.setName('cancel')
        .setDescription('Cancel your active Catfight lobby')
    ),

  cooldown: 10000,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') return handleCreate(interaction, client);
    if (sub === 'cancel') return handleCancel(interaction, client);
  },

  activeLobbies,
};

// ─────────────────────────────────────────────
// CREATE LOBBY
// ─────────────────────────────────────────────
async function handleCreate(interaction, client) {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    return interaction.reply({
      embeds: [embedder.error('Catfight Games can only be played in a server!', 'Server Only')],
      ephemeral: true,
    });
  }

  // Zaten aktif lobi var mı?
  if (activeLobbies.has(guildId)) {
    return interaction.reply({
      embeds: [embedder.warn('There is already an active Catfight lobby in this server! Wait for it to finish.', 'Lobby Active')],
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  const { minPlayers, maxPlayers, lobbyTimeout } = config.catfight;
  const { emojis, colors } = config;
  const ui = emojis.ui;

  // Lobi oluştur
  const lobbyData = {
    hostId:    interaction.user.id,
    hostName:  interaction.user.displayName,
    players:   new Map(), // userId → { username, avatarURL }
    channelId: interaction.channelId,
    messageId: null,
    started:   false,
    guildId,
  };

  // Host'u otomatik ekle
  lobbyData.players.set(interaction.user.id, {
    username:  interaction.user.displayName,
    userId:    interaction.user.id,
  });

  activeLobbies.set(guildId, lobbyData);

  const embed = buildLobbyEmbed(lobbyData, minPlayers, maxPlayers, ui, colors);
  const row   = buildLobbyButtons();

  const msg = await interaction.editReply({ embeds: [embed], components: [row] });
  lobbyData.messageId = msg.id;

  // Lobi timeout — kimse katılmazsa iptal
  const lobbyTimer = setTimeout(async () => {
    const lobby = activeLobbies.get(guildId);
    if (!lobby || lobby.started) return;

    activeLobbies.delete(guildId);
    const expEmbed = new EmbedBuilder()
      .setColor(colors.error)
      .setTitle('⚔️ Catfight Lobby Expired')
      .setDescription(`The lobby timed out — not enough players joined (minimum ${minPlayers}).`)
      .setTimestamp();

    await msg.edit({ embeds: [expEmbed], components: [] }).catch(() => {});
  }, lobbyTimeout);

  lobbyData.timer = lobbyTimer;
}

// ─────────────────────────────────────────────
// CANCEL
// ─────────────────────────────────────────────
async function handleCancel(interaction, client) {
  const guildId = interaction.guild?.id;
  const lobby   = activeLobbies.get(guildId);

  if (!lobby) {
    return interaction.reply({
      embeds: [embedder.warn('No active Catfight lobby in this server.', 'No Lobby')],
      ephemeral: true,
    });
  }

  if (lobby.hostId !== interaction.user.id) {
    return interaction.reply({
      embeds: [embedder.error('Only the lobby host can cancel the game.', 'Permission Denied')],
      ephemeral: true,
    });
  }

  clearTimeout(lobby.timer);
  activeLobbies.delete(guildId);

  const channel = interaction.guild.channels.cache.get(lobby.channelId);
  if (channel && lobby.messageId) {
    const msg = await channel.messages.fetch(lobby.messageId).catch(() => null);
    if (msg) {
      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('⚔️ Catfight Cancelled')
            .setDescription(`The lobby was cancelled by **${interaction.user.displayName}**.`)
            .setTimestamp(),
        ],
        components: [],
      }).catch(() => {});
    }
  }

  return interaction.reply({
    embeds: [embedder.success('Catfight lobby cancelled.', 'Lobby Cancelled')],
    ephemeral: true,
  });
}

// ─────────────────────────────────────────────
// GAME SIMULATION
// ─────────────────────────────────────────────

/**
 * Oyunu başlatır ve simülasyonu çalıştırır.
 * Button handler'dan çağrılır.
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {import('discord.js').TextChannel} channel
 * @param {object} lobby
 */
async function startGame(client, guildId, channel, lobby) {
  lobby.started = true;
  clearTimeout(lobby.timer);

  // getCatfightMessages() → Early Supporter sunucularda özel mesajlar, diğerlerinde varsayılan
  const guild      = await Guild.findOne({ guildId }).catch(() => null);
  const messages   = guild?.getCatfightMessages() ?? config.catfight.eliminationMessages;
  const winMsgs    = config.catfight.winMessages;
  const { roundInterval } = config.catfight;

  let players = [...lobby.players.values()]; // { userId, username }

  // Başlangıç embed'i
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('⚔️ The Catfight Games Begin!')
        .setDescription(
          `**${players.length} contestants** enter the arena!\n\n` +
          players.map(p => `${config.emojis.ui.paw} **${p.username}**`).join('\n')
        )
        .setFooter({ text: '🌸 May the best cat win!' })
        .setTimestamp(),
    ],
  }).catch(() => {});

  // Simülasyon döngüsü
  const runRound = async () => {
    if (players.length <= 1) {
      // Oyun bitti
      activeLobbies.delete(guildId);
      const winner = players[0];

      // Kazanan istatistiklerini güncelle
      if (winner) {
        await User.findOneAndUpdate(
          { userId: winner.userId },
          { $inc: { 'catfightStats.wins': 1, 'catfightStats.totalGames': 1 } }
        ).catch(() => {});
      }

      const winMsg = winMsgs[Math.floor(Math.random() * winMsgs.length)]
        .replace('{winner}', winner ? `**${winner.username}**` : '**Nobody**');

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.premium)
            .setTitle('🏆 Catfight Games — WINNER!')
            .setDescription(winMsg)
            .setTimestamp(),
        ],
      }).catch(() => {});
      return;
    }

    // Rastgele bir oyuncu elenir
    const elimIdx    = Math.floor(Math.random() * players.length);
    const eliminated = players.splice(elimIdx, 1)[0];

    // Elenme mesajı
    const rawMsg = messages[Math.floor(Math.random() * messages.length)];
    const elimMsg = rawMsg.replace('{player}', `**${eliminated.username}**`);

    // İstatistik güncelle
    await User.findOneAndUpdate(
      { userId: eliminated.userId },
      { $inc: { 'catfightStats.losses': 1, 'catfightStats.totalGames': 1 } }
    ).catch(() => {});

    // Hayatta kalan oyuncular listeye iç çekime katkıda bulunur
    for (const survivor of players) {
      await User.findOneAndUpdate(
        { userId: survivor.userId },
        { $inc: { 'catfightStats.killCount': 1 } }
      ).catch(() => {});
    }

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(`💥 ${elimMsg}`)
          .addFields({
            name: `${config.emojis.ui.paw} Remaining (${players.length})`,
            value: players.map(p => `• ${p.username}`).join('\n') || '*None*',
          })
          .setTimestamp(),
      ],
    }).catch(() => {});

    // Sonraki tur
    setTimeout(runRound, roundInterval);
  };

  // İlk turu başlat
  setTimeout(runRound, roundInterval);
}

// ─────────────────────────────────────────────
// YARDIMCILAR
// ─────────────────────────────────────────────

function buildLobbyEmbed(lobby, minPlayers, maxPlayers, ui, colors) {
  const playerList = [...lobby.players.values()]
    .map(p => `${ui.paw} **${p.username}**`)
    .join('\n') || '*Waiting for players...*';

  return new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('⚔️ Catfight Games — Lobby Open!')
    .setDescription(
      `**Host:** ${lobby.hostName}\n\n` +
      `Click **Join** to enter the arena!\n` +
      `Minimum **${minPlayers}** players required. Maximum **${maxPlayers}**.\n\n` +
      `**Contestants:**\n${playerList}`
    )
    .addFields(
      { name: 'Players', value: `${lobby.players.size}/${maxPlayers}`, inline: true },
      { name: 'Status',  value: '⏳ Waiting',                          inline: true },
    )
    .setFooter({ text: `${config.footer.text} • Lobby expires in 2 minutes if not started` })
    .setTimestamp();
}

function buildLobbyButtons(disableStart = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('catfight_join')
      .setLabel('⚔️ Join')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('catfight_leave')
      .setLabel('🚪 Leave')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('catfight_start')
      .setLabel('▶️ Start Game')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disableStart),
  );
}

module.exports.startGame       = startGame;
module.exports.buildLobbyEmbed = buildLobbyEmbed;
module.exports.buildLobbyButtons = buildLobbyButtons;
