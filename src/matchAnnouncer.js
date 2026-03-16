const { AttachmentBuilder } = require('discord.js');
const { getAllPendingMatches } = require('./database');
const { generateMatchCard } = require('./cardGenerator');
const state = require('./state');

// Map of matchId -> setTimeout handle (to avoid duplicates)
const scheduledAnnouncements = new Map();

function scheduleAnnouncementDeletion(client, messageId, channelId, deleteAt) {
  const delay = Math.max(0, deleteAt - Date.now());
  setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (msg) {
          await msg.delete();
          console.log(`[Announcer] Message d'annonce ${messageId} supprimé (3h écoulées)`);
        }
      }
    } catch (err) {
      console.error(`[Announcer] Impossible de supprimer le message ${messageId}:`, err);
    } finally {
      state.removePendingAnnouncementDeletion(messageId);
    }
  }, delay);
}

function rescheduleAnnouncementDeletions(client) {
  const pending = state.getPendingAnnouncementDeletions();
  for (const { messageId, channelId, deleteAt } of pending) {
    scheduleAnnouncementDeletion(client, messageId, channelId, deleteAt);
    console.log(`[Announcer] Suppression re-planifiée pour message ${messageId} dans ${Math.round(Math.max(0, deleteAt - Date.now()) / 60000)} min`);
  }
}

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
  const channelId = state.getAnnouncementChannelId();
  if (!channelId) {
    console.warn('[Announcer] Canal d\'annonce non configuré. Utilisez /setup annonce #canal');
    return;
  }
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

    const sent = await channel.send({
      content: `@everyone 🏆 **Nouveau match à venir !**`,
      embeds: [embed],
      files: [attachment],
    });
    console.log(`[Announcer] Match ${match.id} annoncé dans #${channel.name}`);

    // Schedule deletion 3h after sending
    const deleteAt = Date.now() + 3 * 60 * 60 * 1000;
    state.addPendingAnnouncementDeletion(sent.id, channel.id, deleteAt);
    scheduleAnnouncementDeletion(client, sent.id, channel.id, deleteAt);
  } catch (err) {
    console.error(`[Announcer] Erreur lors de l'envoi du match ${match.id}:`, err);
  }
}

function scheduleMatchAnnouncement(client, match) {
  if (scheduledAnnouncements.has(match.id)) return;

  const matchTime = new Date(match.match_date).getTime();
  const announceTime = matchTime - 60 * 60 * 1000; // 1 hour before
  const delay = announceTime - Date.now();

  if (delay <= 0) return; // handled directly by checkNewMatches for sequential sending

  console.log(`[Announcer] Match ${match.id} programmé dans ${Math.round(delay / 60000)} min`);
  const handle = setTimeout(() => {
    sendMatchAnnouncement(client, match);
    scheduledAnnouncements.delete(match.id);
  }, delay);
  scheduledAnnouncements.set(match.id, handle);
}

async function checkNewMatches(client) {
  try {
    const matches = await getAllPendingMatches();

    const immediate = [];
    for (const match of matches) {
      if (!state.isKnown(match.id)) {
        console.log(`[Announcer] Nouveau match détecté : #${match.id} ${match.team1_name} vs ${match.team2_name}`);
        state.markKnown(match.id);

        const matchTime = new Date(match.match_date).getTime();
        const delay = matchTime - 60 * 60 * 1000 - Date.now();

        if (delay <= 0) {
          immediate.push(match);
        } else {
          scheduleMatchAnnouncement(client, match);
        }
      }
    }

    // Send immediate announcements one by one to avoid rate limiting
    for (const match of immediate) {
      console.log(`[Announcer] Match ${match.id} : annonce immédiate (moins d'1h)`);
      await sendMatchAnnouncement(client, match);
      if (immediate.length > 1) await new Promise((r) => setTimeout(r, 1500));
    }
  } catch (err) {
    console.error('[Announcer] Erreur lors de la vérification des matchs:', err);
  }
}

module.exports = { checkNewMatches, scheduleMatchAnnouncement, sendMatchAnnouncement, buildMatchEmbed, rescheduleAnnouncementDeletions };
