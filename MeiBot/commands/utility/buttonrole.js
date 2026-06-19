'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const Guild    = require('../../src/database/Guild');
const embedder = require('../../src/utils/embedder');
const config   = require('../../config.json');

// =============================================
// 🛡️ MODÜL 5 — /buttonrole
// Sunucu sahiplerinin tek komutla oluşturabileceği,
// üyelerin tıklayarak rol alabildiği butonlu menüler.
// =============================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buttonrole')
    .setDescription('🛡️ Create a button role menu!')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s =>
      s.setName('create')
        .setDescription('Create a new button role menu in this channel')
        .addStringOption(o =>
          o.setName('title')
            .setDescription('Title for the role menu embed')
            .setRequired(true)
            .setMaxLength(60)
        )
        .addStringOption(o =>
          o.setName('description')
            .setDescription('Description shown in the embed')
            .setRequired(false)
            .setMaxLength(200)
        )
    )
    .addSubcommand(s =>
      s.setName('add')
        .setDescription('Add a role button to an existing menu')
        .addStringOption(o =>
          o.setName('message_id')
            .setDescription('Message ID of the button role menu')
            .setRequired(true)
        )
        .addRoleOption(o =>
          o.setName('role')
            .setDescription('Role to assign')
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName('label')
            .setDescription('Button label (default: role name)')
            .setRequired(false)
            .setMaxLength(25)
        )
        .addStringOption(o =>
          o.setName('emoji')
            .setDescription('Button emoji (optional)')
            .setRequired(false)
        )
    ),

  cooldown: 5000,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') return handleCreate(interaction, client);
    if (sub === 'add')    return handleAdd(interaction, client);
  },
};

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────
async function handleCreate(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const title       = interaction.options.getString('title');
  const description = interaction.options.getString('description')
    ?? 'Click a button below to add or remove a role!';

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`${config.emojis.ui.paw} ${title}`)
    .setDescription(description + '\n\n*No roles added yet — use `/buttonrole add` to add roles.*')
    .setFooter({ text: config.footer.text })
    .setTimestamp();

  const msg = await interaction.channel.send({ embeds: [embed] });

  // Guild'e kaydet
  const guild = await Guild.findOrCreate(interaction.guild.id, interaction.guild.name);
  if (!Array.isArray(guild.buttonRoleMenus)) guild.buttonRoleMenus = [];
  guild.buttonRoleMenus.push({
    messageId:   msg.id,
    channelId:   interaction.channelId,
    title,
    description,
    roles:       [],
  });
  guild.markModified('buttonRoleMenus');
  await guild.save();

  return interaction.editReply({
    embeds: [
      embedder.success(
        `Button role menu created! Use \`/buttonrole add message_id:${msg.id}\` to add roles.`,
        '✅ Menu Created'
      ),
    ],
  });
}

// ─────────────────────────────────────────────
// ADD ROLE
// ─────────────────────────────────────────────
async function handleAdd(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const messageId = interaction.options.getString('message_id');
  const role      = interaction.options.getRole('role');
  const label     = interaction.options.getString('label') ?? role.name;
  const emoji     = interaction.options.getString('emoji') ?? null;

  // Bot'un bu rolü verebileceğini kontrol et
  const botMember = await interaction.guild.members.fetchMe();
  if (role.position >= botMember.roles.highest.position) {
    return interaction.editReply({
      embeds: [embedder.error(
        `I can't assign **${role.name}** — it's higher than or equal to my highest role. Please move my role above it.`,
        'Permission Error'
      )],
    });
  }

  // @everyone rolü engellensin
  if (role.id === interaction.guild.id) {
    return interaction.editReply({
      embeds: [embedder.error('You cannot use @everyone as a button role.', 'Invalid Role')],
    });
  }

  // Guild verisinden menüyü bul
  const guild = await Guild.findOrCreate(interaction.guild.id, interaction.guild.name);
  const menu   = guild.buttonRoleMenus?.find(m => m.messageId === messageId);

  if (!menu) {
    return interaction.editReply({
      embeds: [embedder.error(
        'Menu not found. Make sure you used the correct message ID and the menu was created with `/buttonrole create`.',
        'Menu Not Found'
      )],
    });
  }

  if (menu.roles.length >= 5) {
    return interaction.editReply({
      embeds: [embedder.warn('A menu can have a maximum of **5** role buttons (Discord limit per row).', 'Limit Reached')],
    });
  }

  if (menu.roles.find(r => r.roleId === role.id)) {
    return interaction.editReply({
      embeds: [embedder.warn(`**${role.name}** is already in this menu.`, 'Already Added')],
    });
  }

  menu.roles.push({ roleId: role.id, label, emoji });
  guild.markModified('buttonRoleMenus');
  await guild.save();

  // Mesajı güncelle
  const channel = await interaction.guild.channels.fetch(menu.channelId).catch(() => null);
  if (!channel) {
    return interaction.editReply({
      embeds: [embedder.error('Could not find the menu channel.', 'Channel Not Found')],
    });
  }

  const msg = await channel.messages.fetch(messageId).catch(() => null);
  if (!msg) {
    return interaction.editReply({
      embeds: [embedder.error('Could not find the menu message.', 'Message Not Found')],
    });
  }

  // Embed'i güncelle
  const roleLines = menu.roles
    .map(r => `${r.emoji ? r.emoji + ' ' : ''}**${r.label}** — <@&${r.roleId}>`)
    .join('\n');

  const updatedEmbed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`${config.emojis.ui.paw} ${menu.title}`)
    .setDescription(`${menu.description}\n\n**Available Roles:**\n${roleLines}`)
    .setFooter({ text: config.footer.text })
    .setTimestamp();

  // Butonları yeniden oluştur
  const buttons = menu.roles.map(r =>
    new ButtonBuilder()
      .setCustomId(`buttonrole_${r.roleId}`)
      .setLabel(r.label)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(r.emoji ? r.emoji : { name: '🐾' })
  );

  const row = new ActionRowBuilder().addComponents(buttons);
  await msg.edit({ embeds: [updatedEmbed], components: [row] });

  return interaction.editReply({
    embeds: [embedder.success(`**${role.name}** has been added to the menu!`, '✅ Role Added')],
  });
}
