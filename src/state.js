const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'data', 'state.json');

const DEFAULT_STATE = {
  knownMatchIds: [],              // IDs already detected (to avoid re-announcing)
  calendarMessageIds: {},         // { matchId: discordMessageId } for general calendar
  teamChannelIds: {},             // { teamId: discordChannelId } for team-specific channels
  teamMessageIds: {},             // { teamId: { matchId: discordMessageId } }
  announcementChannelId: null,
  calendarChannelId: null,
  ticketCategoryId: null,
  pendingAnnouncementDeletions: [], // [{ messageId, channelId, deleteAt }]
};

function load() {
  if (!fs.existsSync(STATE_FILE)) {
    save(DEFAULT_STATE);
    return { ...DEFAULT_STATE };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    // Ensure new keys exist in older state files
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function save(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Known matches ────────────────────────────────────────────────────────────

function isKnown(matchId) {
  return load().knownMatchIds.includes(matchId);
}

function markKnown(matchId) {
  const state = load();
  if (!state.knownMatchIds.includes(matchId)) {
    state.knownMatchIds.push(matchId);
    save(state);
  }
}

// ─── General calendar message IDs ────────────────────────────────────────────

function getCalendarMessageId(matchId) {
  return load().calendarMessageIds[matchId] || null;
}

function setCalendarMessageId(matchId, messageId) {
  const state = load();
  state.calendarMessageIds[matchId] = messageId;
  save(state);
}

function removeCalendarMessageId(matchId) {
  const state = load();
  delete state.calendarMessageIds[matchId];
  save(state);
}

function getAllCalendarMessageIds() {
  return load().calendarMessageIds;
}

// ─── Team channels ────────────────────────────────────────────────────────────

function getTeamChannelId(teamId) {
  return load().teamChannelIds[String(teamId)] || null;
}

function setTeamChannelId(teamId, channelId) {
  const state = load();
  if (!state.teamChannelIds) state.teamChannelIds = {};
  if (!state.teamMessageIds) state.teamMessageIds = {};
  // If channel changes, clear old message ID tracking for this team
  if (state.teamChannelIds[String(teamId)] !== channelId) {
    state.teamMessageIds[String(teamId)] = {};
  }
  state.teamChannelIds[String(teamId)] = channelId;
  save(state);
}

function removeTeamChannelId(teamId) {
  const state = load();
  delete state.teamChannelIds[String(teamId)];
  delete state.teamMessageIds[String(teamId)];
  save(state);
}

function getAllTeamChannelIds() {
  return load().teamChannelIds || {};
}

// ─── Team channel message IDs ─────────────────────────────────────────────────

function getTeamMessageId(teamId, matchId) {
  const state = load();
  return (state.teamMessageIds[String(teamId)] || {})[String(matchId)] || null;
}

function setTeamMessageId(teamId, matchId, messageId) {
  const state = load();
  if (!state.teamMessageIds) state.teamMessageIds = {};
  if (!state.teamMessageIds[String(teamId)]) state.teamMessageIds[String(teamId)] = {};
  state.teamMessageIds[String(teamId)][String(matchId)] = messageId;
  save(state);
}

function removeTeamMessageId(teamId, matchId) {
  const state = load();
  if (state.teamMessageIds && state.teamMessageIds[String(teamId)]) {
    delete state.teamMessageIds[String(teamId)][String(matchId)];
    save(state);
  }
}

function getAllTeamMessageIds(teamId) {
  return (load().teamMessageIds || {})[String(teamId)] || {};
}

// ─── Channels config ──────────────────────────────────────────────────────────

function getAnnouncementChannelId() {
  return load().announcementChannelId || null;
}

function setAnnouncementChannelId(id) {
  const s = load();
  s.announcementChannelId = id;
  save(s);
}

function getCalendarChannelId() {
  return load().calendarChannelId || null;
}

function setCalendarChannelId(id) {
  const s = load();
  s.calendarChannelId = id;
  save(s);
}

function getTicketCategoryId() {
  return load().ticketCategoryId || null;
}

function setTicketCategoryId(id) {
  const s = load();
  s.ticketCategoryId = id;
  save(s);
}

// ─── Announcement deletions ───────────────────────────────────────────────────

function addPendingAnnouncementDeletion(messageId, channelId, deleteAt) {
  const s = load();
  if (!s.pendingAnnouncementDeletions) s.pendingAnnouncementDeletions = [];
  s.pendingAnnouncementDeletions.push({ messageId, channelId, deleteAt });
  save(s);
}

function removePendingAnnouncementDeletion(messageId) {
  const s = load();
  s.pendingAnnouncementDeletions = (s.pendingAnnouncementDeletions || []).filter(
    (d) => d.messageId !== messageId
  );
  save(s);
}

function getPendingAnnouncementDeletions() {
  return load().pendingAnnouncementDeletions || [];
}

module.exports = {
  isKnown,
  markKnown,
  // General calendar
  getCalendarMessageId,
  setCalendarMessageId,
  removeCalendarMessageId,
  getAllCalendarMessageIds,
  // Team channels
  getTeamChannelId,
  setTeamChannelId,
  removeTeamChannelId,
  getAllTeamChannelIds,
  getTeamMessageId,
  setTeamMessageId,
  removeTeamMessageId,
  getAllTeamMessageIds,
  // Config
  getAnnouncementChannelId,
  setAnnouncementChannelId,
  getCalendarChannelId,
  setCalendarChannelId,
  getTicketCategoryId,
  setTicketCategoryId,
  // Deletions
  addPendingAnnouncementDeletion,
  removePendingAnnouncementDeletion,
  getPendingAnnouncementDeletions,
};
