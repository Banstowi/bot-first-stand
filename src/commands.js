const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const state = require('./state');
const { refreshCalendar } = require('./calendarManager');
const { checkNewMatches } = require('./matchAnnouncer');
const { handleTicketOpen, sendTicketPanel } = require('./ticketManager');

const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configurer les canaux du bot de tournoi')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('annonce')
      .setDescription("Canal où les nouveaux matchs seront annoncés 1h avant (avec @everyone)")
      .addChannelOption((opt) =>
        opt.setName('canal').setDescription("Canal d'annonce").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('calendrier')
      .setDescription('Canal affichant les matchs des 3 prochains jours')
      .addChannelOption((opt) =>
        opt.setName('canal').setDescription('Canal calendrier').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('status').setDescription('Afficher la configuration actuelle des canaux')
  )
  .addSubcommand((sub) =>
    sub
      .setName('ticket')
      .setDescription('Catégorie Discord où seront créés les tickets')
      .addChannelOption((opt) =>
        opt
          .setName('categorie')
          .setDescription('Catégorie pour les tickets')
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('panel')
      .setDescription('Envoyer le message de création de ticket dans un canal')
      .addChannelOption((opt) =>
        opt
          .setName('canal')
          .setDescription('Canal où poster le panel de tickets')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  );

const ticketCommand = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Ouvrir un ticket avec le staff');

const refreshCommand = new SlashCommandBuilder()
  .setName('refresh')
  .setDescription('Forcer la vérification des nouveaux matchs et la mise à jour du calendrier')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

async function handleSetup(interaction, client) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'status') {
    const annId = state.getAnnouncementChannelId();
    const calId = state.getCalendarChannelId();
    const ticketCatId = state.getTicketCategoryId();
    const embed = new EmbedBuilder()
      .setColor(0x5555cc)
      .setTitle('⚙️ Configuration des canaux')
      .addFields(
        {
          name: "📢 Canal d'annonces",
          value: annId ? `<#${annId}>` : '❌ Non configuré',
          inline: true,
        },
        {
          name: '📅 Canal calendrier',
          value: calId ? `<#${calId}>` : '❌ Non configuré',
          inline: true,
        },
        {
          name: '🎫 Catégorie tickets',
          value: ticketCatId ? `<#${ticketCatId}>` : '❌ Non configuré',
          inline: true,
        }
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const channel = interaction.options.getChannel('canal');

  if (sub === 'annonce') {
    state.setAnnouncementChannelId(channel.id);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`✅ Canal d'annonces configuré sur <#${channel.id}>\nLes nouveaux matchs y seront annoncés **1h avant** avec @everyone.`),
      ],
      ephemeral: true,
    });
  }

  if (sub === 'calendrier') {
    state.setCalendarChannelId(channel.id);
    await interaction.deferReply({ ephemeral: true });
    await refreshCalendar(client);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`✅ Canal calendrier configuré sur <#${channel.id}>\nLes matchs des 3 prochains jours y sont affichés et mis à jour toutes les 15 minutes.`),
      ],
    });
  }

  if (sub === 'ticket') {
    const category = interaction.options.getChannel('categorie');
    state.setTicketCategoryId(category.id);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`✅ Catégorie tickets configurée sur **${category.name}**\nLes tickets créés par \`/ticket\` apparaîtront dans cette catégorie.`),
      ],
      ephemeral: true,
    });
  }

  if (sub === 'panel') {
    const canal = interaction.options.getChannel('canal');
    await interaction.deferReply({ ephemeral: true });
    await sendTicketPanel(canal);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`✅ Panel de tickets envoyé dans <#${canal.id}>`),
      ],
    });
  }
}

async function handleTicket(interaction) {
  return handleTicketOpen(interaction);
}

async function handleRefresh(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  await Promise.all([
    checkNewMatches(client),
    refreshCalendar(client),
  ]);

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x00cc66)
        .setDescription('✅ Actualisation forcée effectuée.\nNouveaux matchs vérifiés et calendrier mis à jour.'),
    ],
  });
}

module.exports = { setupCommand, refreshCommand, ticketCommand, handleSetup, handleRefresh, handleTicket };
