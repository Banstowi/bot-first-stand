const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getUpcomingMatchesInDays } = require('./database');
const { generateMatchCard } = require('./cardGenerator');
const state = require('./state');

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

  if (match.twitch_link) {
    embed.addFields({ name: '🎮 Stream', value: match.twitch_link, inline: true });
  }

  return embed;
}

async function buildMatchMessage(match) {
  const cardBuffer = await generateMatchCard(match);
  const filename = `calendar_match_${match.id}.png`;
  const attachment = new AttachmentBuilder(cardBuffer, { name: filename });
  const embed = buildMatchEmbed(match).setImage(`attachment://${filename}`);
  return { embed, attachment };
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
    // getUpcomingMatchesInDays already sorts: dated matches ASC, then undated
    const upcomingMatches = await getUpcomingMatchesInDays(3);
    const upcomingIds = new Set(upcomingMatches.map((m) => String(m.id)));
    const existingIds = state.getAllCalendarMessageIds();

    // Remove messages for matches no longer in scope
    for (const [matchId, msgId] of Object.entries(existingIds)) {
      if (matchId === '_placeholder') continue;
      if (!upcomingIds.has(matchId)) {
        try {
          const msg = await channel.messages.fetch(msgId).catch(() => null);
          if (msg) await msg.delete();
        } catch {
          // Already deleted
        }
        state.removeCalendarMessageId(matchId);
        console.log(`[Calendar] Message supprimé pour match #${matchId}`);
      }
    }

    // Delete placeholder if matches are now available
    if (upcomingMatches.length > 0) {
      const placeholderMsgId = state.getCalendarMessageId('_placeholder');
      if (placeholderMsgId) {
        const placeholderMsg = await channel.messages.fetch(placeholderMsgId).catch(() => null);
        if (placeholderMsg) await placeholderMsg.delete().catch(() => {});
        state.removeCalendarMessageId('_placeholder');
      }
    }

    // Post or update messages for each match
    for (const match of upcomingMatches) {
      const matchIdStr = String(match.id);
      const existingMsgId = state.getCalendarMessageId(matchIdStr);

      try {
        if (existingMsgId) {
          // Edit the embed in place (keeps the existing image attachment)
          const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
          if (existingMsg) {
            await existingMsg.edit({ embeds: [buildMatchEmbed(match).setImage(existingMsg.embeds[0]?.image?.url || null)] });
            console.log(`[Calendar] Carte mise à jour pour match #${match.id}`);
            continue;
          }
          // Message gone from Discord — remove stale state and repost
          state.removeCalendarMessageId(matchIdStr);
        }

        // Post new message with generated card image
        const { embed, attachment } = await buildMatchMessage(match);
        const sent = await channel.send({ embeds: [embed], files: [attachment] });
        state.setCalendarMessageId(matchIdStr, sent.id);
        console.log(`[Calendar] Carte postée pour match #${match.id} (${match.team1_name} vs ${match.team2_name})`);
      } catch (err) {
        console.error(`[Calendar] Erreur pour le match #${match.id}:`, err);
      }
    }

    // Placeholder when no matches
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
