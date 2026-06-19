'use strict';

// =============================================
// Shared in-memory store — Giveaway Map
// Her iki taraf (command + button) aynı Map'i kullanır.
// Circular require sorununu ortadan kaldırır.
// =============================================

/** @type {Map<string, import('../types').GiveawayEntry>} */
const activeGiveaways = new Map();

module.exports = { activeGiveaways };
