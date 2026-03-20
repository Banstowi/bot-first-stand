const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+01:00',
});

async function testConnection() {
  const conn = await pool.getConnection();
  conn.release();
  console.log('[DB] Connexion réussie à la base de données.');
}

// ─── Initial setup ────────────────────────────────────────────────────────────

async function setupDatabase() {
  // Create capitaines_discord table if it doesn't exist
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS capitaines_discord (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      discord_user_id VARCHAR(32) NOT NULL,
      team_id       INT NOT NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user (discord_user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    )
  `);

  // Allow match_date to be NULL so matches can be created without a date
  await pool.execute(`
    ALTER TABLE discord_matches MODIFY COLUMN match_date DATETIME NULL
  `).catch(() => {
    // Column may already be nullable — ignore
  });

  console.log('[DB] Structure de la base de données vérifiée.');
}

// ─── Matches ─────────────────────────────────────────────────────────────────

async function getAllPendingMatches() {
  const [rows] = await pool.execute(
    `SELECT * FROM discord_matches
     WHERE status = 'PENDING' AND match_date IS NOT NULL
     ORDER BY match_date ASC`
  );
  return rows;
}

async function getUpcomingMatchesInDays(days = 3) {
  const [rows] = await pool.execute(
    `SELECT * FROM discord_matches
     WHERE status = 'PENDING'
       AND (
         match_date IS NULL
         OR (
           match_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
           AND match_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
         )
       )
     ORDER BY (match_date IS NULL) ASC, match_date ASC`,
    [days]
  );
  return rows;
}

async function getMatchById(id) {
  const [rows] = await pool.execute(
    `SELECT * FROM discord_matches WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function setMatchDate(matchId, matchDate) {
  const [result] = await pool.execute(
    `UPDATE discord_matches SET match_date = ? WHERE id = ? AND status = 'PENDING'`,
    [matchDate, matchId]
  );
  return result.affectedRows > 0;
}

// ─── Capitaines ───────────────────────────────────────────────────────────────

async function setCapitaine(discordUserId, teamId) {
  await pool.execute(
    `INSERT INTO capitaines_discord (discord_user_id, team_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE team_id = VALUES(team_id)`,
    [discordUserId, teamId]
  );
}

async function removeCapitaine(discordUserId) {
  const [result] = await pool.execute(
    `DELETE FROM capitaines_discord WHERE discord_user_id = ?`,
    [discordUserId]
  );
  return result.affectedRows > 0;
}

async function getCapitaineTeam(discordUserId) {
  const [rows] = await pool.execute(
    `SELECT cd.*, t.name AS team_name, t.logo_url AS team_logo
     FROM capitaines_discord cd
     JOIN teams t ON t.id = cd.team_id
     WHERE cd.discord_user_id = ?`,
    [discordUserId]
  );
  return rows[0] || null;
}

async function getAllCapitaines() {
  const [rows] = await pool.execute(
    `SELECT cd.*, t.name AS team_name
     FROM capitaines_discord cd
     JOIN teams t ON t.id = cd.team_id
     ORDER BY t.name ASC`
  );
  return rows;
}

/**
 * Returns true if the captain's team is involved in this match
 * (matches via team names against the teams table).
 */
async function isMatchForCapitaine(matchId, discordUserId) {
  const [rows] = await pool.execute(
    `SELECT dm.id
     FROM discord_matches dm
     JOIN teams t ON (t.name = dm.team1_name OR t.name = dm.team2_name)
     JOIN capitaines_discord cd ON cd.team_id = t.id
     WHERE cd.discord_user_id = ? AND dm.id = ?`,
    [discordUserId, matchId]
  );
  return rows.length > 0;
}

module.exports = {
  pool,
  testConnection,
  setupDatabase,
  getAllPendingMatches,
  getUpcomingMatchesInDays,
  getMatchById,
  setMatchDate,
  setCapitaine,
  removeCapitaine,
  getCapitaineTeam,
  getAllCapitaines,
  isMatchForCapitaine,
};
