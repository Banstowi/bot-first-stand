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
      }),
      inline: true,
    })
    .setImage(`attachment://${filename}`)
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
    const upcomingMatches = await getUpcomingMatchesInDays(3);
    const upcomingIds = new Set(upcomingMatches.map((m) => String(m.id)));
    const existingIds = state.getAllCalendarMessageIds();

    // Remove messages for matches no longer upcoming (passed or status changed)
    for (const [matchId, msgId] of Object.entries(existingIds)) {
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

    // Post or update messages for upcoming matches
    for (const match of upcomingMatches) {
      const matchIdStr = String(match.id);
      const existingMsgId = state.getCalendarMessageId(matchIdStr);

      try {
        const { embed, attachment } = await buildMatchMessage(match);

        if (existingMsgId) {
          // Try to edit existing message
          const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
          if (existingMsg) {
            await existingMsg.edit({ embeds: [embed], files: [attachment] });
            console.log(`[Calendar] Message mis à jour pour match #${match.id}`);
            continue;
          }
        }

        // Post new message
        const sent = await channel.send({ embeds: [embed], files: [attachment] });
        state.setCalendarMessageId(matchIdStr, sent.id);
        console.log(`[Calendar] Nouveau message posté pour match #${match.id}`);
      } catch (err) {
        console.error(`[Calendar] Erreur pour le match #${match.id}:`, err);
      }
    }

    // If no upcoming matches, post a placeholder if channel is empty
    if (upcomingMatches.length === 0) {
      const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
      if (msgs && msgs.size === 0) {
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x333355)
              .setTitle('📅 Aucun match prévu dans les 3 prochains jours')
              .setDescription('Revenez bientôt pour voir les prochaines rencontres !'),
          ],
        });
      }
    }
  } catch (err) {
    console.error('[Calendar] Erreur lors de la mise à jour du calendrier:', err);
  }
}

module.exports = { refreshCalendar };
