const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const state = require('./state');
const { generateResultCard } = require('./cardGenerator');

/**
 * Posts (or re-posts) a result card in the configured results channel.
 * Returns the sent message, or null if the channel isn't configured.
 */
async function postResult(client, match) {
  const channelId = state.getResultsChannelId();
  if (!channelId) {
    console.warn('[Results] Canal résultats non configuré. Utilisez /setup resultats #canal');
    return null;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`[Results] Canal résultats introuvable: ${channelId}`);
    return null;
  }

  const isTeam1Winner = match.result_winner === match.team1_name;
  const score1 = isTeam1Winner ? match.result_score_winner : match.result_score_loser;
  const score2 = isTeam1Winner ? match.result_score_loser  : match.result_score_winner;

  const cardBuffer = await generateResultCard(match);
  const filename = `result_match_${match.id}.png`;
  const attachment = new AttachmentBuilder(cardBuffer, { name: filename });

  const embed = new EmbedBuilder()
    .setColor(0xf0c040)
    .setTitle(`🏆  ${match.result_winner} remporte le match !`)
    .setDescription(
      match.round_name
        ? `**${match.round_name}** — ${match.tournament_name || ''}`
        : match.tournament_name || ''
    )
    .addFields(
      { name: '📊 Score',   value: `**${match.team1_name}** ${score1} – ${score2} **${match.team2_name}**`, inline: false },
      { name: '🏆 Vainqueur', value: match.result_winner, inline: true },
    )
    .setImage(`attachment://${filename}`)
    .setFooter({ text: `Match #${match.id}` })
    .setTimestamp();

  const sent = await channel.send({ embeds: [embed], files: [attachment] });
  console.log(`[Results] Résultat posté pour match #${match.id}`);
  return sent;
}

module.exports = { postResult };
