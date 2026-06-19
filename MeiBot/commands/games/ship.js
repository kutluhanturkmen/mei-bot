'use strict';

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../../config.json');
const { buildShipCard } = require('../../src/canvas/shipCard');

// =============================================
// 🎮 MODÜL 4 — /ship
// İki üyeyi aşk ölçerle eşleştirir.
// Kedi emojileri ve Lotus Pembesi kalplerle
// şık bir uyum yüzdesi hesaplar.
// =============================================

// Uyum yüzdesine göre mesaj havuzları
const SHIP_MESSAGES = [
  { min: 0,  max: 19,  emoji: '💔', label: 'Incompatible',    messages: [
    'These two cats are hissing at each other from across the room.',
    'Oil and water. Or more accurately — cat and vacuum cleaner.',
    'Mei checked the stars. They said: absolutely not. 😿',
  ]},
  { min: 20, max: 39,  emoji: '🙀', label: 'Unlikely',        messages: [
    'There might be a spark, but it keeps getting knocked off the table.',
    'They once made eye contact. That\'s about it.',
    'Potential exists... somewhere. Deep, deep down.',
  ]},
  { min: 40, max: 59,  emoji: '🐱', label: 'Possible',        messages: [
    'A curious pair — like two cats sniffing each other for the first time.',
    'Not bad! With a little effort, this could bloom into something sweet.',
    'There\'s warmth here. Like a sunny windowsill on a cold day. 🌸',
  ]},
  { min: 60, max: 79,  emoji: '😻', label: 'Great Match',     messages: [
    'These two are like matching cat socks — unexpectedly perfect.',
    'Genuinely good chemistry! Mei approves this pairing. 💞',
    'The vibes? Immaculate. The potential? Enormous. 🌸',
  ]},
  { min: 80, max: 94,  emoji: '💕', label: 'Amazing',         messages: [
    'A truly adorable pair. Mei is shipping this HARD. 🩷',
    'They belong together like catnip and chaos.',
    'Certified couple goals. The café would dedicate a table to them. ☕',
  ]},
  { min: 95, max: 100, emoji: '💖', label: 'Soulmates',       messages: [
    'Fate itself wrote this one. Mei has tears in her eyes. 😭🌸',
    'The universe conspired to bring these two together. Don\'t waste it!',
    'A once-in-a-lifetime match. Frame it. Tattoo it. Believe it. 💖',
  ]},
];

// Lotus Pembesi kalp ölçer oluşturucu
function buildLoveBar(percentage) {
  const length = 12;
  const filled = Math.round((percentage / 100) * length);
  const empty  = length - filled;
  return `${'🩷'.repeat(filled)}${'🤍'.repeat(empty)}`;
}

// Kullanıcı ID çiftinden deterministik yüzde üretir
// (aynı çift her zaman aynı sonucu alır)
function getShipScore(id1, id2) {
  const sorted = [id1, id2].sort().join('');
  let hash = 0;
  for (const char of sorted) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash) % 101; // 0-100
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('🌸 Check the love compatibility between two users!')
    .addUserOption(o =>
      o.setName('user1')
        .setDescription('First person')
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName('user2')
        .setDescription('Second person (leave empty to ship with yourself!)')
        .setRequired(false)
    ),

  cooldown: config.cooldowns.ship,

  async execute(interaction, client) {
    await interaction.deferReply();

    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2') ?? interaction.user;

    // Aynı kişi iki kez seçilirse
    if (user1.id === user2.id) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('💖 Self-Love!')
            .setDescription(
              `**${user1.displayName}** ships themselves, and honestly? Mei respects that. 🌸\n\n` +
              `${buildLoveBar(100)} **100%** — *Flawless self-appreciation.*`
            )
            .setFooter({ text: config.footer.text })
            .setTimestamp(),
        ],
      });
    }

    const percentage = getShipScore(user1.id, user2.id);
    const tier       = SHIP_MESSAGES.find(t => percentage >= t.min && percentage <= t.max);
    const message    = tier.messages[Math.floor(Math.random() * tier.messages.length)];

    // Ship name: her iki ismin ilk yarısı birleştiriliyor
    const name1    = user1.displayName.slice(0, Math.ceil(user1.displayName.length / 2));
    const name2    = user2.displayName.slice(Math.floor(user2.displayName.length / 2));
    const shipName = name1 + name2;

    // ── Canvas Kart ────────────────────────────
    let imageAttachment = null;
    try {
      const buffer = await buildShipCard({
        user1Avatar: user1.displayAvatarURL({ extension: 'png', size: 256 }),
        user1Name:   user1.displayName,
        user2Avatar: user2.displayAvatarURL({ extension: 'png', size: 256 }),
        user2Name:   user2.displayName,
        score:       percentage,
        shipName,
      });
      imageAttachment = new AttachmentBuilder(buffer, { name: 'ship.png' });
    } catch {
      // canvas hatası → embed fallback
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${tier.emoji} Ship Results — ${shipName}`)
      .setDescription(
        [
          `**${user1.displayName}** ${config.emojis.ui.heart} **${user2.displayName}**`,
          ``,
          `**${percentage}%** — *${tier.label}*`,
          ``,
          `> *${message}*`,
        ].join('\n')
      )
      .setFooter({ text: `${config.footer.text} • Results are determined by the stars 🌸` })
      .setTimestamp();

    if (imageAttachment) {
      embed.setImage('attachment://ship.png');
    } else {
      // Fallback: metin barı
      embed.setDescription(
        [
          `**${user1.displayName}** ${config.emojis.ui.heart} **${user2.displayName}**`,
          ``,
          `🏷️ Ship Name: **${shipName}**`,
          `${buildLoveBar(percentage)}`,
          `**${percentage}%** — *${tier.label}*`,
          ``,
          `> *${message}*`,
        ].join('\n')
      );
    }

    return interaction.editReply({
      embeds: [embed],
      files:  imageAttachment ? [imageAttachment] : [],
    });
  },
};
