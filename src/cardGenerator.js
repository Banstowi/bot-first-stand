const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

const W = 900;
const H = 440;
const LOGO_PATH = path.join(__dirname, '..', 'logo.png');

// ─── helpers ────────────────────────────────────────────────────────────────

async function tryLoadImage(url) {
  if (!url) return null;
  try { return await loadImage(url); } catch { return null; }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
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

/** Draw an image or a placeholder clipped to a circle */
function drawCircleImage(ctx, img, cx, cy, r, placeholderText = '?') {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = '#1e1e3a';
    ctx.fill();
    ctx.fillStyle = '#4a4a7a';
    ctx.font = `bold ${Math.round(r * 0.7)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(placeholderText, cx, cy);
  }

  ctx.restore();

  // Border ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#3a3a6a';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

function formatDate(date) {
  if (!date) return '⏳ Date à définir';
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });
}

// ─── card layout constants ───────────────────────────────────────────────────
//
//  [0 ────── 64]  HEADER   : tournament logo + name + round
//  [64 ───── 72]  gap
//  [72 ────────]  LOGOS    : team logos + VS  (logo radius = 80, center Y = 72+80 = 152)
//  [           ]  NAMES    : team names        (Y = 152+80+30 = 262)
//  [280 ──── 281] SEPARATOR
//  [290 ──── 440] FOOTER   : date + twitch link

const HEADER_H    = 64;
const LOGO_R      = 82;          // logo radius
const LOGO_CY     = HEADER_H + 16 + LOGO_R;   // = 162
const TEAM1_CX    = 170;
const TEAM2_CX    = W - 170;
const CENTER_CX   = W / 2;
const NAME_Y      = LOGO_CY + LOGO_R + 32;    // = 276
const POINTS_Y    = NAME_Y + 26;              // = 302  (points line under team name)
const SEP_Y       = POINTS_Y + 18;            // = 320
const FOOTER_CY   = SEP_Y + (H - SEP_Y) / 2; // vertically centered in footer

// ─── main export ─────────────────────────────────────────────────────────────

async function generateMatchCard(match) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Load images
  const [team1Img, team2Img, tournamentImg] = await Promise.all([
    tryLoadImage(match.team1_logo),
    tryLoadImage(match.team2_logo),
    fs.existsSync(LOGO_PATH) ? loadImage(LOGO_PATH).catch(() => null) : Promise.resolve(null),
  ]);

  // ── Background ──────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#0b0b1f');
  bg.addColorStop(0.5, '#111130');
  bg.addColorStop(1,   '#0b0b1f');
  ctx.fillStyle = bg;
  roundedRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  // ── Header strip ────────────────────────────────────────────────────────
  const headerBg = ctx.createLinearGradient(0, 0, W, 0);
  headerBg.addColorStop(0,   'rgba(30,30,80,0.9)');
  headerBg.addColorStop(0.5, 'rgba(40,40,100,0.9)');
  headerBg.addColorStop(1,   'rgba(30,30,80,0.9)');
  ctx.fillStyle = headerBg;
  roundedRect(ctx, 0, 0, W, HEADER_H, 20);
  ctx.fill();
  // extend bottom of header rect to hide bottom rounded corners
  ctx.fillRect(0, HEADER_H - 20, W, 20);

  // Tournament logo in header
  const TLOGO_R = 22;
  const TLOGO_CX = 36;
  const TLOGO_CY = HEADER_H / 2;
  drawCircleImage(ctx, tournamentImg, TLOGO_CX, TLOGO_CY, TLOGO_R, 'T');

  // Tournament name + round in header
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if (match.tournament_name) {
    ctx.fillStyle = '#e0e0ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(truncate(match.tournament_name, 40), TLOGO_CX + TLOGO_R + 12, TLOGO_CY - 9);
  }
  if (match.round_name) {
    ctx.fillStyle = '#8888bb';
    ctx.font = '14px sans-serif';
    ctx.fillText(match.round_name.toUpperCase(), TLOGO_CX + TLOGO_R + 12, TLOGO_CY + 12);
  }

  // Match ID (top-right, discreet)
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6666aa';
  ctx.font = '13px sans-serif';
  ctx.fillText(`#${match.id}`, W - 16, HEADER_H / 2);

  // ── Team logos ──────────────────────────────────────────────────────────
  drawCircleImage(ctx, team1Img, TEAM1_CX, LOGO_CY, LOGO_R);
  drawCircleImage(ctx, team2Img, TEAM2_CX, LOGO_CY, LOGO_R);

  // ── VS ──────────────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('VS', CENTER_CX, LOGO_CY);

  // ── Team names ──────────────────────────────────────────────────────────
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 22px sans-serif';

  // Team 1
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dde0ff';
  ctx.fillText(truncate(match.team1_name, 18), TEAM1_CX, NAME_Y);

  // Team 2
  ctx.fillText(truncate(match.team2_name, 18), TEAM2_CX, NAME_Y);

  // ── Points ───────────────────────────────────────────────────────────────
  if (match.team1_points != null || match.team2_points != null) {
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#f0c040';
    if (match.team1_points != null) {
      ctx.fillText(`${match.team1_points} pts`, TEAM1_CX, POINTS_Y);
    }
    if (match.team2_points != null) {
      ctx.fillText(`${match.team2_points} pts`, TEAM2_CX, POINTS_Y);
    }
  }

  // ── Separator ────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#2a2a55';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, SEP_Y);
  ctx.lineTo(W - 40, SEP_Y);
  ctx.stroke();

  // ── Footer ───────────────────────────────────────────────────────────────
  ctx.textBaseline = 'middle';

  // Date (left)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9999bb';
  ctx.font = '16px sans-serif';
  ctx.fillText('  ' + formatDate(match.match_date), 40, FOOTER_CY);

  // Twitch link (right)
  if (match.twitch_link) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9146ff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(match.twitch_link, W - 40, FOOTER_CY);
  }

  ctx.textBaseline = 'alphabetic';

  return canvas.toBuffer('image/png');
}

module.exports = { generateMatchCard };
