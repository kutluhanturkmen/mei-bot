'use strict';

const { createCanvas, loadImage } = require('@napi-rs/canvas');

// =============================================
// 🎨 CANVAS — Cafe Card
// 700×280 px — Kafe durumu görsel kartı
// =============================================

const CARD_W = 700;
const CARD_H = 280;
const PINK   = '#FFB7C5';
const DPINK  = '#E8869A';
const GOLD   = '#FFD700';
const WHITE  = '#FFFFFF';
const GREEN  = '#B5EAD7';
const ORANGE = '#FFBE76';
const RED    = '#FF6B6B';

/**
 * @param {object} opts
 * @param {string}  opts.ownerName
 * @param {string}  opts.ownerAvatar
 * @param {string}  opts.cafeName        tier adı
 * @param {number}  opts.cafeLevel       1-5
 * @param {number}  opts.catCount        mevcut kedi sayısı
 * @param {number}  opts.maxCats
 * @param {number}  opts.cleanliness     0-100
 * @param {number}  opts.hourlyIncome    hesaplanan saatlik gelir
 * @param {number}  opts.pendingCoins    birikmiş henüz toplanmamış coin
 * @param {number}  opts.popularity      0-100 (cleanliness * catRatio)
 * @returns {Promise<Buffer>}
 */
async function buildCafeCard(opts) {
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx    = canvas.getContext('2d');

  // ── Arka plan ──────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0,   '#1A1220');
  grad.addColorStop(0.5, '#2A1830');
  grad.addColorStop(1,   '#1A1220');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Dekoratif kafe ikonları
  ctx.globalAlpha = 0.05;
  ctx.font        = '26px sans-serif';
  ctx.textAlign   = 'center';
  ctx.fillStyle   = WHITE;
  for (let x = 50; x < CARD_W; x += 80) {
    for (let y = 30; y < CARD_H; y += 55) {
      ctx.fillText('☕', x, y);
    }
  }
  ctx.globalAlpha = 1;

  // ── Sol panel — sahip avatarı ──────────────
  const AV_X = 65;
  const AV_Y = CARD_H / 2 - 10;
  const AV_R = 48;

  ctx.beginPath();
  ctx.arc(AV_X, AV_Y, AV_R + 4, 0, Math.PI * 2);
  ctx.fillStyle = DPINK;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(AV_X, AV_Y, AV_R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const img = await loadImage(opts.ownerAvatar + '?size=128');
    ctx.drawImage(img, AV_X - AV_R, AV_Y - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    ctx.fillStyle = DPINK;
    ctx.fillRect(AV_X - AV_R, AV_Y - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  // Sahip adı
  ctx.font         = 'bold 13px sans-serif';
  ctx.fillStyle    = PINK;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(truncate(opts.ownerName || 'Owner', 12), AV_X, AV_Y + AV_R + 18);

  // ── Başlık ────────────────────────────────
  const TX = 145;
  let   TY = 38;

  ctx.font      = 'bold 24px sans-serif';
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'left';
  ctx.fillText(`☕ ${truncate(opts.cafeName || 'Cat Café', 24)}`, TX, TY);
  TY += 6;

  // Yıldızlar (level)
  const stars = '⭐'.repeat(opts.cafeLevel || 1) + '☆'.repeat(5 - (opts.cafeLevel || 1));
  ctx.font      = '14px sans-serif';
  ctx.fillStyle = GOLD;
  ctx.fillText(stars, TX, TY + 20);
  TY += 34;

  // Ayırıcı
  ctx.strokeStyle = PINK + '60';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(TX, TY);
  ctx.lineTo(TX + 510, TY);
  ctx.stroke();
  TY += 16;

  // ── Stat barları ──────────────────────────
  const bars = [
    {
      label:   '🐱 Cats',
      value:   opts.catCount || 0,
      max:     opts.maxCats  || 10,
      color:   PINK,
      display: `${opts.catCount}/${opts.maxCats}`,
    },
    {
      label:   '🧹 Cleanliness',
      value:   opts.cleanliness ?? 100,
      max:     100,
      color:   barColor(opts.cleanliness ?? 100),
      display: `${opts.cleanliness ?? 100}%`,
    },
    {
      label:   '✨ Popularity',
      value:   opts.popularity ?? 0,
      max:     100,
      color:   GOLD,
      display: `${opts.popularity ?? 0}%`,
    },
  ];

  const BAR_W   = 340;
  const BAR_H   = 16;

  bars.forEach((bar, i) => {
    const BY = TY + i * 42;

    ctx.font      = '14px sans-serif';
    ctx.fillStyle = PINK;
    ctx.textAlign = 'left';
    ctx.fillText(bar.label, TX, BY);

    ctx.font      = 'bold 14px sans-serif';
    ctx.fillStyle = WHITE;
    ctx.textAlign = 'right';
    ctx.fillText(bar.display, TX + BAR_W, BY);

    // Bar arka planı
    ctx.beginPath();
    roundRect(ctx, TX, BY + 4, BAR_W, BAR_H, 8);
    ctx.fillStyle = '#2D1B3D';
    ctx.fill();

    // Bar dolu kısmı
    const filled = Math.round((BAR_W * bar.value) / bar.max);
    if (filled > 0) {
      ctx.beginPath();
      roundRect(ctx, TX, BY + 4, filled, BAR_H, 8);
      ctx.fillStyle = bar.color;
      ctx.fill();
    }
  });

  // ── Sağ panel — gelir bilgisi ──────────────
  const RX = TX + BAR_W + 40;
  let   RY = TY;

  const incomeItems = [
    { icon: '🪙', label: 'Hourly Income', value: `+${opts.hourlyIncome || 0}` },
    { icon: '💰', label: 'Pending Coins', value: `${opts.pendingCoins || 0}` },
  ];

  incomeItems.forEach((item, i) => {
    const IY = RY + i * 55;

    // Kutu
    ctx.beginPath();
    roundRect(ctx, RX, IY - 18, 145, 44, 10);
    ctx.fillStyle = 'rgba(255,183,197,0.12)';
    ctx.fill();
    ctx.strokeStyle = PINK + '40';
    ctx.lineWidth   = 1;
    ctx.stroke();

    ctx.font      = '18px sans-serif';
    ctx.fillStyle = PINK;
    ctx.textAlign = 'center';
    ctx.fillText(item.icon, RX + 18, IY + 8);

    ctx.font      = '11px sans-serif';
    ctx.fillStyle = PINK + 'CC';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, RX + 32, IY - 2);

    ctx.font      = 'bold 16px sans-serif';
    ctx.fillStyle = WHITE;
    ctx.fillText(item.value, RX + 32, IY + 14);
  });

  // ── Alt çizgi ─────────────────────────────
  ctx.fillStyle = PINK;
  ctx.fillRect(0, CARD_H - 4, CARD_W, 4);

  return canvas.toBuffer('image/png');
}

// ─────────────────────────────────────────────
function barColor(val) {
  if (val >= 70) return GREEN;
  if (val >= 40) return ORANGE;
  return RED;
}

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

module.exports = { buildCafeCard };
