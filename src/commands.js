const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const state = require('./state');
const { refreshCalendar } = require('./calendarManager');
const { checkNewMatches } = require('./matchAnnouncer');
const { handleTicketOpen } = require('./ticketManager');

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
  );

const ticketCommand = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Ouvrir un ticket avec le staff');

const refreshCommand = new SlashCommandBuilder()
  .setName('refresh')
  .setDescription('Forcer la vérification des nouveaux matchs et la mise à jour du calendrier')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const lookScrimCommand = new SlashCommandBuilder()
  .setName('look-scrim')
  .setDescription('Poster une recherche de scrim pour votre équipe')
  .addRoleOption((opt) =>
    opt.setName('equipe').setDescription('Votre équipe (rôle)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('date').setDescription('Date du scrim (ex: 22/03)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('heure').setDescription("Heure du scrim (ex: 21H)").setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('bo')
      .setDescription('Format du match')
      .setRequired(true)
      .addChoices(
        { name: 'BO1', value: 'BO1' },
        { name: 'BO1 Fearless', value: 'BO1 Fearless' },
        { name: 'BO2', value: 'BO2' },
        { name: 'BO2 Fearless', value: 'BO2 Fearless' },
        { name: 'BO3', value: 'BO3' },
        { name: 'BO3 Fearless', value: 'BO3 Fearless' }
      )
  );

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
}

async function handleTicket(interaction) {
  return handleTicketOpen(interaction);
}

async function handleLookScrim(interaction) {
  const role = interaction.options.getRole('equipe');
  const date = interaction.options.getString('date');
  const heure = interaction.options.getString('heure');
  const bo = interaction.options.getString('bo');

  if (!interaction.member.roles.cache.has(role.id)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xcc0000)
          .setDescription(`❌ Vous n'avez pas le rôle **${role.name}** et ne pouvez pas poster une recherche de scrim pour cette équipe.`),
      ],
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle('⚔️ Recherche scrim')
    .addFields(
      { name: '🏅 Équipe', value: `<@&${role.id}>`, inline: true },
      { name: '📅 Date', value: `${date} - ${heure}`, inline: true },
      { name: '✳️ Format', value: bo, inline: true }
    )
    .setFooter({ text: `Posté par ${interaction.user.username}` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
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

module.exports = { setupCommand, refreshCommand, ticketCommand, lookScrimCommand, handleSetup, handleRefresh, handleTicket, handleLookScrim };
