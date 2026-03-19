require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const cron = require('node-cron');
const { testConnection } = require('./database');
const { checkNewMatches, rescheduleAnnouncementDeletions } = require('./matchAnnouncer');
const { refreshCalendar } = require('./calendarManager');
const { setupCommand, refreshCommand, ticketCommand, lookScrimCommand, handleSetup, handleRefresh, handleTicket, handleLookScrim } = require('./commands');
const { createTicket, closeTicket } = require('./ticketManager');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

async function registerCommands(clientId) {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const commands = [setupCommand.toJSON(), refreshCommand.toJSON(), ticketCommand.toJSON(), lookScrimCommand.toJSON()];

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

  // Re-schedule pending announcement deletions from before restart
  rescheduleAnnouncementDeletions(client);

  // Initial run on startup
  await checkNewMatches(client);
  await refreshCalendar(client);

  // Check for new matches every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    checkNewMatches(client);
  });

  // Refresh calendar channel every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    refreshCalendar(client);
  });

  console.log('[Bot] Tâches planifiées actives. Bot prêt !');
});

client.on('interactionCreate', async (interaction) => {
  let handler = null;

  if (interaction.isChatInputCommand()) {
    handler =
      interaction.commandName === 'setup' ? handleSetup(interaction, client) :
      interaction.commandName === 'refresh' ? handleRefresh(interaction, client) :
      interaction.commandName === 'ticket' ? handleTicket(interaction) :
      interaction.commandName === 'look-scrim' ? handleLookScrim(interaction) :
      null;
  } else if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_open') {
    handler = createTicket(interaction, interaction.values[0]);
  } else if (interaction.isButton() && interaction.customId === 'ticket_close') {
    handler = closeTicket(interaction);
  }

  if (handler) {
    await handler.catch((err) => {
      console.error('[Bot] Erreur interaction:', err);
      const reply = interaction.deferred || interaction.replied
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
