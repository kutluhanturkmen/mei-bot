'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const User     = require('../../src/database/User');
const Cafe     = require('../../src/database/Cafe');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');
const { buildCafeCard } = require('../../src/canvas/cafeCard');

// =============================================
// 💰 MODÜL 2 — /cafe
// Kedi Kafesi Simülasyon Yönetimi
// Subcommands: status | open | clean | collect | buy
// =============================================

// Shop kataloğu
const SHOP = {
  cats: [
    { id: 'tabby',      name: 'Tabby Cat',      emoji: '🐱', rarity: 'common',    price: 500,   incomeBonus: 5  },
    { id: 'siamese',    name: 'Siamese',         emoji: '🐈', rarity: 'uncommon',  price: 1200,  incomeBonus: 12 },
    { id: 'persian',    name: 'Persian',         emoji: '😸', rarity: 'rare',      price: 2500,  incomeBonus: 25 },
    { id: 'maine_coon', name: 'Maine Coon',      emoji: '🦁', rarity: 'epic',      price: 5000,  incomeBonus: 50 },
    { id: 'sphinx',     name: 'Sphinx Cat',      emoji: '🐈‍⬛', rarity: 'legendary', price: 10000, incomeBonus: 100},
  ],
  aromas: [
    { id: 'vanilla',    name: 'Vanilla Latte',   emoji: '☕', price: 300,  revenueBonus: 5  },
    { id: 'lavender',   name: 'Lavender Brew',   emoji: '💜', price: 600,  revenueBonus: 12 },
    { id: 'cherry',     name: 'Cherry Blossom',  emoji: '🌸', price: 900,  revenueBonus: 20 },
  ],
  decorations: [
    { id: 'flowers',    name: 'Flower Pots',     emoji: '🪴', price: 400,  cleanlinessBonus: 1 },
    { id: 'fountain',   name: 'Cat Fountain',    emoji: '⛲', price: 800,  cleanlinessBonus: 2 },
    { id: 'mural',      name: 'Paw Mural',       emoji: '🎨', price: 1500, cleanlinessBonus: 3 },
  ],
};

// Kafe seviye yükseltme maliyetleri
const UPGRADE_COSTS = { 1: 2000, 2: 5000, 3: 10000, 4: 20000 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cafe')
    .setDescription('☕ Manage your Cat Café!')
    .addSubcommand(s => s.setName('status').setDescription('View your café status'))
    .addSubcommand(s => s.setName('open').setDescription('Open or close your café'))
    .addSubcommand(s => s.setName('clean').setDescription(`Clean your café (costs ${config.cafe.cleanCost} coins)`))
    .addSubcommand(s => s.setName('collect').setDescription('Collect your pending passive income'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Upgrade your café to the next level'))
    .addSubcommand(s =>
      s.setName('buy')
        .setDescription('Buy a cat, aroma, or decoration for your café')
        .addStringOption(o =>
          o.setName('category')
            .setDescription('What to buy')
            .setRequired(true)
            .addChoices(
              { name: '🐱 Cat',        value: 'cats'        },
              { name: '☕ Aroma',      value: 'aromas'      },
              { name: '🪴 Decoration', value: 'decorations' }
            )
        )
        .addStringOption(o =>
          o.setName('item_id')
            .setDescription('Item ID to purchase (use /cafe status to see available items)')
            .setRequired(true)
        )
    ),

  cooldown: 3000,

  async execute(interaction, client) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const user   = await User.findOne({ userId });

    if (!user?.isRegistered) {
      return interaction.editReply({
        embeds: [embedder.warn('Register first with </register:0>! 🌸', 'Not Registered')],
      });
    }

    const cafe = await Cafe.findOrCreate(userId);

    // Sunucu premium bilgisi
    let isPremiumGuild = false;
    if (interaction.guild) {
      const guild = await Guild.findOne({ guildId: interaction.guild.id });
      if (guild?.checkPremium()) isPremiumGuild = true;
    }

    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'status':  return handleStatus(interaction, user, cafe, isPremiumGuild);
      case 'open':    return handleOpen(interaction, user, cafe);
      case 'clean':   return handleClean(interaction, user, cafe);
      case 'collect': return handleCollect(interaction, user, cafe, isPremiumGuild);
      case 'upgrade': return handleUpgrade(interaction, user, cafe);
      case 'buy':     return handleBuy(interaction, user, cafe);
    }
  },
};

// ─────────────────────────────────────────────
// STATUS
// ─────────────────────────────────────────────
async function handleStatus(interaction, user, cafe, isPremiumGuild) {
  cafe.applyCleanlinessDecay();
  cafe.accumulateIncome(isPremiumGuild);
  await cafe.save();

  const tier    = cafe.getTier();
  const hourly  = cafe.calculateHourlyIncome(isPremiumGuild);
  const ui      = config.emojis.ui;

  // Popularity: cleanliness * (catCount/maxCats) combined score
  const catRatio   = tier.maxCats > 0 ? cafe.cats.length / tier.maxCats : 0;
  const popularity = Math.round((cafe.cleanliness * 0.6) + (catRatio * 100 * 0.4));

  // ── Canvas Kart ────────────────────────────
  let imageAttachment = null;
  try {
    const buffer = await buildCafeCard({
      ownerName:    user.username || interaction.user.displayName,
      ownerAvatar:  interaction.user.displayAvatarURL({ extension: 'png', size: 128 }),
      cafeName:     cafe.cafeName || tier.name,
      cafeLevel:    cafe.level,
      catCount:     cafe.cats.length,
      maxCats:      tier.maxCats,
      cleanliness:  cafe.cleanliness,
      hourlyIncome: hourly,
      pendingCoins: cafe.pendingIncome,
      popularity,
    });
    imageAttachment = new AttachmentBuilder(buffer, { name: 'cafe.png' });
  } catch {
    // canvas başarısız → embed fallback
  }

  const cleanBar = buildBar(cafe.cleanliness, 100, 12);
  const foodBar  = buildBar(cafe.foodStock,   100, 12);

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`${ui.cafe} ${cafe.cafeName}`)
    .setDescription(
      `*${tier.name}* — Level **${cafe.level}** | Status: ${cafe.isOpen ? '🟢 **Open**' : '🔴 **Closed**'}`
    )
    .addFields(
      {
        name:   `${ui.paw} Cats (${cafe.cats.length}/${tier.maxCats})`,
        value:  cafe.cats.length
          ? cafe.cats.map(c => `${c.emoji} ${c.name}`).join(', ')
          : '*No cats yet — buy one with* `/cafe buy cats`',
        inline: false,
      },
      {
        name:   '🧹 Cleanliness',
        value:  `${cleanBar} **${cafe.cleanliness}%**`,
        inline: true,
      },
      {
        name:   '🐟 Food Stock',
        value:  `${foodBar} **${cafe.foodStock}%**`,
        inline: true,
      },
      {
        name:   `${ui.coin} Hourly Income`,
        value:  `**${hourly.toLocaleString()}** coins/hr${isPremiumGuild ? ' *(x2 boost)*' : ''}`,
        inline: true,
      },
      {
        name:   `${ui.sparkle} Pending Income`,
        value:  `**${cafe.pendingIncome.toLocaleString()}** coins — use \`/cafe collect\``,
        inline: true,
      },
      {
        name:   '☕ Aromas',
        value:  cafe.aromas.length ? cafe.aromas.map(a => `${a.emoji} ${a.name}`).join(', ') : '*None*',
        inline: true,
      },
      {
        name:   '🪴 Decorations',
        value:  cafe.decorations.length ? cafe.decorations.map(d => `${d.emoji} ${d.name}`).join(', ') : '*None*',
        inline: true,
      }
    )
    .setFooter({ text: `Total earned: ${cafe.stats.totalEarned.toLocaleString()} coins • ${config.footer.text}` })
    .setTimestamp();

  if (imageAttachment) embed.setImage('attachment://cafe.png');

  return interaction.editReply({
    embeds: [embed],
    files:  imageAttachment ? [imageAttachment] : [],
  });
}

// ─────────────────────────────────────────────
// OPEN / CLOSE
// ─────────────────────────────────────────────
async function handleOpen(interaction, user, cafe) {
  if (!cafe.isOpen && cafe.cats.length === 0) {
    return interaction.editReply({
      embeds: [embedder.warn('You need at least one cat before opening your café! Use `/cafe buy cats`.', 'No Cats')],
    });
  }

  cafe.isOpen = !cafe.isOpen;
  if (cafe.isOpen) cafe.lastPassiveCollection = new Date();
  await cafe.save();

  const action = cafe.isOpen ? '🟢 opened' : '🔴 closed';
  return interaction.editReply({
    embeds: [embedder.success(`Your café is now **${action}**! ${config.emojis.ui.cafe}`, 'Café Status Updated')],
  });
}

// ─────────────────────────────────────────────
// CLEAN
// ─────────────────────────────────────────────
async function handleClean(interaction, user, cafe) {
  const cost = config.cafe.cleanCost;

  if (cafe.cleanliness >= 100) {
    return interaction.editReply({
      embeds: [embedder.info('Your café is already spotless! ✨', 'Already Clean')],
    });
  }

  if (!user.removeBalance(cost)) {
    return interaction.editReply({
      embeds: [embedder.error(`You need **${cost} coins** to clean the café. Current balance: **${user.balance}**.`, 'Insufficient Funds')],
    });
  }

  cafe.cleanliness             = 100;
  cafe.lastCleanlinessDecay    = new Date();
  cafe.stats.totalCleaned     += 1;
  await Promise.all([user.save(), cafe.save()]);

  return interaction.editReply({
    embeds: [
      embedder.success(
        `Café cleaned to **100%**! ✨\n${config.emojis.ui.coin} Paid **${cost} coins** — New balance: **${user.balance.toLocaleString()}**`,
        '🧹 Café Cleaned!'
      ),
    ],
  });
}

// ─────────────────────────────────────────────
// COLLECT INCOME
// ─────────────────────────────────────────────
async function handleCollect(interaction, user, cafe, isPremiumGuild) {
  cafe.applyCleanlinessDecay();
  cafe.accumulateIncome(isPremiumGuild);

  const amount = cafe.pendingIncome;
  if (amount <= 0) {
    return interaction.editReply({
      embeds: [embedder.info(
        cafe.isOpen
          ? 'No income to collect yet. Come back later! ⏰'
          : 'Your café is closed — open it first with `/cafe open`.',
        'Nothing to Collect'
      )],
    });
  }

  user.addBalance(amount);
  cafe.pendingIncome = 0;
  await Promise.all([user.save(), cafe.save()]);

  return interaction.editReply({
    embeds: [
      embedder.economy(
        `Collected passive income from **${cafe.cafeName}**! ${config.emojis.ui.cafe}`,
        amount,
        user.balance
      ).setTitle(`${config.emojis.ui.coin} Income Collected`),
    ],
  });
}

// ─────────────────────────────────────────────
// UPGRADE
// ─────────────────────────────────────────────
async function handleUpgrade(interaction, user, cafe) {
  if (cafe.level >= 5) {
    return interaction.editReply({
      embeds: [embedder.info('Your café is already at the **maximum level** (5)! 🏆', 'Max Level')],
    });
  }

  const cost = UPGRADE_COSTS[cafe.level];
  const nextTier = config.cafe.tiers.find(t => t.level === cafe.level + 1);

  if (!user.removeBalance(cost)) {
    return interaction.editReply({
      embeds: [embedder.error(
        `You need **${cost.toLocaleString()} coins** to upgrade. Current balance: **${user.balance.toLocaleString()}**.`,
        'Insufficient Funds'
      )],
    });
  }

  cafe.level += 1;
  await Promise.all([user.save(), cafe.save()]);

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.premium)
        .setTitle(`${config.emojis.ui.sparkle} Café Upgraded!`)
        .setDescription(
          `Your café is now **Level ${cafe.level}** — *${nextTier.name}*! 🎉\n\n` +
          `${config.emojis.ui.paw} Max Cats: **${nextTier.maxCats}**\n` +
          `${config.emojis.ui.coin} Base Hourly Income: **${nextTier.passiveIncome}** coins\n` +
          `${config.emojis.ui.coin} Paid: **${cost.toLocaleString()}** coins`
        )
        .setFooter({ text: config.footer.text })
        .setTimestamp(),
    ],
  });
}

// ─────────────────────────────────────────────
// BUY
// ─────────────────────────────────────────────
async function handleBuy(interaction, user, cafe) {
  const category = interaction.options.getString('category');
  const itemId   = interaction.options.getString('item_id').toLowerCase();
  const catalog  = SHOP[category];

  const item = catalog?.find(i => i.id === itemId);
  if (!item) {
    const list = catalog.map(i => `\`${i.id}\` — ${i.emoji} ${i.name} (${i.price} coins)`).join('\n');
    return interaction.editReply({
      embeds: [
        embedder.info(
          `**Available ${category}:**\n${list}`,
          `${config.emojis.ui.sparkle} Shop — ${category}`
        ),
      ],
    });
  }

  // Kedi limiti kontrolü
  if (category === 'cats') {
    if (cafe.cats.length >= cafe.getMaxCats()) {
      return interaction.editReply({
        embeds: [embedder.warn(
          `Your café is full! (${cafe.cats.length}/${cafe.getMaxCats()} cats)\nUpgrade your café with \`/cafe upgrade\` to add more.`,
          'Café Full'
        )],
      });
    }
    // Aynı kedi tekrar alınamaz
    if (cafe.cats.find(c => c.catId === item.id)) {
      return interaction.editReply({
        embeds: [embedder.warn(`You already have a **${item.name}** in your café!`, 'Already Owned')],
      });
    }
  }

  if (!user.removeBalance(item.price)) {
    return interaction.editReply({
      embeds: [embedder.error(
        `You need **${item.price.toLocaleString()} coins**. Balance: **${user.balance.toLocaleString()}**.`,
        'Insufficient Funds'
      )],
    });
  }

  // İlgili diziye ekle
  if (category === 'cats') {
    cafe.cats.push({ catId: item.id, name: item.name, emoji: item.emoji, rarity: item.rarity, incomeBonus: item.incomeBonus });
    cafe.stats.totalCatsBought += 1;
  } else if (category === 'aromas') {
    cafe.aromas.push({ aromaId: item.id, name: item.name, emoji: item.emoji, revenueBonus: item.revenueBonus });
  } else if (category === 'decorations') {
    cafe.decorations.push({ decorId: item.id, name: item.name, emoji: item.emoji, cleanlinessBonus: item.cleanlinessBonus });
  }

  await Promise.all([user.save(), cafe.save()]);

  const rarityColors = { common: config.colors.primary, uncommon: config.colors.success, rare: config.colors.info, epic: '#9B59B6', legendary: config.colors.premium };

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(rarityColors[item.rarity] || config.colors.primary)
        .setTitle(`${item.emoji} Purchase Successful!`)
        .setDescription(
          `**${item.name}** has joined your café! 🎉\n\n` +
          `${config.emojis.ui.coin} Paid: **${item.price.toLocaleString()}** coins\n` +
          `${config.emojis.ui.coin} New balance: **${user.balance.toLocaleString()}**`
        )
        .setFooter({ text: config.footer.text })
        .setTimestamp(),
    ],
  });
}

// ─────────────────────────────────────────────
// YARDIMCI
// ─────────────────────────────────────────────
function buildBar(value, max, length) {
  const filled = Math.round((value / max) * length);
  return `[${'█'.repeat(Math.max(0, filled))}${'░'.repeat(Math.max(0, length - filled))}]`;
}
