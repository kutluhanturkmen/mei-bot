'use strict';

const { Events } = require('discord.js');
const logger     = require('../utils/logger');
const embedder   = require('../utils/embedder');
const config     = require('../../config.json');

// =============================================
// 🌸 MEI BOT — INTERACTION CREATE EVENT
// Slash komutları, button'lar ve context menu'ler
// burada yönlendirilir.
// =============================================

module.exports = {
  name: Events.InteractionCreate,
  once: false,

  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(client, interaction) {

    // ── Button Interaction ──────────────────
    if (interaction.isButton()) {
      const { handleButton } = require('../gateway/buttons');
      return handleButton(interaction, client);
    }

    // ── Slash Command ───────────────────────
    if (interaction.isChatInputCommand()) {
      return handleSlashCommand(client, interaction);
    }

    // ── Context Menu ────────────────────────
    if (interaction.isContextMenuCommand()) {
      return handleSlashCommand(client, interaction);
    }
  },
};

// ─────────────────────────────────────────────
// SLASH COMMAND DISPATCHER
// ─────────────────────────────────────────────

/**
 * Slash komutunu bulur, cooldown kontrolü yapar, çalıştırır.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleSlashCommand(client, interaction) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Unknown command: /${interaction.commandName}`);
    return interaction.reply({
      embeds: [embedder.error('This command does not exist or is not loaded.')],
      ephemeral: true,
    }).catch(() => {});
  }

  // ── Cooldown Kontrolü ──────────────────────
  const cooldownResult = checkCooldown(client, interaction, command);
  if (cooldownResult.onCooldown) {
    return interaction.reply({
      embeds: [embedder.cooldown(interaction.commandName, cooldownResult.remaining)],
      ephemeral: true,
    }).catch(() => {});
  }

  // ── Komut Çalıştır ────────────────────────
  try {
    logger.cmd(
      interaction.commandName,
      interaction.user.tag,
      interaction.guild?.name || 'DM'
    );

    await command.execute(interaction, client);
  } catch (err) {
    logger.error(`Command /${interaction.commandName} error: ${err.message}\n${err.stack}`);

    const errorPayload = {
      embeds: [
        embedder.error(
          `An unexpected error occurred while running this command.\n\`\`\`${err.message}\`\`\``,
          'Command Error'
        ),
      ],
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorPayload).catch(() => {});
    } else {
      await interaction.reply(errorPayload).catch(() => {});
    }
  }
}

// ─────────────────────────────────────────────
// COOLDOWN YÖNETİCİSİ
// ─────────────────────────────────────────────

/**
 * Kullanıcının bu komut için cooldown'da olup olmadığını kontrol eder.
 * Premium kullanıcılara %50 indirim uygulanır.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Interaction} interaction
 * @param {{ data: { name: string }, cooldown?: number, execute: Function }} command
 * @returns {{ onCooldown: boolean, remaining: number }}
 */
function checkCooldown(client, interaction, command) {
  // Komuta özel cooldown (saniye) → ms'e çevir
  // Tanımsızsa config'den al, o da yoksa 3 saniye default
  const baseCooldownMs =
    (command.cooldown ?? config.cooldowns[command.data.name] ?? 3000);

  if (!baseCooldownMs || baseCooldownMs <= 0) {
    return { onCooldown: false, remaining: 0 };
  }

  const { cooldowns } = client;
  const cmdName       = command.data.name;

  if (!cooldowns.has(cmdName)) {
    cooldowns.set(cmdName, new Map());
  }

  const timestamps  = cooldowns.get(cmdName);
  const userId      = interaction.user.id;
  const now         = Date.now();

  // Premium kullanıcı kontrolü (client.premiumUsers Set'i dışarıdan doldurulabilir)
  // Basit implementasyon: User modelinden premium flag'i yoksa tam cooldown
  const isPremium   = client.premiumUsers?.has(userId) ?? false;
  const multiplier  = isPremium ? config.premium.cooldownReduction : 1;
  const cooldownMs  = Math.floor(baseCooldownMs * multiplier);

  if (timestamps.has(userId)) {
    const expireTime = timestamps.get(userId) + cooldownMs;
    if (now < expireTime) {
      return { onCooldown: true, remaining: expireTime - now };
    }
  }

  // Cooldown'u ayarla — cooldown süresi geçince otomatik sil
  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownMs);

  return { onCooldown: false, remaining: 0 };
}
