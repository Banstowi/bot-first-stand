const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
});

async function testConnection() {
  const conn = await pool.getConnection();
  conn.release();
  console.log('[DB] Connexion réussie à la base de données.');
}

async function getAllPendingMatches() {
  const [rows] = await pool.execute(
    `SELECT * FROM discord_matches WHERE status = 'PENDING' ORDER BY match_date ASC`
  );
  return rows;
}

async function getUpcomingMatchesInDays(days = 3) {
  const [rows] = await pool.execute(
    `SELECT * FROM discord_matches
     WHERE status = 'PENDING'
       AND match_date >= NOW()
       AND match_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
     ORDER BY match_date ASC`,
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

module.exports = { pool, testConnection, getAllPendingMatches, getUpcomingMatchesInDays, getMatchById };
