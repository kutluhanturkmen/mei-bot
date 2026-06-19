'use strict';

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

// =============================================
// 🌸 MEI BOT — CENTRALIZED EMBED ENGINE
// Her komutta tekrar tekrar embed yazmak yerine
// bu sınıfın metotları kullanılır.
// Kullanım: client.embeds.success(interaction, "Başarılı!")
// =============================================

class Embedder {
  constructor() {
    this.colors  = config.colors;
    this.footer  = config.footer;
    this.emojis  = config.emojis.ui;
  }

  // ─────────────────────────────────────────────
  // TEMEL YARDIMCI — Tüm embed'lerin ortak tabanı
  // ─────────────────────────────────────────────

  /**
   * Temel embed oluşturur; renk ve footer her embede otomatik eklenir.
   * @param {string} color  - Hex renk kodu
   * @returns {EmbedBuilder}
   */
  _base(color = this.colors.primary) {
    return new EmbedBuilder()
      .setColor(color)
      .setFooter({
        text: this.footer.text,
        iconURL: this.footer.iconURL || undefined,
      })
      .setTimestamp();
  }

  // ─────────────────────────────────────────────
  // DURUM EMBEDLERİ
  // ─────────────────────────────────────────────

  /**
   * Başarı embed'i. Yeşilimsi (#B5EAD7) renkte.
   * @param {string} description
   * @param {string} [title]
   * @returns {EmbedBuilder}
   */
  success(description, title = null) {
    const embed = this._base(this.colors.success)
      .setDescription(`${this.emojis.check} ${description}`);
    if (title) embed.setTitle(title);
    return embed;
  }

  /**
   * Hata embed'i. Kırmızı (#FF6B6B) renkte.
   * @param {string} description
   * @param {string} [title]
   * @returns {EmbedBuilder}
   */
  error(description, title = 'Something went wrong!') {
    return this._base(this.colors.error)
      .setTitle(`${this.emojis.cross} ${title}`)
      .setDescription(description);
  }

  /**
   * Uyarı embed'i. Sarı (#FFEAA7) renkte.
   * @param {string} description
   * @param {string} [title]
   * @returns {EmbedBuilder}
   */
  warn(description, title = 'Hold on!') {
    return this._base(this.colors.warning)
      .setTitle(`${this.emojis.warning} ${title}`)
      .setDescription(description);
  }

  /**
   * Bilgi embed'i. Mavi (#AED9E0) renkte.
   * @param {string} description
   * @param {string} [title]
   * @returns {EmbedBuilder}
   */
  info(description, title = null) {
    const embed = this._base(this.colors.info)
      .setDescription(description);
    if (title) embed.setTitle(title);
    return embed;
  }

  // ─────────────────────────────────────────────
  // TEMA EMBEDLERİ
  // ─────────────────────────────────────────────

  /**
   * Ana Lotus Pembesi temalı embed.
   * Profil, café, oyun ekranları için kullanılır.
   * @param {string} title
   * @param {string} description
   * @returns {EmbedBuilder}
   */
  primary(title, description) {
    return this._base(this.colors.primary)
      .setTitle(`${this.emojis.flower} ${title}`)
      .setDescription(description);
  }

  /**
   * Premium altın renkli embed.
   * @param {string} title
   * @param {string} description
   * @returns {EmbedBuilder}
   */
  premium(title, description) {
    return this._base(this.colors.premium)
      .setTitle(`${this.emojis.premium} ${title}`)
      .setDescription(description);
  }

  // ─────────────────────────────────────────────
  // ÖZEL AMAÇLI EMBEDLERİ
  // ─────────────────────────────────────────────

  /**
   * Cooldown (bekleme süresi) embed'i.
   * @param {string} commandName - Komut adı
   * @param {number} remainingMs  - Kalan süre (ms)
   * @returns {EmbedBuilder}
   */
  cooldown(commandName, remainingMs) {
    const seconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs    = seconds % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;

    return this._base(this.colors.warning)
      .setTitle(`${this.emojis.warning} Slow down, little paw!`)
      .setDescription(
        `You can use **/${commandName}** again in **${timeStr}**.\n` +
        `💎 *Mei's Club members enjoy 50% reduced cooldowns!*`
      );
  }

  /**
   * Economy işlem embed'i (para kazanma/harcama).
   * @param {string} action      - İşlem açıklaması
   * @param {number} amount      - Miktar
   * @param {number} newBalance  - Yeni bakiye
   * @returns {EmbedBuilder}
   */
  economy(action, amount, newBalance) {
    return this._base(this.colors.primary)
      .setTitle(`${this.emojis.coin} Transaction`)
      .addFields(
        { name: 'Action',      value: action,               inline: true },
        { name: 'Amount',      value: `${this.emojis.coin} **${amount.toLocaleString()}**`,       inline: true },
        { name: 'New Balance', value: `${this.emojis.coin} **${newBalance.toLocaleString()}**`,   inline: true },
      );
  }

  /**
   * Leaderboard embed'i.
   * @param {string} title
   * @param {{ rank: number, username: string, value: string|number }[]} entries
   * @returns {EmbedBuilder}
   */
  leaderboard(title, entries) {
    const medals = ['🥇', '🥈', '🥉'];
    const description = entries
      .map((e, i) => {
        const medal = medals[i] || `**${e.rank}.**`;
        return `${medal} **${e.username}** — ${e.value}`;
      })
      .join('\n');

    return this._base(this.colors.primary)
      .setTitle(`${this.emojis.trophy} ${title}`)
      .setDescription(description || '*No entries yet.*');
  }

  /**
   * Direkt interaction'a ephemeral hata yanıtı gönderir.
   * (Kolaylık wrapper'ı — await client.embeds.replyError(...) şeklinde kullanılır)
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {string} description
   * @param {boolean} [ephemeral=true]
   */
  async replyError(interaction, description, ephemeral = true) {
    const embed = this.error(description);
    const payload = { embeds: [embed], ephemeral };

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(payload);
    }
    return interaction.reply(payload);
  }

  /**
   * Direkt interaction'a success yanıtı gönderir.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {string} description
   * @param {boolean} [ephemeral=false]
   */
  async replySuccess(interaction, description, ephemeral = false) {
    const embed = this.success(description);
    const payload = { embeds: [embed], ephemeral };

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(payload);
    }
    return interaction.reply(payload);
  }
}

module.exports = new Embedder();
