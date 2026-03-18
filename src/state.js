const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'data', 'state.json');

const DEFAULT_STATE = {
  knownMatchIds: [],              // IDs already detected (to avoid re-announcing)
  calendarMessageIds: {},         // { matchId: discordMessageId } for calendar channel
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
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function save(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function isKnown(matchId) {
  const state = load();
  return state.knownMatchIds.includes(matchId);
}

function markKnown(matchId) {
  const state = load();
  if (!state.knownMatchIds.includes(matchId)) {
    state.knownMatchIds.push(matchId);
    save(state);
  }
}

function getCalendarMessageId(matchId) {
  const state = load();
  return state.calendarMessageIds[matchId] || null;
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
  const state = load();
  return state.calendarMessageIds;
}

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

module.exports = {
  isKnown,
  markKnown,
  getCalendarMessageId,
  setCalendarMessageId,
  removeCalendarMessageId,
  getAllCalendarMessageIds,
  getAnnouncementChannelId,
  setAnnouncementChannelId,
  getCalendarChannelId,
  setCalendarChannelId,
  addPendingAnnouncementDeletion,
  removePendingAnnouncementDeletion,
  getPendingAnnouncementDeletions,
  getTicketCategoryId,
  setTicketCategoryId,
};
