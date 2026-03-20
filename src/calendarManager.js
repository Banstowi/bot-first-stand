const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUpcomingMatchesInDays, getMatchesByTeamId } = require('./database');
const { generateMatchCard } = require('./cardGenerator');
const state = require('./state');

// ─── Embed builders ───────────────────────────────────────────────────────────

function buildMatchEmbed(match) {
  const date = match.match_date ? new Date(match.match_date) : null;

  const embed = new EmbedBuilder()
    .setColor(date ? 0x5555cc : 0x444466)
    .setTitle(`⚔️  ${match.team1_name}  vs  ${match.team2_name}`)
    .setDescription(
      match.round_name
        ? `**${match.round_name}** — ${match.tournament_name || ''}`
        : match.tournament_name || ''
    )
    .addFields({
      name: '📅 Date',
      value: date
        ? date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris',
          })
        : '⏳ À définir par le capitaine',
      inline: true,
    })
    .setFooter({ text: `Match #${match.id}` });

  if (date) embed.setTimestamp(date);
  if (match.twitch_link) embed.addFields({ name: '🎮 Stream', value: match.twitch_link, inline: true });

  return embed;
}

async function buildMatchMessage(match) {
  const cardBuffer = await generateMatchCard(match);
  const filename = `calendar_match_${match.id}.png`;
  const attachment = new AttachmentBuilder(cardBuffer, { name: filename });
  const embed = buildMatchEmbed(match).setImage(`attachment://${filename}`);
  return { embed, attachment };
}

// ─── Shared channel sync ──────────────────────────────────────────────────────

/**
 * Syncs a list of matches to a Discord channel.
 *
 * Options:
 *   imageOnly {boolean} — send only the card image (no embed text). Default: false.
 *   limit     {number}  — max matches to display. Default: unlimited.
 *
 * In embed mode  : edits the embed in place (keeps image), reposts only if missing.
 * In imageOnly   : keeps existing image messages as-is; replaces any old embed-style
 *                  message with an image-only one; only reposts when explicitly cleared.
 */
async function syncMatchesToChannel(channel, matches, { getMsg, setMsg, removeMsg, getAllMsgs }, label, options = {}) {
  const { imageOnly = false, limit = null } = options;

  // Apply limit
  const displayMatches = limit ? matches.slice(0, limit) : matches;
  const currentIds = new Set(displayMatches.map((m) => String(m.id)));
  const existingIds = getAllMsgs();

  // Delete messages for matches no longer displayed (out of scope or beyond limit)
  for (const [matchId, msgId] of Object.entries(existingIds)) {
    if (matchId === '_placeholder') continue;
    if (!currentIds.has(matchId)) {
      const msg = await channel.messages.fetch(msgId).catch(() => null);
      if (msg) await msg.delete().catch(() => {});
      removeMsg(matchId);
      console.log(`[${label}] Message supprimé pour match #${matchId}`);
    }
  }

  // Delete placeholder if matches are now available
  if (displayMatches.length > 0) {
    const placeholderMsgId = getMsg('_placeholder');
    if (placeholderMsgId) {
      const placeholderMsg = await channel.messages.fetch(placeholderMsgId).catch(() => null);
      if (placeholderMsg) await placeholderMsg.delete().catch(() => {});
      removeMsg('_placeholder');
    }
  }

  // Post or update each match
  for (const match of displayMatches) {
    const matchIdStr = String(match.id);
    const existingMsgId = getMsg(matchIdStr);

    try {
      if (existingMsgId) {
        const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
        if (existingMsg) {
          if (imageOnly) {
            // If the stored message is an old embed-style one, replace it with image-only
            if (existingMsg.embeds.length > 0) {
              await existingMsg.delete().catch(() => {});
              removeMsg(matchIdStr);
              // Fall through to post the image-only message below
            } else {
              continue; // Already image-only and up-to-date, keep it
            }
          } else {
            // Embed mode: edit the embed in place (keeps existing image attachment)
            const imageUrl = existingMsg.embeds[0]?.image?.url || null;
            await existingMsg.edit({ embeds: [buildMatchEmbed(match).setImage(imageUrl)] });
            console.log(`[${label}] Carte mise à jour pour match #${match.id}`);
            continue;
          }
        } else {
          // Message no longer in Discord — clean up and repost
          removeMsg(matchIdStr);
        }
      }

      // Post new message
      if (imageOnly) {
        const { attachment } = await buildMatchMessage(match);
        const sent = await channel.send({ files: [attachment] });
        setMsg(matchIdStr, sent.id);
      } else {
        const { embed, attachment } = await buildMatchMessage(match);
        const sent = await channel.send({ embeds: [embed], files: [attachment] });
        setMsg(matchIdStr, sent.id);
      }
      console.log(`[${label}] Carte postée pour match #${match.id} (${match.team1_name} vs ${match.team2_name})`);
    } catch (err) {
      console.error(`[${label}] Erreur pour le match #${match.id}:`, err);
    }
  }

  // Placeholder when no matches
  if (displayMatches.length === 0 && !getMsg('_placeholder')) {
    const sent = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x333355)
          .setTitle('📅 Aucun match à venir')
          .setDescription('Revenez bientôt pour voir les prochaines rencontres !'),
      ],
    });
    setMsg('_placeholder', sent.id);
  }
}

// ─── General calendar ─────────────────────────────────────────────────────────

async function refreshCalendar(client) {
  const channelId = state.getCalendarChannelId();
  if (!channelId) {
    console.warn('[Calendar] Canal calendrier non configuré. Utilisez /setup calendrier #canal');
    return;
  }
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`[Calendar] Canal calendrier introuvable: ${channelId}`);
    return;
  }

  console.log('[Calendar] Mise à jour du calendrier...');
  try {
    const matches = await getUpcomingMatchesInDays(3);
    await syncMatchesToChannel(channel, matches, {
      getMsg:    (id) => state.getCalendarMessageId(id),
      setMsg:    (id, msgId) => state.setCalendarMessageId(id, msgId),
      removeMsg: (id) => state.removeCalendarMessageId(id),
      getAllMsgs: () => state.getAllCalendarMessageIds(),
    }, 'Calendar');
  } catch (err) {
    console.error('[Calendar] Erreur lors de la mise à jour du calendrier:', err);
  }
}

// ─── Team channels ────────────────────────────────────────────────────────────

async function refreshTeamChannel(client, teamId, channelId) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`[TeamChannel] Canal introuvable pour équipe #${teamId}: ${channelId}`);
    return;
  }

  console.log(`[TeamChannel] Mise à jour du canal équipe #${teamId}...`);
  try {
    const matches = await getMatchesByTeamId(teamId);
    await syncMatchesToChannel(channel, matches, {
      getMsg:    (id) => state.getTeamMessageId(teamId, id),
      setMsg:    (id, msgId) => state.setTeamMessageId(teamId, id, msgId),
      removeMsg: (id) => state.removeTeamMessageId(teamId, id),
      getAllMsgs: () => state.getAllTeamMessageIds(teamId),
    }, `TeamChannel#${teamId}`, { imageOnly: true, limit: 2 });
  } catch (err) {
    console.error(`[TeamChannel] Erreur pour équipe #${teamId}:`, err);
  }
}

async function refreshAllTeamChannels(client) {
  const teamChannels = state.getAllTeamChannelIds();
  for (const [teamId, channelId] of Object.entries(teamChannels)) {
    await refreshTeamChannel(client, teamId, channelId);
  }
}

module.exports = { refreshCalendar, refreshAllTeamChannels };
