'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// =============================================
// 🎮 MODÜL 4 — /truthordare
// Tamamen İngilizce, güncel Truth or Dare soruları.
// =============================================

const TRUTHS = [
  "What's the most embarrassing thing you've ever done in public?",
  "What is your biggest fear that you've never told anyone?",
  "Have you ever lied to get out of trouble? What was the lie?",
  "What's the most childish thing you still do?",
  "Who was your first crush and do they know?",
  "What's the most embarrassing thing on your phone right now?",
  "Have you ever sent a text to the wrong person? What did it say?",
  "What's the worst gift you've ever received and who gave it?",
  "What is a secret you've kept from your best friend?",
  "Have you ever pretended to be sick to avoid something? What was it?",
  "What's the most embarrassing thing you've searched online?",
  "What's the pettiest reason you've ever been upset with someone?",
  "Have you ever eaten food that fell on the floor? How long was it there?",
  "What's the longest you've gone without showering?",
  "What's a habit you have that you hope no one notices?",
  "Have you ever blamed something on someone else to avoid trouble?",
  "What show or movie do you secretly love but wouldn't admit?",
  "What's the most embarrassing thing you've done on a date?",
  "What's the last thing you deleted from your camera roll?",
  "Have you ever walked into a glass door or wall?",
];

const DARES = [
  "Send the 10th photo in your camera roll in the chat (no context).",
  "Do your best impression of another server member for 1 minute.",
  "Type the next 3 messages with your eyes closed.",
  "Change your nickname to a word chosen by the group for 10 minutes.",
  "Write a haiku about the person to your left (or the last person who sent a message).",
  "Let the group choose your profile picture for 1 hour.",
  "Send a voice message singing 'Happy Birthday' in full.",
  "React to the last 5 messages in chat with the most random emojis you can find.",
  "Write a formal resignation letter from the server and read it out loud.",
  "Describe your day using only cat emojis.",
  "Type only in questions for the next 5 minutes.",
  "Send a compliment to every person who reacts to this message.",
  "Write a 3-sentence love story using the names of two random server members.",
  "Use only capital letters for the next 3 messages.",
  "Confess something embarrassing in 10 words or less.",
  "Reply to the next message you receive with 'As you wish, my liege.'",
  "Do your best impression of a movie villain for 2 messages.",
  "Start every sentence with 'Contrary to popular belief...' for 5 minutes.",
  "Act as Mei (the bot) and respond to questions for 3 minutes.",
  "Change your status to something chosen by the group for 15 minutes.",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('truthordare')
    .setDescription('🌸 Get a Truth or Dare prompt!')
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Truth or Dare?')
        .setRequired(true)
        .addChoices(
          { name: '🗣️ Truth', value: 'truth' },
          { name: '🎯 Dare',  value: 'dare'  },
          { name: '🎲 Random', value: 'random' },
        )
    ),

  cooldown: 5000,

  async execute(interaction, client) {
    const choice = interaction.options.getString('type');
    const type   = choice === 'random'
      ? (Math.random() < 0.5 ? 'truth' : 'dare')
      : choice;

    const pool   = type === 'truth' ? TRUTHS : DARES;
    const prompt = pool[Math.floor(Math.random() * pool.length)];

    const isTruth = type === 'truth';
    const { colors, emojis } = config;

    const embed = new EmbedBuilder()
      .setColor(isTruth ? colors.info : colors.error)
      .setTitle(isTruth ? '🗣️ Truth!' : '🎯 Dare!')
      .setDescription(`> ${prompt}`)
      .addFields({
        name: `${emojis.ui.paw} Challenged by`,
        value: `**${interaction.user.displayName}**`,
        inline: true,
      })
      .setFooter({ text: `${config.footer.text} • Use /truthordare to get another prompt!` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
