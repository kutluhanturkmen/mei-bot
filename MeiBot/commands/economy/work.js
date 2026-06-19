'use strict';

const { SlashCommandBuilder } = require('discord.js');
const User     = require('../../src/database/User');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// 💰 MODÜL 2 — /work
// Saatlik çalışma komutu. Rastgele mesaj + ödül.
// Premium sunucularda 2x ödül.
// =============================================

// Kedi temalı iş mesajları — {amount} placeholder'ı replace edilir
const WORK_MESSAGES = [
  `You knocked a full glass of water off the desk and somehow got paid **{amount}** coins for "testing gravity." 🥛`,
  `You spent 3 hours reorganizing yarn by color. A satisfied customer tipped you **{amount}** coins. 🧶`,
  `You taste-tested 12 different cat food flavors for quality control and earned **{amount}** coins. 😸`,
  `You modeled for a "cats in tiny hats" photoshoot and received **{amount}** coins. 🎩`,
  `You guarded the printer from paper jams for an entire hour. Reward: **{amount}** coins. 🖨️`,
  `You supervised a nap competition and awarded the winner. Payout: **{amount}** coins. 😴`,
  `You delivered an urgent parcel, got distracted by a butterfly, but still arrived in time for **{amount}** coins. 🦋`,
  `You sat in a box all day for "research purposes" and billed **{amount}** coins in consulting fees. 📦`,
  `You chased a laser pointer across 3 departments and accidentally closed a deal worth **{amount}** coins. 🔴`,
  `You wrote a 12-page report on "optimal sunbeam napping zones" and billed **{amount}** coins. ☀️`,
  `You knocked someone's pen off their desk 47 times. They paid you **{amount}** coins just to stop. 🖊️`,
  `You audited the office fish tank and submitted a strongly-worded report. Fee: **{amount}** coins. 🐠`,
  `You worked the café morning shift, knocked over only 2 cups, and earned **{amount}** coins. ☕`,
  `You trained new kittens in the art of judging humans and charged **{amount}** coins per session. 🐱`,
  `You consulted on a major "cardboard box structural integrity" project for **{amount}** coins. 📦`,
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('🌸 Work for Lotus Coins! (1 hour cooldown)'),

  cooldown: 0, // Cooldown DB'de yönetilir

  async execute(interaction, client) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const user   = await User.findOne({ userId });

    if (!user?.isRegistered) {
      return interaction.editReply({
        embeds: [embedder.warn('You need to register first! Use </register:0>. 🌸', 'Not Registered')],
      });
    }

    // Cooldown kontrolü
    const { onCooldown, remaining } = user.getCooldown('lastWork', config.economy.workCooldown);
    if (onCooldown) {
      return interaction.editReply({
        embeds: [embedder.cooldown('work', remaining)],
      });
    }

    // Sunucu Early Supporter çarpanı
    let multiplier = 1;
    if (interaction.guild) {
      const guild = await Guild.findOne({ guildId: interaction.guild.id });
      if (guild?.isEarlySupporter) multiplier = guild.economyMultiplier;
    }

    // Rastgele miktar
    const { workMinAmount, workMaxAmount } = config.economy;
    const baseAmount  = Math.floor(
      Math.random() * (workMaxAmount - workMinAmount + 1) + workMinAmount
    );
    const finalAmount = Math.floor(baseAmount * multiplier);

    user.addBalance(finalAmount);
    user.lastWork = new Date();
    await user.save();

    // Rastgele mesaj seç
    const msg = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)]
      .replace('{amount}', finalAmount.toLocaleString());

    const { emojis, colors } = config;
    const ui = emojis.ui;
    const boosted = multiplier > 1;

    const embed = embedder.economy(
      `Work shift completed!${boosted ? ' *(x2 Early Supporter boost!)* 🌟' : ''}`,
      finalAmount,
      user.balance
    );

    embed.setTitle(`${ui.sparkle} Work Complete`);
    embed.setDescription(
      msg + (boosted ? `\n\n✨ *Your server's Early Supporter boost doubled the payout!*` : '')
    );
    embed.setFooter({ text: `⏰ Next shift available in 1 hour • ${config.footer.text}` });

    return interaction.editReply({ embeds: [embed] });
  },
};
