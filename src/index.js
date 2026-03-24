require('dotenv').config();

const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const cron = require('node-cron');
const { testConnection, setupDatabase } = require('./database');
const { checkNewMatches, rescheduleAnnouncementDeletions } = require('./matchAnnouncer');
const { refreshCalendar, refreshAllTeamChannels } = require('./calendarManager');
const { refreshListing } = require('./listingManager');
const { refreshGuide } = require('./guideManager');
const { refreshCommandes } = require('./commandesManager');
const {
  setupCommand, refreshCommand, ticketCommand, lookScrimCommand,
  capitaineCommand, setdateCommand, resultatCommand, correctResultCommand,
  handleSetup, handleRefresh, handleTicket, handleLookScrim,
  handleCapitaine, handleSetdate, handleResultat, handleCorrectResult, handleAutocomplete,
} = require('./commands');
const { createTicket, closeTicket, handleTicketOpen } = require('./ticketManager');
const { handleReglementNav } = require('./reglementManager');
const { handleReactionAdd } = require('./sideReactionManager');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

async function registerCommands(clientId) {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const commands = [
    setupCommand.toJSON(),
    refreshCommand.toJSON(),
    ticketCommand.toJSON(),
    lookScrimCommand.toJSON(),
    capitaineCommand.toJSON(),
    setdateCommand.toJSON(),
    resultatCommand.toJSON(),
    correctResultCommand.toJSON(),
  ];

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
    await setupDatabase();
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
  await refreshAllTeamChannels(client);
  await refreshListing(client);
  await refreshGuide(client);
  await refreshCommandes(client);

  // Check for new matches every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    checkNewMatches(client);
  });

  // Refresh calendar, team channels and listing every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    refreshCalendar(client);
    refreshAllTeamChannels(client);
    refreshListing(client);
    refreshGuide(client);
    refreshCommandes(client);
  });

  console.log('[Bot] Tâches planifiées actives. Bot prêt !');
});

client.on('interactionCreate', async (interaction) => {
  // Autocomplete interactions must be handled immediately (no deferring)
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction).catch((err) => {
      console.error('[Bot] Erreur autocomplete:', err);
      interaction.respond([]).catch(() => {});
    });
    return;
  }

  let handler = null;

  if (interaction.isChatInputCommand()) {
    handler =
      interaction.commandName === 'setup'      ? handleSetup(interaction, client) :
      interaction.commandName === 'refresh'    ? handleRefresh(interaction, client) :
      interaction.commandName === 'ticket'     ? handleTicket(interaction) :
      interaction.commandName === 'look-scrim' ? handleLookScrim(interaction) :
      interaction.commandName === 'capitaine'  ? handleCapitaine(interaction) :
      interaction.commandName === 'setdate'    ? handleSetdate(interaction, client) :
      interaction.commandName === 'resultat'        ? handleResultat(interaction, client) :
      interaction.commandName === 'correct-result'  ? handleCorrectResult(interaction, client) :
      null;
  } else if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_open') {
    handler = createTicket(interaction, interaction.values[0]);
  } else if (interaction.isButton() && interaction.customId === 'ticket_close') {
    handler = closeTicket(interaction);
  } else if (interaction.isButton() && interaction.customId === 'ticket_panel_open') {
    handler = handleTicketOpen(interaction);
  } else if (interaction.isButton() && interaction.customId.startsWith('reglement_nav_')) {
    const targetPage = parseInt(interaction.customId.replace('reglement_nav_', ''), 10);
    handler = handleReglementNav(interaction, targetPage);
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

client.on('messageReactionAdd', async (reaction, user) => {
  await handleReactionAdd(reaction, user, client).catch((err) => {
    console.error('[Bot] Erreur réaction:', err);
  });
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
