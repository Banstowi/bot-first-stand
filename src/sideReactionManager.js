const state = require('./state');
const { getMatchById, getTeamPointsByNames, getCapitaineTeam, setSideChoice } = require('./database');
const { refreshCalendar, refreshAllTeamChannels } = require('./calendarManager');

const BLUE_EMOJI = '🔵';
const RED_EMOJI  = '🔴';

/**
 * Given a Discord message ID, find the teamId + matchId it belongs to
 * by scanning the team message ID state. Returns null if not found.
 */
function findTeamMatchForMessage(messageId) {
  const teamChannels = state.getAllTeamChannelIds();
  for (const teamId of Object.keys(teamChannels)) {
    const allMsgs = state.getAllTeamMessageIds(teamId);
    for (const [matchId, msgId] of Object.entries(allMsgs)) {
      if (msgId === messageId) {
        return { teamId, matchId };
      }
    }
  }
  return null;
}

async function handleReactionAdd(reaction, user, client) {
  if (user.bot) return;

  // Resolve partial reaction/message
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  const emoji = reaction.emoji.name;

  // Is this message a team channel card?
  const found = findTeamMatchForMessage(reaction.message.id);
  if (!found) {
    // Not a tracked team card — ignore completely
    return;
  }

  // Only 🔵 and 🔴 are valid on match cards; remove anything else
  if (emoji !== BLUE_EMOJI && emoji !== RED_EMOJI) {
    await reaction.users.remove(user.id).catch(() => {});
    return;
  }

  const { matchId } = found;
  const match = await getMatchById(parseInt(matchId, 10));
  if (!match) {
    await reaction.users.remove(user.id).catch(() => {});
    return;
  }

  // Side already chosen — lock further reactions
  if (match.side_picker) {
    await reaction.users.remove(user.id).catch(() => {});
    return;
  }

  // Determine the eligible team (fewer points)
  const pointsMap = await getTeamPointsByNames(match.team1_name, match.team2_name);
  const pts1 = pointsMap[match.team1_name] ?? 0;
  const pts2 = pointsMap[match.team2_name] ?? 0;

  if (pts1 === pts2) {
    // Equal points — nobody gets to pick
    await reaction.users.remove(user.id).catch(() => {});
    return;
  }

  const eligibleTeam = pts1 < pts2 ? match.team1_name : match.team2_name;

  // Check the user is captain of the eligible team
  const capitaine = await getCapitaineTeam(user.id);
  if (!capitaine || capitaine.team_name !== eligibleTeam) {
    await reaction.users.remove(user.id).catch(() => {});
    return;
  }

  // Record the vote
  const side = emoji === BLUE_EMOJI ? 'blue' : 'red';
  await setSideChoice(match.id, eligibleTeam, side);
  console.log(`[SideReaction] Match #${match.id}: ${eligibleTeam} choisit ${side} side`);

  // Remove the OTHER reaction emoji so the captain cannot switch
  const otherEmoji = side === 'blue' ? RED_EMOJI : BLUE_EMOJI;
  const otherReaction = reaction.message.reactions.cache.get(otherEmoji);
  if (otherReaction) await otherReaction.remove().catch(() => {});

  // Refresh cards in all channels so sides appear on the updated cards
  await refreshCalendar(client);
  await refreshAllTeamChannels(client);
}

module.exports = { handleReactionAdd };
