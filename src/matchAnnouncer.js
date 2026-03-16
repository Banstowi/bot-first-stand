const { AttachmentBuilder } = require('discord.js');
const { getAllPendingMatches } = require('./database');
const { generateMatchCard } = require('./cardGenerator');
const state = require('./state');

// Map of matchId -> setTimeout handle (to avoid duplicates)
const scheduledAnnouncements = new Map();

function buildMatchEmbed(match, imageFilename) {
  const { EmbedBuilder } = require('discord.js');
  const date = new Date(match.match_date);

  const embed = new EmbedBuilder()
    .setColor(0x1a1aff)
    .setTitle(`⚔️  ${match.team1_name}  vs  ${match.team2_name}`)
    .setDescription(match.round_name ? `**${match.round_name}** — ${match.tournament_name || ''}` : (match.tournament_name || ''))
    .addFields(
      {
        name: '📅 Date',
        value: date.toLocaleDateString('fr-FR', {
          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
        }),
        inline: true,
      }
    )
    .setImage(`attachment://${imageFilename}`)
    .setTimestamp(date);

  if (match.twitch_link) {
    embed.addFields({ name: '🎮 Stream', value: match.twitch_link, inline: true });
  }

  return embed;
}

async function sendMatchAnnouncement(client, match) {
  const channelId = process.env.ANNOUNCEMENT_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`[Announcer] Canal d'annonce introuvable: ${channelId}`);
    return;
  }

  try {
    const cardBuffer = await generateMatchCard(match);
    const filename = `match_${match.id}.png`;
    const attachment = new AttachmentBuilder(cardBuffer, { name: filename });
    const embed = buildMatchEmbed(match, filename);

    await channel.send({
      content: `@everyone 🏆 **Nouveau match à venir !**`,
      embeds: [embed],
      files: [attachment],
    });
    console.log(`[Announcer] Match ${match.id} annoncé dans #${channel.name}`);
  } catch (err) {
    console.error(`[Announcer] Erreur lors de l'envoi du match ${match.id}:`, err);
  }
}

function scheduleMatchAnnouncement(client, match) {
  if (scheduledAnnouncements.has(match.id)) return;

  const matchTime = new Date(match.match_date).getTime();
  const announceTime = matchTime - 60 * 60 * 1000; // 1 hour before
  const now = Date.now();
  const delay = announceTime - now;

  if (delay <= 0) {
    // Match is within the next hour or already passed — announce immediately if not announced yet
    console.log(`[Announcer] Match ${match.id} : annonce immédiate (moins d'1h)`);
    sendMatchAnnouncement(client, match);
  } else {
    console.log(`[Announcer] Match ${match.id} programmé dans ${Math.round(delay / 60000)} min`);
    const handle = setTimeout(() => {
      sendMatchAnnouncement(client, match);
      scheduledAnnouncements.delete(match.id);
    }, delay);
    scheduledAnnouncements.set(match.id, handle);
  }
}

async function checkNewMatches(client) {
  try {
    const matches = await getAllPendingMatches();

    for (const match of matches) {
      if (!state.isKnown(match.id)) {
        console.log(`[Announcer] Nouveau match détecté : #${match.id} ${match.team1_name} vs ${match.team2_name}`);
        state.markKnown(match.id);
        scheduleMatchAnnouncement(client, match);
      }
    }
  } catch (err) {
    console.error('[Announcer] Erreur lors de la vérification des matchs:', err);
  }
}

module.exports = { checkNewMatches, scheduleMatchAnnouncement, sendMatchAnnouncement, buildMatchEmbed };
