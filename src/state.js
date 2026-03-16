const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'data', 'state.json');

const DEFAULT_STATE = {
  knownMatchIds: [],       // IDs already detected (to avoid re-announcing)
  calendarMessageIds: {},  // { matchId: discordMessageId } for calendar channel
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

module.exports = {
  isKnown,
  markKnown,
  getCalendarMessageId,
  setCalendarMessageId,
  removeCalendarMessageId,
  getAllCalendarMessageIds,
};
