'use strict';

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const User     = require('../../src/database/User');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// 💰 MODÜL 2 — /trivia
// İngilizce genel kültür sorusu sorar.
// Button'larla cevap alınır, doğruysa coin ödülü verilir.
// =============================================

// Soru havuzu — genişletilebilir
const QUESTIONS = [
  { question: 'What is the capital of Japan?',                      options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'],          answer: 2 },
  { question: 'How many sides does a hexagon have?',                options: ['5', '6', '7', '8'],                              answer: 1 },
  { question: 'Which planet is known as the Red Planet?',           options: ['Venus', 'Jupiter', 'Saturn', 'Mars'],            answer: 3 },
  { question: 'What is the chemical symbol for water?',             options: ['CO2', 'O2', 'H2O', 'NaCl'],                     answer: 2 },
  { question: 'Who wrote "Romeo and Juliet"?',                      options: ['Dickens', 'Shakespeare', 'Austen', 'Twain'],     answer: 1 },
  { question: 'What is the largest ocean on Earth?',                options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],       answer: 3 },
  { question: 'How many bones are in the adult human body?',        options: ['196', '206', '216', '226'],                      answer: 1 },
  { question: 'What language has the most native speakers?',        options: ['English', 'Spanish', 'Mandarin', 'Hindi'],       answer: 2 },
  { question: 'Which element has the atomic number 1?',             options: ['Helium', 'Oxygen', 'Hydrogen', 'Carbon'],        answer: 2 },
  { question: 'In which year did World War II end?',                options: ['1943', '1944', '1945', '1946'],                  answer: 2 },
  { question: 'What is the smallest country in the world?',         options: ['Monaco', 'San Marino', 'Vatican City', 'Liechtenstein'], answer: 2 },
  { question: 'Which animal is the fastest on land?',               options: ['Lion', 'Cheetah', 'Horse', 'Greyhound'],         answer: 1 },
  { question: 'How many continents are on Earth?',                  options: ['5', '6', '7', '8'],                              answer: 2 },
  { question: 'What is the longest river in the world?',            options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'],      answer: 1 },
  { question: 'Which gas do plants absorb from the atmosphere?',    options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Helium'], answer: 2 },
  { question: 'Who painted the Mona Lisa?',                         options: ['Raphael', 'Michelangelo', 'Da Vinci', 'Monet'],  answer: 2 },
  { question: 'What is the hardest natural substance on Earth?',    options: ['Gold', 'Iron', 'Diamond', 'Quartz'],             answer: 2 },
  { question: 'How many strings does a standard guitar have?',      options: ['4', '5', '6', '7'],                              answer: 2 },
  { question: 'What is the currency of the United Kingdom?',        options: ['Euro', 'Dollar', 'Pound Sterling', 'Franc'],     answer: 2 },
  { question: 'Which planet is closest to the Sun?',                options: ['Venus', 'Earth', 'Mercury', 'Mars'],             answer: 2 },
  { question: 'What is the tallest mountain in the world?',         options: ['K2', 'Kangchenjunga', 'Everest', 'Lhotse'],      answer: 2 },
  { question: 'How many players are on a standard soccer team?',    options: ['9', '10', '11', '12'],                           answer: 2 },
  { question: 'Which organ pumps blood through the human body?',    options: ['Liver', 'Kidney', 'Brain', 'Heart'],             answer: 3 },
  { question: 'What is the freezing point of water in Celsius?',    options: ['-10', '-5', '0', '5'],                          answer: 2 },
  { question: 'Which country is home to the kangaroo?',             options: ['New Zealand', 'South Africa', 'Australia', 'Brazil'], answer: 2 },
];

// Aktif trivia oturumları (userId → { correctIndex, timeout })
const activeSessions = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('🌸 Answer a trivia question and earn Lotus Coins!'),

  cooldown: 0, // Cooldown DB'de yönetilir

  async execute(interaction, client) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const user   = await User.findOne({ userId });

    if (!user?.isRegistered) {
      return interaction.editReply({
        embeds: [embedder.warn('Register first! Use </register:0>. 🌸', 'Not Registered')],
      });
    }

    // Cooldown kontrolü
    const { onCooldown, remaining } = user.getCooldown('lastTrivia', config.economy.triviaCooldown);
    if (onCooldown) {
      return interaction.editReply({
        embeds: [embedder.cooldown('trivia', remaining)],
      });
    }

    // Aktif soru kontrolü
    if (activeSessions.has(userId)) {
      return interaction.editReply({
        embeds: [embedder.warn('You already have an active trivia question! Answer it first.', 'Active Question')],
      });
    }

    // Sunucu premium çarpanı
    let multiplier = 1;
    if (interaction.guild) {
      const guild = await Guild.findOne({ guildId: interaction.guild.id });
      if (guild?.checkPremium()) multiplier = guild.economyMultiplier;
    }

    // Rastgele soru seç
    const q     = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const reward = Math.floor(config.economy.triviaReward * multiplier);

    // Button'ları oluştur
    const labels = ['A', 'B', 'C', 'D'];
    const row = new ActionRowBuilder().addComponents(
      q.options.map((opt, i) =>
        new ButtonBuilder()
          .setCustomId(`trivia_${userId}_${i}`)
          .setLabel(`${labels[i]}. ${opt}`)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    const { emojis, colors } = config;

    const embed = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle(`${emojis.ui.sparkle} Trivia Time!`)
      .setDescription(
        `**${q.question}**\n\n` +
        q.options.map((opt, i) => `**${labels[i]}.** ${opt}`).join('\n') +
        `\n\n${emojis.ui.coin} Reward: **${reward.toLocaleString()} Lotus Coins** for a correct answer!\n` +
        `⏰ You have **30 seconds** to answer.`
      )
      .setFooter({ text: config.footer.text })
      .setTimestamp();

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    // Oturumu kaydet
    const timeout = setTimeout(async () => {
      activeSessions.delete(userId);
      const expiredEmbed = new EmbedBuilder()
        .setColor(colors.error)
        .setTitle(`⏰ Time's Up!`)
        .setDescription(
          `You ran out of time!\nThe correct answer was **${labels[q.answer]}. ${q.options[q.answer]}**.`
        )
        .setFooter({ text: config.footer.text });

      await msg.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
    }, 30_000);

    activeSessions.set(userId, {
      correctIndex: q.answer,
      options:      q.options,
      reward,
      multiplier,
      timeout,
      messageId: msg.id,
    });
  },
};

// ── Button Handler (trivia_userId_optionIndex) ──
// Bu modülün button'ları buttons/ handler yerine burada
// interactionCreate'den çağrılmak üzere export ediliyor.
// Ancak mimari gereği ayrı button dosyasına taşındı:
// src/buttons/trivia.js aşağıda oluşturulacak.

module.exports.activeSessions = activeSessions;
