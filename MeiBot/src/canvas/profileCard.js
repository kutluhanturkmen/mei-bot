'use strict';

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// =============================================
// 🎨 CANVAS — Profile Card
// 800×300 px, kedi temalı Lotus pembe tasarım
// =============================================

const CARD_W  = 800;
const CARD_H  = 300;
const PINK    = '#FFB7C5';
const DPINK   = '#E8869A';
const GOLD    = '#FFD700';
const WHITE   = '#FFFFFF';
const DARK    = '#1A1A2E';
const SEMI    = 'rgba(15,15,30,0.65)';

/**
 * Kullanıcı profil kartı üretir.
 * @param {object} opts
 * @param {string}  opts.avatarURL   - Discord CDN avatar URL (png/webp)
 * @param {string}  opts.username    - Kullanıcı adı
 * @param {number}  opts.balance     - Lotus Coin miktarı
 * @param {number}  opts.cafeLevel   - Kafe tier seviyesi (1-5)
 * @param {string}  opts.cafeName    - Kafe tier adı
 * @param {boolean} opts.isPremium   - Premium rozeti gösterilsin mi
 * @param {string[]} opts.badges     - Rozet etiketleri dizisi
 * @param {string|null} opts.spouseAvatarURL - Evli olunan kişinin avatar URL
 * @param {string|null} opts.spouseName      - Evli olunan kişinin adı
 * @param {number}  opts.catfightWins
 * @param {number}  opts.triviaCorrect
 * @returns {Promise<Buffer>} PNG buffer
 */
async function buildProfileCard(opts) {
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx    = canvas.getContext('2d');

  // ── Arka plan ──────────────────────────────
  const bg = await loadImage(opts.backgroundURL || null).catch(() => null);
  if (bg) {
    ctx.drawImage(bg, 0, 0, CARD_W, CARD_H);
    // Üstüne hafif koyu overlay
    ctx.fillStyle = 'rgba(10,10,25,0.55)';
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  } else {
    // Gradient arka plan
    const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    grad.addColorStop(0,   '#1A1A2E');
    grad.addColorStop(0.5, '#2D1B3D');
    grad.addColorStop(1,   '#1A1A2E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Kedi pati desen (dekoratif)
    ctx.globalAlpha = 0.06;
    ctx.fillStyle   = PINK;
    for (let x = 40; x < CARD_W; x += 80) {
      for (let y = 30; y < CARD_H; y += 60) {
        drawPaw(ctx, x, y, 14);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Sol panel — avatar ─────────────────────
  const AVATAR_X = 60;
  const AVATAR_Y = CARD_H / 2;
  const AVATAR_R = 65;

  // Avatar çerçeve halkası
  ctx.beginPath();
  ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R + 5, 0, Math.PI * 2);
  ctx.fillStyle = opts.isPremium ? GOLD : PINK;
  ctx.fill();

  // Yuvarlak avatar kırpma
  ctx.save();
  ctx.beginPath();
  ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadImage(opts.avatarURL + '?size=128');
    ctx.drawImage(avatar, AVATAR_X - AVATAR_R, AVATAR_Y - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
  } catch {
    ctx.fillStyle = DPINK;
    ctx.fillRect(AVATAR_X - AVATAR_R, AVATAR_Y - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((opts.username || '?')[0].toUpperCase(), AVATAR_X, AVATAR_Y);
  }
  ctx.restore();

  // Premium taç
  if (opts.isPremium) {
    ctx.font      = 'bold 20px sans-serif';
    ctx.fillStyle = GOLD;
    ctx.textAlign = 'center';
    ctx.fillText('💎', AVATAR_X, AVATAR_Y - AVATAR_R - 10);
  }

  // ── Orta panel — bilgiler ──────────────────
  const INFO_X = 160;
  let   INFO_Y = 55;

  // Kullanıcı adı
  ctx.font      = 'bold 28px sans-serif';
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'left';
  ctx.fillText(truncate(opts.username || 'Unknown', 22), INFO_X, INFO_Y);
  INFO_Y += 38;

  // Rozet satırı
  const badgeLine = buildBadgeLine(opts.badges || [], opts.isPremium);
  if (badgeLine) {
    ctx.font      = '18px sans-serif';
    ctx.fillStyle = GOLD;
    ctx.fillText(badgeLine, INFO_X, INFO_Y);
    INFO_Y += 28;
  }

  // Ayırıcı çizgi
  ctx.strokeStyle = PINK + '80';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(INFO_X, INFO_Y);
  ctx.lineTo(INFO_X + 500, INFO_Y);
  ctx.stroke();
  INFO_Y += 18;

  // İstatistik satırları
  const stats = [
    { icon: '🪙', label: 'Lotus Coins',    value: (opts.balance || 0).toLocaleString() },
    { icon: '☕', label: `Café (${opts.cafeName || 'Lv.1'})`, value: `Level ${opts.cafeLevel || 1}` },
    { icon: '⚔️', label: 'Catfight Wins',  value: String(opts.catfightWins || 0) },
    { icon: '🎯', label: 'Trivia Correct', value: String(opts.triviaCorrect || 0) },
  ];

  // 2 sütun, 2 satır
  const COL_W = 260;
  stats.forEach((s, i) => {
    const cx = INFO_X + (i % 2) * COL_W;
    const cy = INFO_Y + Math.floor(i / 2) * 36;

    ctx.font      = '15px sans-serif';
    ctx.fillStyle = PINK;
    ctx.fillText(`${s.icon} ${s.label}`, cx, cy);

    ctx.font      = 'bold 15px sans-serif';
    ctx.fillStyle = WHITE;
    ctx.fillText(s.value, cx + 180, cy);
  });

  // ── Sağ panel — evlilik durumu ─────────────
  if (opts.spouseAvatarURL && opts.spouseName) {
    const SP_X = CARD_W - 70;
    const SP_Y = CARD_H / 2 - 20;
    const SP_R = 32;

    ctx.font      = '13px sans-serif';
    ctx.fillStyle = PINK;
    ctx.textAlign = 'center';
    ctx.fillText('💍 Married to', SP_X, SP_Y - SP_R - 22);

    ctx.beginPath();
    ctx.arc(SP_X, SP_Y, SP_R + 3, 0, Math.PI * 2);
    ctx.fillStyle = DPINK;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(SP_X, SP_Y, SP_R, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    try {
      const spImg = await loadImage(opts.spouseAvatarURL + '?size=64');
      ctx.drawImage(spImg, SP_X - SP_R, SP_Y - SP_R, SP_R * 2, SP_R * 2);
    } catch {
      ctx.fillStyle = DPINK;
      ctx.fillRect(SP_X - SP_R, SP_Y - SP_R, SP_R * 2, SP_R * 2);
    }
    ctx.restore();

    ctx.font      = 'bold 13px sans-serif';
    ctx.fillStyle = WHITE;
    ctx.textAlign = 'center';
    ctx.fillText(truncate(opts.spouseName, 12), SP_X, SP_Y + SP_R + 16);
  }

  // ── Alt bant — ince pembe çizgi ────────────
  ctx.fillStyle = PINK;
  ctx.fillRect(0, CARD_H - 4, CARD_W, 4);

  return canvas.toBuffer('image/png');
}

// ─────────────────────────────────────────────
// Yardımcılar
// ─────────────────────────────────────────────

/** Kedi pati şekli (dekoratif, küçük) */
function drawPaw(ctx, x, y, r) {
  // Ana yastık
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.6, r * 0.7, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // 3 parmak yastığı
  const toes = [[-r * 0.6, 0], [0, -r * 0.5], [r * 0.6, 0]];
  for (const [tx, ty] of toes) {
    ctx.beginPath();
    ctx.ellipse(x + tx, y + ty, r * 0.3, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function buildBadgeLine(badges, isPremium) {
  const all = [];
  if (isPremium) all.push('💎 Premium');
  all.push(...badges.slice(0, 3));
  return all.join('  •  ');
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

module.exports = { buildProfileCard };
