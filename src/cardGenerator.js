const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

const CARD_WIDTH = 900;
const CARD_HEIGHT = 320;
const LOGO_SIZE = 180;
const TEAM_LOGO_Y = 65;
const TOURNAMENT_LOGO_SIZE = 48;

const LOGO_PATH = path.join(__dirname, '..', 'logo.png');

function formatMatchDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
}

async function tryLoadImage(url) {
  if (!url) return null;
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
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

function drawLogo(ctx, img, x, y, size) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img) {
    ctx.drawImage(img, x, y, size, size);
  } else {
    ctx.fillStyle = '#2a2a4a';
    ctx.fill();
    ctx.fillStyle = '#555577';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy);
  }

  ctx.restore();

  // Circle border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#4a4a8a';
  ctx.lineWidth = 3;
  ctx.stroke();
}

async function generateMatchCard(match) {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // --- Background ---
  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, '#0d0d1a');
  bg.addColorStop(0.5, '#12122b');
  bg.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = bg;
  drawRoundedRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 18);
  ctx.fill();

  // Subtle separator line
  ctx.strokeStyle = '#2a2a50';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, CARD_HEIGHT - 75);
  ctx.lineTo(CARD_WIDTH - 40, CARD_HEIGHT - 75);
  ctx.stroke();

  // --- Load images in parallel ---
  const [team1Img, team2Img, tournamentImg] = await Promise.all([
    tryLoadImage(match.team1_logo),
    tryLoadImage(match.team2_logo),
    fs.existsSync(LOGO_PATH) ? loadImage(LOGO_PATH).catch(() => null) : Promise.resolve(null),
  ]);

  // --- Team 1 logo (left) ---
  const team1X = 60;
  drawLogo(ctx, team1Img, team1X, TEAM_LOGO_Y, LOGO_SIZE);

  // --- Team 2 logo (right) ---
  const team2X = CARD_WIDTH - 60 - LOGO_SIZE;
  drawLogo(ctx, team2Img, team2X, TEAM_LOGO_Y, LOGO_SIZE);

  // --- VS ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('VS', CARD_WIDTH / 2, CARD_HEIGHT / 2 - 10);

  // Round name
  if (match.round_name) {
    ctx.fillStyle = '#8888cc';
    ctx.font = '18px sans-serif';
    ctx.fillText(match.round_name.toUpperCase(), CARD_WIDTH / 2, CARD_HEIGHT / 2 + 22);
  }

  // --- Team names below logos ---
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#ddddff';

  // Team 1 name
  ctx.textAlign = 'center';
  ctx.fillText(
    truncate(match.team1_name, 16),
    team1X + LOGO_SIZE / 2,
    TEAM_LOGO_Y + LOGO_SIZE + 26
  );

  // Team 2 name
  ctx.fillText(
    truncate(match.team2_name, 16),
    team2X + LOGO_SIZE / 2,
    TEAM_LOGO_Y + LOGO_SIZE + 26
  );

  // --- Bottom bar ---
  const barY = CARD_HEIGHT - 68;

  // Tournament logo + name
  let infoX = 50;
  if (tournamentImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(infoX + TOURNAMENT_LOGO_SIZE / 2, barY + TOURNAMENT_LOGO_SIZE / 2, TOURNAMENT_LOGO_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(tournamentImg, infoX, barY, TOURNAMENT_LOGO_SIZE, TOURNAMENT_LOGO_SIZE);
    ctx.restore();
    infoX += TOURNAMENT_LOGO_SIZE + 12;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#aaaacc';
  ctx.font = 'bold 16px sans-serif';
  if (match.tournament_name) {
    ctx.fillText(match.tournament_name, infoX, barY + TOURNAMENT_LOGO_SIZE / 2 - 8);
  }

  // Match date
  ctx.fillStyle = '#888899';
  ctx.font = '14px sans-serif';
  ctx.fillText('📅 ' + formatMatchDate(match.match_date), infoX, barY + TOURNAMENT_LOGO_SIZE / 2 + 14);

  // Twitch link (right side)
  if (match.twitch_link) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9146ff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('🎮 ' + match.twitch_link, CARD_WIDTH - 50, barY + TOURNAMENT_LOGO_SIZE / 2);
  }

  ctx.textBaseline = 'alphabetic';

  return canvas.toBuffer('image/png');
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

module.exports = { generateMatchCard };
