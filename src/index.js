require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const { testConnection } = require('./database');
const { checkNewMatches } = require('./matchAnnouncer');
const { refreshCalendar } = require('./calendarManager');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', async () => {
  console.log(`[Bot] Connecté en tant que ${client.user.tag}`);

  // Test DB connection
  try {
    await testConnection();
  } catch (err) {
    console.error('[Bot] Impossible de se connecter à la BDD:', err);
    process.exit(1);
  }

  // Initial run on startup
  await checkNewMatches(client);
  await refreshCalendar(client);

  // Check for new matches every minute
  cron.schedule('* * * * *', () => {
    checkNewMatches(client);
  });

  // Refresh calendar channel every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    refreshCalendar(client);
  });

  console.log('[Bot] Tâches planifiées actives. Bot prêt !');
});

client.on('error', (err) => {
  console.error('[Discord] Erreur client:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[Bot] Rejet non géré:', err);
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('[Bot] Impossible de se connecter à Discord:', err);
  process.exit(1);
});
