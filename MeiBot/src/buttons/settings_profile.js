'use strict';

const User     = require('../database/User');
const embedder = require('../utils/embedder');
const config   = require('../../config.json');
const {
  buildProfileEmbed,
  buildProfileRows,
  BACKGROUNDS,
} = require('../../commands/utility/settings');

// =============================================
// ⚙️ SETTINGS — PROFILE BUTTON/SELECT HANDLER
// customId prefix: settings_profile_
// =============================================

module.exports = {
  customIdPrefix: 'settings_profile_',

  async execute(interaction, client) {
    const id = interaction.customId;

    await interaction.deferUpdate();

    const user = await User.findOne({ userId: interaction.user.id });

    if (!user?.isRegistered) {
      return interaction.followUp({
        embeds: [embedder.warn('Register first with </register:0>!', 'Not Registered')],
        ephemeral: true,
      });
    }

    // ── ARKA PLAN DEĞİŞTİR ───────────────────
    if (id === 'settings_profile_bg') {
      const selected = interaction.values[0];
      const owned    = user.ownedBackgrounds || ['default'];

      if (!owned.includes(selected)) {
        return interaction.followUp({
          embeds: [embedder.error(
            `You don't own the **${BACKGROUNDS.find(b => b.id === selected)?.label || selected}** background.\nPurchase it from the shop first!`,
            'Not Owned'
          )],
          ephemeral: true,
        });
      }

      user.profileBackground = selected;
      await user.save();

      const bg = BACKGROUNDS.find(b => b.id === selected) || BACKGROUNDS[0];
      await interaction.followUp({
        embeds: [embedder.success(`Background changed to **${bg.emoji} ${bg.label}**!`, 'Background Updated')],
        ephemeral: true,
      }).catch(() => {});

      const embed = buildProfileEmbed(user, interaction.user);
      const rows  = buildProfileRows(user);
      return interaction.editReply({ embeds: [embed], components: rows }).catch(() => {});
    }

    // ── ROZET SABİTLE ─────────────────────────
    if (id === 'settings_profile_badges') {
      const selected = interaction.values; // max 3

      // Sadece sahip olunan rozetleri kabul et
      const validBadges = selected.filter(b => (user.badges || []).includes(b));

      user.pinnedBadges = validBadges.slice(0, 3);
      await user.save();

      await interaction.followUp({
        embeds: [embedder.success(
          validBadges.length
            ? `Pinned **${validBadges.length}** badge(s) to your profile!`
            : `Cleared pinned badges.`,
          'Badges Updated'
        )],
        ephemeral: true,
      }).catch(() => {});

      const embed = buildProfileEmbed(user, interaction.user);
      const rows  = buildProfileRows(user);
      return interaction.editReply({ embeds: [embed], components: rows }).catch(() => {});
    }
  },
};
