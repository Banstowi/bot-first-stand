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
  listingChannelId: null,         // Channel showing captains per team
  listingMessageId: null,         // Message ID of the listing embed
  guideChannelId: null,           // Channel showing captain commands guide
  guideMessageId: null,           // Message ID of the guide embed
  reglementChannelId: null,       // Channel showing tournament rules
  reglementMessageId: null,       // Message ID of the règlement embed
  ticketCategoryId: null,
  resultsChannelId: null,           // Channel where result cards are posted
  commandesChannelId: null,         // Channel showing match commands + side-pick explanation
  commandesMessageId: null,         // Message ID of the commandes embed
  adminCommandesChannelId: null,    // Channel showing admin commands guide
  adminCommandesMessageId: null,    // Message ID of the admin commandes embed
  confessionalChannelId: null,      // Channel where confessions are posted anonymously
  founderRoleId: null,              // Role ID allowed to post directly in confessional channel
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

// Entries may be a plain string (legacy) or { id, fp } (current format).
function _entryId(entry)  { return (entry && typeof entry === 'object') ? entry.id  : (entry || null); }
function _entryFp(entry)  { return (entry && typeof entry === 'object') ? entry.fp  : null; }

function getCalendarMessageId(matchId) {
  return _entryId(load().calendarMessageIds[matchId]);
}

function getCalendarMessageFp(matchId) {
  return _entryFp(load().calendarMessageIds[matchId]);
}

function setCalendarMessageId(matchId, messageId, fp = null) {
  const state = load();
  state.calendarMessageIds[matchId] = { id: messageId, fp };
  save(state);
}

function removeCalendarMessageId(matchId) {
  const state = load();
  delete state.calendarMessageIds[matchId];
  save(state);
}

function getAllCalendarMessageIds() {
  // Always return { matchId: string_msgId } regardless of internal format
  const raw = load().calendarMessageIds;
  const out = {};
  for (const [k, v] of Object.entries(raw)) out[k] = _entryId(v);
  return out;
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
  const entry = ((load().teamMessageIds || {})[String(teamId)] || {})[String(matchId)];
  return _entryId(entry);
}

function getTeamMessageFp(teamId, matchId) {
  const entry = ((load().teamMessageIds || {})[String(teamId)] || {})[String(matchId)];
  return _entryFp(entry);
}

function setTeamMessageId(teamId, matchId, messageId, fp = null) {
  const state = load();
  if (!state.teamMessageIds) state.teamMessageIds = {};
  if (!state.teamMessageIds[String(teamId)]) state.teamMessageIds[String(teamId)] = {};
  state.teamMessageIds[String(teamId)][String(matchId)] = { id: messageId, fp };
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
  // Always return { matchId: string_msgId } regardless of internal format
  const raw = (load().teamMessageIds || {})[String(teamId)] || {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) out[k] = _entryId(v);
  return out;
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

function getListingChannelId() {
  return load().listingChannelId || null;
}

function setListingChannelId(id) {
  const s = load();
  s.listingChannelId = id;
  save(s);
}

function getListingMessageId() {
  return load().listingMessageId || null;
}

function setListingMessageId(id) {
  const s = load();
  s.listingMessageId = id;
  save(s);
}

function getGuideChannelId() {
  return load().guideChannelId || null;
}

function setGuideChannelId(id) {
  const s = load();
  s.guideChannelId = id;
  save(s);
}

function getGuideMessageId() {
  return load().guideMessageId || null;
}

function setGuideMessageId(id) {
  const s = load();
  s.guideMessageId = id;
  save(s);
}

function getReglementChannelId() {
  return load().reglementChannelId || null;
}

function setReglementChannelId(id) {
  const s = load();
  s.reglementChannelId = id;
  save(s);
}

function getReglementMessageId() {
  return load().reglementMessageId || null;
}

function setReglementMessageId(id) {
  const s = load();
  s.reglementMessageId = id;
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

function getResultsChannelId() {
  return load().resultsChannelId || null;
}

function setResultsChannelId(id) {
  const s = load();
  s.resultsChannelId = id;
  save(s);
}

function getCommandesChannelId() {
  return load().commandesChannelId || null;
}

function setCommandesChannelId(id) {
  const s = load();
  s.commandesChannelId = id;
  save(s);
}

function getCommandesMessageId() {
  return load().commandesMessageId || null;
}

function setCommandesMessageId(id) {
  const s = load();
  s.commandesMessageId = id;
  save(s);
}

function getAdminCommandesChannelId() {
  return load().adminCommandesChannelId || null;
}

function setAdminCommandesChannelId(id) {
  const s = load();
  s.adminCommandesChannelId = id;
  save(s);
}

function getAdminCommandesMessageId() {
  return load().adminCommandesMessageId || null;
}

function setAdminCommandesMessageId(id) {
  const s = load();
  s.adminCommandesMessageId = id;
  save(s);
}

function getConfessionalChannelId() {
  return load().confessionalChannelId || null;
}

function setConfessionalChannelId(id) {
  const s = load();
  s.confessionalChannelId = id;
  save(s);
}

function getFounderRoleId() {
  return load().founderRoleId || null;
}

function setFounderRoleId(id) {
  const s = load();
  s.founderRoleId = id;
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
  getCalendarMessageFp,
  setCalendarMessageId,
  removeCalendarMessageId,
  getAllCalendarMessageIds,
  // Team channels
  getTeamChannelId,
  setTeamChannelId,
  removeTeamChannelId,
  getAllTeamChannelIds,
  getTeamMessageId,
  getTeamMessageFp,
  setTeamMessageId,
  removeTeamMessageId,
  getAllTeamMessageIds,
  // Config
  getAnnouncementChannelId,
  setAnnouncementChannelId,
  getCalendarChannelId,
  setCalendarChannelId,
  getListingChannelId,
  setListingChannelId,
  getListingMessageId,
  setListingMessageId,
  getGuideChannelId,
  setGuideChannelId,
  getGuideMessageId,
  setGuideMessageId,
  getReglementChannelId,
  setReglementChannelId,
  getReglementMessageId,
  setReglementMessageId,
  getTicketCategoryId,
  setTicketCategoryId,
  getResultsChannelId,
  setResultsChannelId,
  getCommandesChannelId,
  setCommandesChannelId,
  getCommandesMessageId,
  setCommandesMessageId,
  getAdminCommandesChannelId,
  setAdminCommandesChannelId,
  getAdminCommandesMessageId,
  setAdminCommandesMessageId,
  // Confessional
  getConfessionalChannelId,
  setConfessionalChannelId,
  getFounderRoleId,
  setFounderRoleId,
  // Deletions
  addPendingAnnouncementDeletion,
  removePendingAnnouncementDeletion,
  getPendingAnnouncementDeletions,
};
