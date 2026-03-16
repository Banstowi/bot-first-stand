require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const cron = require('node-cron');
const { testConnection } = require('./database');
const { checkNewMatches } = require('./matchAnnouncer');
const { refreshCalendar } = require('./calendarManager');
const { setupCommand, handleSetup } = require('./commands');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

async function registerCommands(clientId) {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const commands = [setupCommand.toJSON()];

  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('[Bot] Commandes slash enregistrées globalement.');
  } catch (err) {
    console.error('[Bot] Erreur lors de l\'enregistrement des commandes:', err);
  }
}

client.once('ready', async () => {
  console.log(`[Bot] Connecté en tant que ${client.user.tag}`);

  // Test DB connection
  try {
    await testConnection();
  } catch (err) {
    console.error('[Bot] Impossible de se connecter à la BDD:', err);
    process.exit(1);
  }

  // Register slash commands
  await registerCommands(client.user.id);

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

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'setup') {
    await handleSetup(interaction, client).catch((err) => {
      console.error('[Bot] Erreur commande /setup:', err);
      const reply = interaction.deferred
        ? interaction.editReply('❌ Une erreur est survenue.')
        : interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
      reply.catch(() => {});
    });
  }
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
