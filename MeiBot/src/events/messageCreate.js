'use strict';

const { Events } = require('discord.js');

// =============================================
// 🌸 MEI BOT — MESSAGE CREATE EVENT
// Make-a-Sentence oyununun kelime girişlerini
// ve GuessNumber tahminlerini dinler.
// =============================================

module.exports = {
  name: Events.MessageCreate,
  once: false,

  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').Message} message
   */
  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)      return; // DM'leri yoksay

    // ── Make-a-Sentence ──────────────────────
    try {
      const mas = require('../../commands/games/makeasentence');
      if (mas.activeGames?.has(message.channel.id)) {
        await mas.handleWord(message, client);
        return; // Make-a-Sentence aktifse diğer handler'ları çalıştırma
      }
    } catch (e) { /* Komut henüz yüklenmemiş olabilir */ }

    // ── Guess Number ─────────────────────────
    try {
      const gn = require('../../commands/games/guessnumber');
      if (gn.activeGames?.has(message.channel.id)) {
        await gn.handleGuess(message, client);
      }
    } catch (e) { /* Komut henüz yüklenmemiş olabilir */ }
  },
};
