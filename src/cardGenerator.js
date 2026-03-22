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
const NAME_Y      = LOGO_CY + LOGO_R + 30;    // = 274
const POINTS_Y    = NAME_Y + 24;              // = 298  (points line under team name)
const SIDE_Y      = POINTS_Y + 22;            // = 320  (side line, shown only when voted)
const SEP_Y       = SIDE_Y + 18;              // = 338
const FOOTER_CY   = SEP_Y + (H - SEP_Y) / 2; // vertically centered in footer  ≈ 389

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

  // ── Side choice ───────────────────────────────────────────────────────────
  if (match.team1_side || match.team2_side) {
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px sans-serif';
    if (match.team1_side) {
      ctx.fillStyle = match.team1_side === 'blue' ? '#4da6ff' : '#ff4d4d';
      ctx.fillText(
        match.team1_side === 'blue' ? '🔵 Blue side' : '🔴 Red side',
        TEAM1_CX, SIDE_Y
      );
    }
    if (match.team2_side) {
      ctx.fillStyle = match.team2_side === 'blue' ? '#4da6ff' : '#ff4d4d';
      ctx.fillText(
        match.team2_side === 'blue' ? '🔵 Blue side' : '🔴 Red side',
        TEAM2_CX, SIDE_Y
      );
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

// ─── Result card ─────────────────────────────────────────────────────────────
//
// Same header + logo section as the match card, but:
//   - winner logo gets a golden ring + radial glow
//   - loser  logo gets a grey ring + dim overlay
//   - center shows the score  "2 – 0" instead of "VS"
//   - winner side: "🏆 Victoire" badge in gold
//   - footer: "Résultat officiel"

async function generateResultCard(match) {
  // match must have: result_winner, result_score_winner, result_score_loser
  const isTeam1Winner = match.result_winner === match.team1_name;
  const score1 = isTeam1Winner ? match.result_score_winner : match.result_score_loser;
  const score2 = isTeam1Winner ? match.result_score_loser  : match.result_score_winner;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

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
  ctx.fillRect(0, HEADER_H - 20, W, 20);

  const TLOGO_R = 22;
  const TLOGO_CX = 36;
  const TLOGO_CY = HEADER_H / 2;
  drawCircleImage(ctx, tournamentImg, TLOGO_CX, TLOGO_CY, TLOGO_R, 'T');

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
  ctx.textAlign = 'right';
  ctx.fillStyle = '#6666aa';
  ctx.font = '13px sans-serif';
  ctx.fillText(`#${match.id}`, W - 16, HEADER_H / 2);

  // ── Winner glow (radial, behind logo) ────────────────────────────────────
  const winnerCX = isTeam1Winner ? TEAM1_CX : TEAM2_CX;
  const glow = ctx.createRadialGradient(winnerCX, LOGO_CY, LOGO_R * 0.4, winnerCX, LOGO_CY, LOGO_R * 1.8);
  glow.addColorStop(0,   'rgba(240,192,64,0.30)');
  glow.addColorStop(0.5, 'rgba(240,192,64,0.10)');
  glow.addColorStop(1,   'rgba(240,192,64,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(winnerCX, LOGO_CY, LOGO_R * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // ── Team logos ──────────────────────────────────────────────────────────
  // Helper that draws a logo with a custom ring colour
  function drawTeamLogo(img, cx, ringColor, dimmed) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, LOGO_CY, LOGO_R, 0, Math.PI * 2);
    ctx.clip();

    if (img) {
      ctx.drawImage(img, cx - LOGO_R, LOGO_CY - LOGO_R, LOGO_R * 2, LOGO_R * 2);
    } else {
      ctx.fillStyle = '#1e1e3a';
      ctx.fill();
      ctx.fillStyle = '#4a4a7a';
      ctx.font = `bold ${Math.round(LOGO_R * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, LOGO_CY);
    }

    if (dimmed) {
      ctx.fillStyle = 'rgba(0,0,0,0.40)';
      ctx.fillRect(cx - LOGO_R, LOGO_CY - LOGO_R, LOGO_R * 2, LOGO_R * 2);
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, LOGO_CY, LOGO_R, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  drawTeamLogo(team1Img, TEAM1_CX, isTeam1Winner ? '#f0c040' : '#444466', !isTeam1Winner);
  drawTeamLogo(team2Img, TEAM2_CX, isTeam1Winner ? '#444466' : '#f0c040', isTeam1Winner);

  // ── Score (center) ───────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.fillText(`${score1}  –  ${score2}`, CENTER_CX, LOGO_CY);

  // ── Team names ──────────────────────────────────────────────────────────
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = isTeam1Winner ? '#dde0ff' : '#666688';
  ctx.fillText(truncate(match.team1_name, 18), TEAM1_CX, NAME_Y);
  ctx.fillStyle = isTeam1Winner ? '#666688' : '#dde0ff';
  ctx.fillText(truncate(match.team2_name, 18), TEAM2_CX, NAME_Y);

  // ── Victory / Defeat badges ──────────────────────────────────────────────
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.fillText('🏆 Victoire', winnerCX, POINTS_Y);

  const loserCX = isTeam1Winner ? TEAM2_CX : TEAM1_CX;
  ctx.fillStyle = '#555577';
  ctx.fillText('Défaite', loserCX, POINTS_Y);

  // ── Separator ────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#2a2a55';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, SEP_Y);
  ctx.lineTo(W - 40, SEP_Y);
  ctx.stroke();

  // ── Footer ───────────────────────────────────────────────────────────────
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9999bb';
  ctx.font = '16px sans-serif';
  ctx.fillText('  ✅ Résultat officiel', 40, FOOTER_CY);

  if (match.match_date) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#666688';
    ctx.font = '14px sans-serif';
    ctx.fillText(formatDate(match.match_date), W - 40, FOOTER_CY);
  }

  ctx.textBaseline = 'alphabetic';
  return canvas.toBuffer('image/png');
}

module.exports = { generateMatchCard, generateResultCard };
