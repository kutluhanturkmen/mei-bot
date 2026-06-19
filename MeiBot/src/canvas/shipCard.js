'use strict';

const { createCanvas, loadImage } = require('@napi-rs/canvas');

// =============================================
// 🎨 CANVAS — Ship Card
// 700×260 px — İki avatar, kalp, yüzde barı
// =============================================

const CARD_W = 700;
const CARD_H = 260;
const PINK   = '#FFB7C5';
const DPINK  = '#E8869A';
const GOLD   = '#FFD700';
const WHITE  = '#FFFFFF';

/**
 * @param {object} opts
 * @param {string} opts.user1Avatar
 * @param {string} opts.user1Name
 * @param {string} opts.user2Avatar
 * @param {string} opts.user2Name
 * @param {number} opts.score        0-100
 * @param {string} opts.shipName     birleşik gemi adı
 * @returns {Promise<Buffer>}
 */
async function buildShipCard(opts) {
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx    = canvas.getContext('2d');

  // ── Arka plan ──────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0,   '#1A1A2E');
  grad.addColorStop(0.5, '#2D1B3D');
  grad.addColorStop(1,   '#1A1A2E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Dekoratif kalp desen
  ctx.globalAlpha = 0.05;
  ctx.fillStyle   = PINK;
  ctx.font        = '28px sans-serif';
  ctx.textAlign   = 'center';
  for (let x = 50; x < CARD_W; x += 90) {
    for (let y = 30; y < CARD_H; y += 55) {
      ctx.fillText('🩷', x, y);
    }
  }
  ctx.globalAlpha = 1;

  // ── Avatar yardımcı ───────────────────────
  async function drawAvatar(url, cx, cy, r, name) {
    // Halo
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = DPINK;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    try {
      const img = await loadImage(url + '?size=128');
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    } catch {
      ctx.fillStyle = DPINK;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = WHITE;
      ctx.font      = `bold ${r}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((name || '?')[0].toUpperCase(), cx, cy);
    }
    ctx.restore();

    // İsim
    ctx.font         = 'bold 16px sans-serif';
    ctx.fillStyle    = WHITE;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(truncate(name || '', 14), cx, cy + r + 22);
  }

  const AV_R  = 65;
  const AV_Y  = 100;
  const LEFT  = 100;
  const RIGHT = CARD_W - 100;

  await drawAvatar(opts.user1Avatar, LEFT,  AV_Y, AV_R, opts.user1Name);
  await drawAvatar(opts.user2Avatar, RIGHT, AV_Y, AV_R, opts.user2Name);

  // ── Orta kalp ────────────────────────────
  const score    = opts.score ?? 50;
  const isBroken = score < 50;
  const CENTER_X = CARD_W / 2;
  const CENTER_Y = AV_Y;

  ctx.font         = '52px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isBroken ? '💔' : '🩷', CENTER_X, CENTER_Y);

  // Yüzde
  ctx.font      = 'bold 22px sans-serif';
  ctx.fillStyle = isBroken ? '#FF6B6B' : PINK;
  ctx.fillText(`${score}%`, CENTER_X, CENTER_Y + 50);

  // ── Gemi adı ─────────────────────────────
  ctx.font      = 'bold 20px sans-serif';
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.fillText(`⚓ ${opts.shipName || 'Ship Name'}`, CENTER_X, CENTER_Y - 55);

  // ── Pati barı ────────────────────────────
  const BAR_Y  = 200;
  const BAR_W  = 400;
  const BAR_H  = 20;
  const BAR_X  = (CARD_W - BAR_W) / 2;
  const FILLED = Math.round((BAR_W * score) / 100);

  // Arka plan
  ctx.beginPath();
  roundRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, 10);
  ctx.fillStyle = '#2D1B3D';
  ctx.fill();

  // Dolu kısım
  if (FILLED > 0) {
    const fillGrad = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W, 0);
    fillGrad.addColorStop(0, DPINK);
    fillGrad.addColorStop(1, PINK);
    ctx.beginPath();
    roundRect(ctx, BAR_X, BAR_Y, FILLED, BAR_H, 10);
    ctx.fillStyle = fillGrad;
    ctx.fill();
  }

  // Pati ikonları üstünde
  ctx.font      = '14px sans-serif';
  ctx.textAlign = 'left';
  const PAWS    = Math.ceil((score / 100) * 8);
  let   pawStr  = '';
  for (let i = 0; i < 8; i++) pawStr += i < PAWS ? '🐾' : '🤍';
  ctx.fillText(pawStr, BAR_X, BAR_Y - 6);

  // ── Alt çizgi ────────────────────────────
  ctx.fillStyle = PINK;
  ctx.fillRect(0, CARD_H - 4, CARD_W, 4);

  return canvas.toBuffer('image/png');
}

// ─────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

module.exports = { buildShipCard };
