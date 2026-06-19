'use strict';

const { createCanvas, loadImage } = require('@napi-rs/canvas');

// =============================================
// 🎨 CANVAS — Welcome / Leave Card
// 900×280 px — Kedi kulaklı, Lotus pembe tema
// =============================================

const CARD_W = 900;
const CARD_H = 280;
const PINK   = '#FFB7C5';
const DPINK  = '#E8869A';
const GOLD   = '#FFD700';
const WHITE  = '#FFFFFF';
const GREEN  = '#B5EAD7';

/**
 * @param {object} opts
 * @param {'welcome'|'leave'} opts.type
 * @param {string}  opts.avatarURL
 * @param {string}  opts.username
 * @param {string}  opts.guildName
 * @param {number}  opts.memberCount
 * @param {string|null} opts.inviterName   - sadece welcome için
 * @param {string|null} opts.inviterAvatar - sadece welcome için
 * @returns {Promise<Buffer>}
 */
async function buildWelcomeCard(opts) {
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx    = canvas.getContext('2d');

  const isWelcome = opts.type !== 'leave';

  // ── Arka plan ──────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  if (isWelcome) {
    grad.addColorStop(0,   '#1A1A2E');
    grad.addColorStop(0.6, '#2D1B3D');
    grad.addColorStop(1,   '#1A1A2E');
  } else {
    grad.addColorStop(0,   '#1A1A2E');
    grad.addColorStop(0.6, '#2A2030');
    grad.addColorStop(1,   '#1A1A2E');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Dekoratif pati/çiçek deseni
  ctx.globalAlpha = 0.04;
  ctx.fillStyle   = PINK;
  ctx.font        = '24px sans-serif';
  ctx.textAlign   = 'center';
  for (let x = 50; x < CARD_W; x += 75) {
    for (let y = 30; y < CARD_H; y += 55) {
      ctx.fillText(isWelcome ? '🌸' : '🍂', x, y);
    }
  }
  ctx.globalAlpha = 1;

  // ── Sol şerit (renk çubuğu) ───────────────
  const stripColor = isWelcome ? PINK : '#9B8AAB';
  ctx.fillStyle = stripColor;
  ctx.fillRect(0, 0, 6, CARD_H);

  // ── Avatar alanı ──────────────────────────
  const AV_X = 120;
  const AV_Y = CARD_H / 2;
  const AV_R = 75;

  // Kedi kulakları (üçgenler)
  const earColor = isWelcome ? DPINK : '#7B6A8B';
  drawCatEar(ctx, AV_X - AV_R * 0.55, AV_Y - AV_R * 0.85, earColor, 'left');
  drawCatEar(ctx, AV_X + AV_R * 0.55, AV_Y - AV_R * 0.85, earColor, 'right');

  // Avatar halkası
  ctx.beginPath();
  ctx.arc(AV_X, AV_Y, AV_R + 6, 0, Math.PI * 2);
  ctx.fillStyle = isWelcome ? PINK : '#7B6A8B';
  ctx.fill();

  // Yuvarlak avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(AV_X, AV_Y, AV_R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const img = await loadImage(opts.avatarURL + '?size=256');
    ctx.drawImage(img, AV_X - AV_R, AV_Y - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    ctx.fillStyle = DPINK;
    ctx.fillRect(AV_X - AV_R, AV_Y - AV_R, AV_R * 2, AV_R * 2);
    ctx.fillStyle    = WHITE;
    ctx.font         = `bold ${AV_R}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((opts.username || '?')[0].toUpperCase(), AV_X, AV_Y);
  }
  ctx.restore();

  // ── Metin alanı ───────────────────────────
  const TX = 235;
  let   TY = 68;

  // Başlık
  ctx.font         = 'bold 38px sans-serif';
  ctx.fillStyle    = isWelcome ? PINK : '#C4A9D4';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(isWelcome ? '🌸 Welcome!' : '🍂 Goodbye...', TX, TY);
  TY += 46;

  // Kullanıcı adı
  ctx.font      = 'bold 26px sans-serif';
  ctx.fillStyle = WHITE;
  ctx.fillText(truncate(opts.username || 'User', 28), TX, TY);
  TY += 36;

  // Sunucu adı + üye sayısı
  ctx.font      = '18px sans-serif';
  ctx.fillStyle = PINK + 'CC';
  if (isWelcome) {
    ctx.fillText(
      `You are member #${(opts.memberCount || 0).toLocaleString()} of ${truncate(opts.guildName || 'the server', 24)}`,
      TX, TY
    );
  } else {
    ctx.fillText(
      `${truncate(opts.guildName || 'the server', 24)} now has ${(opts.memberCount || 0).toLocaleString()} members.`,
      TX, TY
    );
  }
  TY += 32;

  // Davet eden (sadece welcome)
  if (isWelcome && opts.inviterName) {
    // Küçük davet eden avatarı
    const IV_X = TX;
    const IV_Y = TY + 8;
    const IV_R = 18;

    ctx.beginPath();
    ctx.arc(IV_X + IV_R, IV_Y, IV_R + 2, 0, Math.PI * 2);
    ctx.fillStyle = DPINK;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(IV_X + IV_R, IV_Y, IV_R, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (opts.inviterAvatar) {
      try {
        const invImg = await loadImage(opts.inviterAvatar + '?size=64');
        ctx.drawImage(invImg, IV_X, IV_Y - IV_R, IV_R * 2, IV_R * 2);
      } catch {
        ctx.fillStyle = DPINK;
        ctx.fillRect(IV_X, IV_Y - IV_R, IV_R * 2, IV_R * 2);
      }
    } else {
      ctx.fillStyle = DPINK;
      ctx.fillRect(IV_X, IV_Y - IV_R, IV_R * 2, IV_R * 2);
    }
    ctx.restore();

    ctx.font         = '15px sans-serif';
    ctx.fillStyle    = GREEN;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Invited by ${truncate(opts.inviterName, 20)}`, IV_X + IV_R * 2 + 8, IV_Y);
  }

  // ── Sağ süsleme ───────────────────────────
  ctx.font         = '64px sans-serif';
  ctx.fillStyle    = isWelcome ? PINK : '#9B8AAB';
  ctx.globalAlpha  = 0.12;
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(isWelcome ? '🌸' : '🍂', CARD_W - 30, CARD_H / 2);
  ctx.globalAlpha  = 1;

  // ── Alt ve üst kenarlık ───────────────────
  ctx.fillStyle = isWelcome ? PINK : '#7B6A8B';
  ctx.fillRect(0, 0, CARD_W, 4);
  ctx.fillRect(0, CARD_H - 4, CARD_W, 4);

  return canvas.toBuffer('image/png');
}

// ─────────────────────────────────────────────
// Kedi kulağı çizen yardımcı
// ─────────────────────────────────────────────
function drawCatEar(ctx, cx, cy, color, side) {
  const size = 28;
  ctx.beginPath();
  if (side === 'left') {
    ctx.moveTo(cx - size, cy + size);
    ctx.lineTo(cx,        cy - size);
    ctx.lineTo(cx + size, cy + size);
  } else {
    ctx.moveTo(cx - size, cy + size);
    ctx.lineTo(cx,        cy - size);
    ctx.lineTo(cx + size, cy + size);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // İç kulak
  ctx.beginPath();
  const ir = size * 0.5;
  if (side === 'left') {
    ctx.moveTo(cx - ir, cy + ir);
    ctx.lineTo(cx,      cy - ir * 0.8);
    ctx.lineTo(cx + ir, cy + ir);
  } else {
    ctx.moveTo(cx - ir, cy + ir);
    ctx.lineTo(cx,      cy - ir * 0.8);
    ctx.lineTo(cx + ir, cy + ir);
  }
  ctx.closePath();
  ctx.fillStyle = '#FF9BB5';
  ctx.fill();
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

module.exports = { buildWelcomeCard };
