'use strict';

const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Guild  = require('../database/Guild');
const config = require('../../config.json');
const { buildWelcomeCard } = require('../canvas/welcomeCard');

// =============================================
// 🛡️ MODÜL 5 — GUILD MEMBER ADD EVENT
// Sunucuya katılan üyelerin kimin davetiyle
// geldiğini tespit eder. Hesap yaşı kontrolü
// yaparak olası fake/bot hesapları işaretler.
// Kedi temalı hoş geldin mesajı gönderir.
// =============================================

// Invite cache: guildId → Map<inviteCode, { uses, inviterId }>
// ready.js'de doldurulur, burada karşılaştırılır.

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,

  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').GuildMember} member
   */
  async execute(client, member) {
    const { guild, user } = member;

    // Guild ayarlarını getir
    const guildData = await Guild.findOne({ guildId: guild.id });
    if (!guildData) return;

    // ── Invite Tespiti ────────────────────────
    let inviterTag   = 'Unknown';
    let inviterId    = null;
    let inviteCode   = 'Unknown';
    let isFake       = false;

    try {
      const newInvites   = await guild.invites.fetch();
      const cachedInvites = client.inviteCache?.get(guild.id) ?? new Map();

      // Hangi invite'ın use sayısı arttı?
      const usedInvite = newInvites.find(inv => {
        const cached = cachedInvites.get(inv.code);
        return cached !== undefined && inv.uses > cached.uses;
      });

      if (usedInvite) {
        inviteCode = usedInvite.code;
        inviterId  = usedInvite.inviterId;
        try {
          const inviter = await client.users.fetch(inviterId);
          inviterTag    = inviter.tag;
        } catch { inviterTag = `ID: ${inviterId}`; }
      }

      // Cache'i güncelle
      const updatedCache = new Map();
      for (const [code, inv] of newInvites) {
        updatedCache.set(code, { uses: inv.uses, inviterId: inv.inviterId });
      }
      if (!client.inviteCache) client.inviteCache = new Map();
      client.inviteCache.set(guild.id, updatedCache);

    } catch {
      // Bot'un manage guild yetkisi yoksa yoksay
    }

    // ── Fake Hesap Tespiti ────────────────────
    const accountAge  = Date.now() - user.createdTimestamp;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const oneDayMs    = 24 * 60 * 60 * 1000;

    if (accountAge < oneDayMs) {
      isFake = true; // 24 saatten yeni hesap → çok şüpheli
    } else if (accountAge < sevenDaysMs) {
      isFake = false; // Uyarı verecek ama engel olmayacak
    }

    const accountAgeStr = formatDuration(accountAge);
    const createdTs     = Math.floor(user.createdTimestamp / 1000);
    const { emojis, colors } = config;
    const ui = emojis.ui;

    // ── Hoş Geldin Mesajı ─────────────────────
    if (guildData.welcomeMessage?.enabled && guildData.channels?.welcome) {
      const welcomeChannel = guild.channels.cache.get(guildData.channels.welcome);
      if (welcomeChannel) {
        // Davet eden kullanıcının avatarını al
        let inviterAvatarURL = null;
        if (inviterId) {
          try {
            const inviterUser = await client.users.fetch(inviterId);
            inviterAvatarURL  = inviterUser.displayAvatarURL({ extension: 'png', size: 64 });
          } catch { /* ignore */ }
        }

        // Canvas kart dene, başarısız olursa embed fallback
        let cardAttachment = null;
        try {
          const buffer = await buildWelcomeCard({
            type:          'welcome',
            avatarURL:     user.displayAvatarURL({ extension: 'png', size: 256 }),
            username:      user.displayName,
            guildName:     guild.name,
            memberCount:   guild.memberCount,
            inviterName:   inviterId ? inviterTag : null,
            inviterAvatar: inviterAvatarURL,
          });
          cardAttachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
        } catch { /* canvas hatası — embed ile devam */ }

        const welcomeText = (guildData.welcomeMessage.template || '')
          .replace('{user}',        `<@${user.id}>`)
          .replace('{guild}',       guild.name)
          .replace('{memberCount}', guild.memberCount.toString())
          .replace('{username}',    user.displayName);

        const welcomeEmbed = new EmbedBuilder()
          .setColor(isFake ? colors.error : colors.primary)
          .setDescription(
            welcomeText ||
            `${ui.flower} **Welcome to ${guild.name}**, <@${user.id}>!\nYou are member **#${guild.memberCount}**.`
          )
          .setFooter({ text: `Member #${guild.memberCount} • ${config.footer.text}` })
          .setTimestamp();

        if (cardAttachment) {
          welcomeEmbed.setImage('attachment://welcome.png');
        } else {
          welcomeEmbed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));
          welcomeEmbed.addFields(
            { name: `${ui.paw} Member`,          value: `${user} (${user.tag})`, inline: true },
            { name: `${ui.star} Account Created`, value: `<t:${createdTs}:D> *(${accountAgeStr} ago)*`, inline: true },
          );
        }

        if (isFake) {
          welcomeEmbed.addFields({
            name:   '⚠️ Suspicious Account',
            value:  'This account was created less than **24 hours ago**. Proceed with caution.',
            inline: false,
          });
        }

        await welcomeChannel.send({
          embeds: [welcomeEmbed],
          files:  cardAttachment ? [cardAttachment] : [],
        }).catch(() => {});
      }
    }

    // ── Join Logger ───────────────────────────
    if (guildData.channels?.joinLog) {
      const logChannel = guild.channels.cache.get(guildData.channels.joinLog);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(isFake ? colors.error : colors.success)
          .setTitle(`${isFake ? '⚠️' : ui.paw} Member Joined`)
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .addFields(
            {
              name:  'User',
              value: `${user} (${user.tag})\nID: \`${user.id}\``,
              inline: true,
            },
            {
              name:  'Account Age',
              value: `${accountAgeStr}\n<t:${createdTs}:D>`,
              inline: true,
            },
            {
              name:  'Invited By',
              value: inviterId
                ? `<@${inviterId}> (${inviterTag})\nCode: \`${inviteCode}\``
                : '*Could not determine invite*',
              inline: false,
            },
            {
              name:  'Server Members',
              value: `**${guild.memberCount}** total`,
              inline: true,
            },
            {
              name:  isFake ? '🚨 FAKE ACCOUNT WARNING' : `${ui.check} Account Status`,
              value: isFake
                ? '**Account under 24 hours old!** Possible bot/raid account.'
                : `Account is **${accountAgeStr}** old — looks fine.`,
              inline: false,
            }
          )
          .setFooter({ text: config.footer.text })
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }
  },
};

// ─────────────────────────────────────────────
// YARDIMCI — ms → okunabilir süre
// ─────────────────────────────────────────────
function formatDuration(ms) {
  const days    = Math.floor(ms / 86_400_000);
  const hours   = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000)  /    60_000);

  if (days > 365)  return `${Math.floor(days / 365)} year(s)`;
  if (days > 30)   return `${Math.floor(days / 30)} month(s)`;
  if (days > 0)    return `${days} day(s)`;
  if (hours > 0)   return `${hours} hour(s)`;
  return `${minutes} minute(s)`;
}
