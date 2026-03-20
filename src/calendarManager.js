const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUpcomingMatchesInDays } = require('./database');
const { generateMatchCard } = require('./cardGenerator');
const state = require('./state');

async function buildMatchMessage(match) {
  const date = new Date(match.match_date);
  const cardBuffer = await generateMatchCard(match);
  const filename = `calendar_match_${match.id}.png`;
  const attachment = new AttachmentBuilder(cardBuffer, { name: filename });

  const embed = new EmbedBuilder()
    .setColor(0x5555cc)
    .setTitle(`⚔️  ${match.team1_name}  vs  ${match.team2_name}`)
    .setDescription(
      match.round_name
        ? `**${match.round_name}** — ${match.tournament_name || ''}`
        : match.tournament_name || ''
    )
    .addFields({
      name: '📅 Date',
      value: date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris',
      }),
      inline: true,
    })
    .setImage(`attachment://${filename}`)
    .setFooter({ text: `Match #${match.id}` })
    .setTimestamp(date);

  if (match.twitch_link) {
    embed.addFields({ name: '🎮 Stream', value: match.twitch_link, inline: true });
  }

  return { embed, attachment, filename };
}

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
    const upcomingMatches = (await getUpcomingMatchesInDays(3))
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    const upcomingIds = new Set(upcomingMatches.map((m) => String(m.id)));
    const existingIds = state.getAllCalendarMessageIds();

    // Remove messages for matches no longer upcoming (passed or status changed)
    for (const [matchId, msgId] of Object.entries(existingIds)) {
      if (matchId === '_placeholder') continue;
      if (!upcomingIds.has(matchId)) {
        try {
          const msg = await channel.messages.fetch(msgId).catch(() => null);
          if (msg) await msg.delete();
        } catch {
          // Message may already be deleted
        }
        state.removeCalendarMessageId(matchId);
        console.log(`[Calendar] Message supprimé pour match #${matchId}`);
      }
    }

    // Delete placeholder "no match" message if matches are now available
    if (upcomingMatches.length > 0) {
      const placeholderMsgId = state.getCalendarMessageId('_placeholder');
      if (placeholderMsgId) {
        const placeholderMsg = await channel.messages.fetch(placeholderMsgId).catch(() => null);
        if (placeholderMsg) await placeholderMsg.delete().catch(() => {});
        state.removeCalendarMessageId('_placeholder');
      }
    }

    // Post or update messages for upcoming matches
    for (const match of upcomingMatches) {
      const matchIdStr = String(match.id);
      const existingMsgId = state.getCalendarMessageId(matchIdStr);

      try {
        if (existingMsgId) {
          // Try to edit the existing message (embed only, keeps the image attachment)
          const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
          if (existingMsg) {
            const { embed } = await buildMatchMessage(match);
            await existingMsg.edit({ embeds: [embed] });
            console.log(`[Calendar] Carte mise à jour pour match #${match.id} (${match.team1_name} vs ${match.team2_name})`);
            continue;
          }
          // Message no longer exists in Discord — remove stale state and repost
          state.removeCalendarMessageId(matchIdStr);
        }

        // Post new message with image card
        const { embed, attachment } = await buildMatchMessage(match);
        const sent = await channel.send({ embeds: [embed], files: [attachment] });
        state.setCalendarMessageId(matchIdStr, sent.id);
        console.log(`[Calendar] Carte postée pour match #${match.id} (${match.team1_name} vs ${match.team2_name})`);
      } catch (err) {
        console.error(`[Calendar] Erreur pour le match #${match.id}:`, err);
      }
    }

    // If no upcoming matches, post a placeholder (once, tracked in state)
    if (upcomingMatches.length === 0 && !state.getCalendarMessageId('_placeholder')) {
      const sent = await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x333355)
            .setTitle('📅 Aucun match prévu dans les 3 prochains jours')
            .setDescription('Revenez bientôt pour voir les prochaines rencontres !'),
        ],
      });
      state.setCalendarMessageId('_placeholder', sent.id);
    }
  } catch (err) {
    console.error('[Calendar] Erreur lors de la mise à jour du calendrier:', err);
  }
}

module.exports = { refreshCalendar };
