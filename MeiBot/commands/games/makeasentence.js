'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// 🎮 MODÜL 4 — /makeasentence
// Üyeler sırayla tek kelime yazarak devasa bir
// cümle/hikaye oluşturur. Mei kuralları bozanları uyarır.
// =============================================

// Aktif oyunlar: channelId → { words, lastUserId, messageId, timeout, count }
const activeGames = new Map();

const MAX_WORDS    = 50;   // Cümle bu uzunluğa ulaşınca oyun biter
const WORD_TIMEOUT = 60_000; // 60 saniye içinde kelime gelmezse oyun biter
const MAX_WORD_LEN = 30;   // Tek kelimenin max karakter uzunluğu

module.exports = {
  data: new SlashCommandBuilder()
    .setName('makeasentence')
    .setDescription('🌸 Start a "Make a Sentence" game — take turns adding one word!')
    .addSubcommand(s =>
      s.setName('start')
        .setDescription('Start a new Make-a-Sentence game in this channel')
    )
    .addSubcommand(s =>
      s.setName('stop')
        .setDescription('Stop the current Make-a-Sentence game')
    ),

  cooldown: 5000,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'start') return handleStart(interaction, client);
    if (sub === 'stop')  return handleStop(interaction, client);
  },

  // messageCreate event'inden çağrılır
  handleWord,
  activeGames,
};

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
async function handleStart(interaction, client) {
  const channelId = interaction.channelId;

  if (activeGames.has(channelId)) {
    return interaction.reply({
      embeds: [embedder.warn('There\'s already an active game in this channel! Add your word or use `/makeasentence stop`.', 'Game Active')],
      ephemeral: true,
    });
  }

  const gameData = {
    words:      [],
    lastUserId: null,
    hostId:     interaction.user.id,
    timeout:    null,
    count:      0,
  };

  activeGames.set(channelId, gameData);

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`${config.emojis.ui.sparkle} Make-a-Sentence Game Started!`)
    .setDescription(
      `Build a sentence together — one word at a time! 🌸\n\n` +
      `**Rules:**\n` +
      `${config.emojis.ui.dot} Type **one word only** in this channel\n` +
      `${config.emojis.ui.dot} You **cannot** go twice in a row\n` +
      `${config.emojis.ui.dot} No numbers, links, or gibberish\n` +
      `${config.emojis.ui.dot} Game ends at **${MAX_WORDS} words** or after **60s** of silence\n\n` +
      `*Started by **${interaction.user.displayName}**. Go ahead — first word!*`
    )
    .setFooter({ text: config.footer.text })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Timeout başlat
  resetTimeout(channelId, client, interaction.channel);
}

// ─────────────────────────────────────────────
// STOP
// ─────────────────────────────────────────────
async function handleStop(interaction, client) {
  const channelId = interaction.channelId;
  const game      = activeGames.get(channelId);

  if (!game) {
    return interaction.reply({
      embeds: [embedder.warn('No active game in this channel.', 'No Game')],
      ephemeral: true,
    });
  }

  // Host veya admin durdurabilir
  const isAdmin = interaction.memberPermissions?.has('ManageMessages');
  if (game.hostId !== interaction.user.id && !isAdmin) {
    return interaction.reply({
      embeds: [embedder.error('Only the game host or a moderator can stop the game.', 'Permission Denied')],
      ephemeral: true,
    });
  }

  clearTimeout(game.timeout);
  activeGames.delete(channelId);

  const sentence = game.words.join(' ') || '*No words were added.*';
  await interaction.reply({
    embeds: [buildResultEmbed(sentence, game.words.length, '🛑 Game Stopped')],
  });
}

// ─────────────────────────────────────────────
// WORD HANDLER (messageCreate'den çağrılır)
// ─────────────────────────────────────────────
async function handleWord(message, client) {
  if (message.author.bot) return;
  const channelId = message.channel.id;
  const game      = activeGames.get(channelId);
  if (!game) return;

  const content = message.content.trim();

  // Kuralları kontrol et
  const violation = checkViolation(content, message.author.id, game);

  if (violation) {
    // Tatlı uyarı
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${config.emojis.ui.warning} *Mei gently taps you with a paw...* **${violation}**`),
      ],
    }).catch(() => {});

    // Kuralları bozan mesajı sil (opsiyonel, izin varsa)
    await message.delete().catch(() => {});
    return;
  }

  // Kelimeyi ekle
  game.words.push(content);
  game.lastUserId = message.author.id;
  game.count++;

  // Timeout'u sıfırla
  resetTimeout(channelId, client, message.channel);

  // Her 10 kelimede bir ilerleme göster
  if (game.count % 10 === 0 && game.count > 0) {
    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setDescription(
            `📖 **${game.count} words so far:**\n*${game.words.join(' ')}...*`
          ),
      ],
    }).catch(() => {});
  }

  // Maksimum kelimeye ulaşıldı
  if (game.words.length >= MAX_WORDS) {
    clearTimeout(game.timeout);
    activeGames.delete(channelId);
    const sentence = game.words.join(' ');
    await message.channel.send({
      embeds: [buildResultEmbed(sentence, game.words.length, '✨ Sentence Complete!')],
    }).catch(() => {});
  }
}

// ─────────────────────────────────────────────
// YARDIMCILAR
// ─────────────────────────────────────────────

function checkViolation(content, userId, game) {
  if (content.split(/\s+/).length > 1)
    return 'One word at a time, please! 🐾';
  if (userId === game.lastUserId)
    return 'Wait for someone else to go before you again! 😸';
  if (content.length > MAX_WORD_LEN)
    return `That word is too long! (max ${MAX_WORD_LEN} characters) 😅`;
  if (/https?:\/\/|discord\.gg/i.test(content))
    return 'No links allowed! 🚫';
  if (/^\d+$/.test(content))
    return 'Words only — no numbers! 🔢';
  if (/[^\w'-]/i.test(content))
    return 'Use plain words only (letters, apostrophes, hyphens)! ✍️';
  return null;
}

function resetTimeout(channelId, client, channel) {
  const game = activeGames.get(channelId);
  if (!game) return;

  clearTimeout(game.timeout);
  game.timeout = setTimeout(async () => {
    const g = activeGames.get(channelId);
    if (!g) return;
    activeGames.delete(channelId);
    const sentence = g.words.join(' ') || '*Nobody added a word.*';
    await channel.send({
      embeds: [buildResultEmbed(sentence, g.words.length, '⏰ Game Timed Out')],
    }).catch(() => {});
  }, WORD_TIMEOUT);
}

function buildResultEmbed(sentence, wordCount, title) {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`${config.emojis.ui.flower} ${title}`)
    .setDescription(
      `**The final sentence (${wordCount} words):**\n\n> *${sentence}*`
    )
    .setFooter({ text: config.footer.text })
    .setTimestamp();
}
