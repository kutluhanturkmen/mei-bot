'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User     = require('../../src/database/User');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// 🎮 MODÜL 4 — /guessnumber
// Mei 1-100 arası sayı tutar. Üyeler tahmin eder.
// "Higher!" / "Lower!" yönlendirmesi yapar.
// Bilene coin ödülü verilir.
// =============================================

// Aktif oyunlar: channelId → { number, attempts, hostId, timeout, reward }
const activeGames = new Map();

const GUESS_TIMEOUT = 120_000; // 2 dakika
const BASE_REWARD   = 200;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guessnumber')
    .setDescription('🌸 Guess the number Mei is thinking of! (1-100)')
    .addSubcommand(s =>
      s.setName('start').setDescription('Start a new Guess-the-Number game')
    )
    .addSubcommand(s =>
      s.setName('stop').setDescription('Stop the current game in this channel')
    ),

  cooldown: config.cooldowns.guessnumber,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'start') return handleStart(interaction, client);
    if (sub === 'stop')  return handleStop(interaction);
  },

  handleGuess,
  activeGames,
};

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
async function handleStart(interaction, client) {
  const channelId = interaction.channelId;

  if (activeGames.has(channelId)) {
    return interaction.reply({
      embeds: [embedder.warn('There\'s already an active game! Try to guess the number.', 'Game Active')],
      ephemeral: true,
    });
  }

  // Sunucu premium çarpanı
  let multiplier = 1;
  if (interaction.guild) {
    const guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (guild?.checkPremium()) multiplier = guild.economyMultiplier;
  }

  const number = Math.floor(Math.random() * 100) + 1;
  const reward = Math.floor(BASE_REWARD * multiplier);

  const gameData = {
    number,
    attempts:  0,
    hostId:    interaction.user.id,
    reward,
    timeout:   null,
    channelId,
  };

  activeGames.set(channelId, gameData);

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`${config.emojis.ui.sparkle} Guess My Number!`)
    .setDescription(
      `I'm thinking of a number between **1** and **100**... 🐱\n\n` +
      `Type your guess in the chat!\n` +
      `${config.emojis.ui.coin} First to guess correctly wins **${reward.toLocaleString()} Lotus Coins**!\n\n` +
      `*Game expires in 2 minutes.*`
    )
    .setFooter({ text: config.footer.text })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Timeout
  gameData.timeout = setTimeout(async () => {
    const g = activeGames.get(channelId);
    if (!g) return;
    activeGames.delete(channelId);

    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('⏰ Time\'s Up!')
          .setDescription(`Nobody guessed correctly! The number was **${g.number}**. Better luck next time! 😿`)
          .setTimestamp(),
      ],
    }).catch(() => {});
  }, GUESS_TIMEOUT);
}

// ─────────────────────────────────────────────
// STOP
// ─────────────────────────────────────────────
async function handleStop(interaction) {
  const channelId = interaction.channelId;
  const game      = activeGames.get(channelId);

  if (!game) {
    return interaction.reply({
      embeds: [embedder.warn('No active game in this channel.', 'No Game')],
      ephemeral: true,
    });
  }

  const isAdmin = interaction.memberPermissions?.has('ManageMessages');
  if (game.hostId !== interaction.user.id && !isAdmin) {
    return interaction.reply({
      embeds: [embedder.error('Only the game host or a moderator can stop the game.', 'Permission Denied')],
      ephemeral: true,
    });
  }

  clearTimeout(game.timeout);
  activeGames.delete(channelId);

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🛑 Game Stopped')
        .setDescription(`The number was **${game.number}**. Game cancelled after **${game.attempts}** attempt(s).`)
        .setTimestamp(),
    ],
  });
}

// ─────────────────────────────────────────────
// GUESS HANDLER (messageCreate'den çağrılır)
// ─────────────────────────────────────────────
async function handleGuess(message, client) {
  const channelId = message.channel.id;
  const game      = activeGames.get(channelId);
  if (!game) return;

  const guess = parseInt(message.content.trim(), 10);
  if (isNaN(guess) || guess < 1 || guess > 100) return; // Sayı değilse yoksay

  game.attempts++;

  if (guess === game.number) {
    // Doğru tahmin!
    clearTimeout(game.timeout);
    activeGames.delete(channelId);

    // Ödülü ver
    const user = await User.findOne({ userId: message.author.id });
    if (user?.isRegistered) {
      user.addBalance(game.reward);
      await user.save();
    }

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.premium)
          .setTitle('🎉 Correct!')
          .setDescription(
            `**${message.author.displayName}** guessed it! The number was **${game.number}**! 🐱\n\n` +
            `${config.emojis.ui.coin} **+${game.reward.toLocaleString()} Lotus Coins** awarded!\n` +
            `📊 Total attempts: **${game.attempts}**`
          )
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setTimestamp(),
      ],
    }).catch(() => {});

  } else {
    // Yanlış tahmin — yönlendir
    const hint = guess < game.number ? '📈 Higher!' : '📉 Lower!';
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${hint} *(Attempt #${game.attempts})*`),
      ],
    }).catch(() => {});
  }
}
