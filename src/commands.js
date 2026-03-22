const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const state = require('./state');
const { refreshCalendar } = require('./calendarManager');
const { checkNewMatches } = require('./matchAnnouncer');
const {
  setCapitaine,
  removeCapitaine,
  getCapitaineTeam,
  getAllCapitaines,
  isMatchForCapitaine,
  setMatchDate,
  getMatchById,
} = require('./database');
const { refreshAllTeamChannels } = require('./calendarManager');
const { refreshListing } = require('./listingManager');
const { refreshGuide } = require('./guideManager');
const { getAllTeams, getUnassignedTeams, getCapitaineByTeamId } = require('./database');
const { handleTicketOpen, postTicketPanel } = require('./ticketManager');
const { postReglement } = require('./reglementManager');

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
      .setName('equipe')
      .setDescription("Canal dédié aux annonces d'une équipe (ses matchs uniquement)")
      .addChannelOption((opt) =>
        opt.setName('canal').setDescription("Canal de l'équipe").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('equipe').setDescription("Nom de l'équipe").setRequired(true).setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('listing')
      .setDescription('Canal affichant la liste des capitaines par équipe')
      .addChannelOption((opt) =>
        opt.setName('canal').setDescription('Canal du listing').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('guide')
      .setDescription('Canal affichant les commandes utiles aux capitaines')
      .addChannelOption((opt) =>
        opt.setName('canal').setDescription('Canal du guide capitaines').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('ticket-panel')
      .setDescription('Poster le panneau de création de ticket dans un canal')
      .addChannelOption((opt) =>
        opt.setName('canal').setDescription('Canal où poster le panneau ticket').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('reglement')
      .setDescription('Poster le règlement du tournoi dans un canal (avec navigation par sections)')
      .addChannelOption((opt) =>
        opt.setName('canal').setDescription('Canal où poster le règlement').setRequired(true)
      )
  );

const ticketCommand = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Ouvrir un ticket avec le staff');

const refreshCommand = new SlashCommandBuilder()
  .setName('refresh')
  .setDescription('Forcer la vérification des nouveaux matchs et la mise à jour du calendrier')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const capitaineCommand = new SlashCommandBuilder()
  .setName('capitaine')
  .setDescription('Gérer les capitaines associés aux équipes')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Associer un utilisateur Discord à une équipe (capitaine)')
      .addUserOption((opt) =>
        opt.setName('utilisateur').setDescription('Utilisateur Discord à désigner capitaine').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('equipe').setDescription("Nom de l'équipe").setRequired(true).setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription("Retirer le rôle capitaine d'un utilisateur")
      .addUserOption((opt) =>
        opt.setName('utilisateur').setDescription('Utilisateur à retirer').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('list').setDescription('Lister tous les capitaines enregistrés')
  );

const setdateCommand = new SlashCommandBuilder()
  .setName('setdate')
  .setDescription('Définir la date et l\'heure d\'un de vos matchs (capitaines uniquement)')
  .addIntegerOption((opt) =>
    opt.setName('match_id').setDescription('ID du match (visible dans le calendrier)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('date').setDescription('Date du match (ex: 25/03/2026 ou 25/03)').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('heure').setDescription('Heure du match (ex: 21:00 ou 21h00)').setRequired(true)
  );

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
        { name: 'BO2', value: 'BO2' },
        { name: 'BO3', value: 'BO3' }
      )
  );

async function handleSetup(interaction, client) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'status') {
    const annId = state.getAnnouncementChannelId();
    const calId = state.getCalendarChannelId();
    const ticketCatId = state.getTicketCategoryId();
    const teamChannels = state.getAllTeamChannelIds();
    const teamLines = Object.entries(teamChannels).map(
      ([tid, cid]) => `Équipe \`#${tid}\` → <#${cid}>`
    );
    const embed = new EmbedBuilder()
      .setColor(0x5555cc)
      .setTitle('⚙️ Configuration des canaux')
      .addFields(
        { name: "📢 Canal d'annonces", value: annId ? `<#${annId}>` : '❌ Non configuré', inline: true },
        { name: '📅 Canal calendrier', value: calId ? `<#${calId}>` : '❌ Non configuré', inline: true },
        { name: '🎫 Catégorie tickets', value: ticketCatId ? `<#${ticketCatId}>` : '❌ Non configuré', inline: true },
        {
          name: '🏅 Canaux équipes',
          value: teamLines.length > 0 ? teamLines.join('\n') : '❌ Aucun configuré',
        },
        {
          name: '📋 Canal listing',
          value: state.getListingChannelId() ? `<#${state.getListingChannelId()}>` : '❌ Non configuré',
          inline: true,
        },
        {
          name: '📖 Canal guide capitaines',
          value: state.getGuideChannelId() ? `<#${state.getGuideChannelId()}>` : '❌ Non configuré',
          inline: true,
        },
        {
          name: '📜 Canal règlement',
          value: state.getReglementChannelId() ? `<#${state.getReglementChannelId()}>` : '❌ Non configuré',
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

  if (sub === 'listing') {
    state.setListingChannelId(channel.id);
    await interaction.deferReply({ ephemeral: true });
    await refreshListing(client);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`✅ Canal listing configuré sur <#${channel.id}>\nLa liste des capitaines y est affichée et mise à jour automatiquement.`),
      ],
    });
  }

  if (sub === 'guide') {
    state.setGuideChannelId(channel.id);
    state.setGuideMessageId(null);
    await interaction.deferReply({ ephemeral: true });
    await refreshGuide(client);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`✅ Canal guide capitaines configuré sur <#${channel.id}>\nLes commandes utiles y sont affichées et mises à jour automatiquement.`),
      ],
    });
  }

  if (sub === 'ticket-panel') {
    await interaction.deferReply({ ephemeral: true });
    await postTicketPanel(channel);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`✅ Panneau ticket posté dans <#${channel.id}>`),
      ],
    });
  }

  if (sub === 'equipe') {
    const teamId = parseInt(interaction.options.getString('equipe'), 10);
    if (isNaN(teamId)) {
      return interaction.reply({ content: '❌ Équipe invalide. Sélectionnez une équipe dans la liste.', ephemeral: true });
    }
    state.setTeamChannelId(teamId, channel.id);
    await interaction.deferReply({ ephemeral: true });
    await refreshAllTeamChannels(client);

    // Ping the captain of this team in the team channel
    const cap = await getCapitaineByTeamId(teamId);
    const teamLabel = cap ? cap.team_name : `équipe #${teamId}`;
    if (cap) {
      await channel.send(`👋 <@${cap.discord_user_id}>, ce canal est maintenant configuré pour les matchs de **${cap.team_name}** !`);
    }

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`✅ Canal équipe configuré sur <#${channel.id}> pour **${teamLabel}**\nLes matchs de cette équipe y seront affichés et mis à jour automatiquement.`),
      ],
    });
  }

  if (sub === 'reglement') {
    await interaction.deferReply({ ephemeral: true });
    await postReglement(channel);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`✅ Règlement posté dans <#${channel.id}>\nLes 7 sections sont navigables via les boutons.`),
      ],
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

async function handleCapitaine(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const user = interaction.options.getUser('utilisateur');
    const teamId = parseInt(interaction.options.getString('equipe'), 10);
    if (isNaN(teamId)) {
      return interaction.reply({ content: '❌ Équipe invalide. Sélectionnez une équipe dans la liste.', ephemeral: true });
    }
    try {
      await setCapitaine(user.id, teamId);
      await refreshListing(interaction.client);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00cc66)
            .setDescription(`✅ **${user.username}** est maintenant capitaine de l'équipe \`#${teamId}\`.`),
        ],
        ephemeral: true,
      });
    } catch (err) {
      return interaction.reply({ content: `❌ Erreur : ${err.message}`, ephemeral: true });
    }
  }

  if (sub === 'remove') {
    const user = interaction.options.getUser('utilisateur');
    const removed = await removeCapitaine(user.id);
    if (removed) await refreshListing(interaction.client);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(removed ? 0x00cc66 : 0xcc4400)
          .setDescription(
            removed
              ? `✅ **${user.username}** n'est plus capitaine.`
              : `⚠️ **${user.username}** n'était pas enregistré comme capitaine.`
          ),
      ],
      ephemeral: true,
    });
  }

  if (sub === 'list') {
    const capitaines = await getAllCapitaines();
    if (capitaines.length === 0) {
      return interaction.reply({ content: 'Aucun capitaine enregistré.', ephemeral: true });
    }
    const lines = capitaines.map(
      (c) => `<@${c.discord_user_id}> — **${c.team_name}** (team #${c.team_id})`
    );
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5555cc)
          .setTitle('🏅 Capitaines enregistrés')
          .setDescription(lines.join('\n')),
      ],
      ephemeral: true,
    });
  }
}

function parseMatchDateTime(dateStr, heureStr) {
  const dateParts = dateStr.trim().split('/');
  if (dateParts.length < 2) return null;
  const day   = dateParts[0].padStart(2, '0');
  const month = dateParts[1].padStart(2, '0');
  const year  = (dateParts[2] || new Date().getFullYear()).toString();

  const heureClean = heureStr.trim().toLowerCase().replace(/[h]/g, ':').replace(/:+$/, '');
  const [h = '00', m = '00'] = heureClean.split(':');

  if (isNaN(parseInt(day)) || isNaN(parseInt(month)) || isNaN(parseInt(h))) return null;

  return `${year}-${month}-${day} ${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}

async function handleSetdate(interaction, client) {
  const matchId = interaction.options.getInteger('match_id');
  const dateStr = interaction.options.getString('date');
  const heureStr = interaction.options.getString('heure');

  // Check captain status
  const capitaine = await getCapitaineTeam(interaction.user.id);
  if (!capitaine) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xcc0000)
          .setDescription('❌ Vous n\'êtes pas enregistré comme capitaine. Contactez un administrateur.'),
      ],
      ephemeral: true,
    });
  }

  // Check the match exists
  const match = await getMatchById(matchId);
  if (!match) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xcc0000)
          .setDescription(`❌ Aucun match trouvé avec l'ID \`#${matchId}\`.`),
      ],
      ephemeral: true,
    });
  }

  // Check the match belongs to the captain's team
  const hasAccess = await isMatchForCapitaine(matchId, interaction.user.id);
  if (!hasAccess) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xcc0000)
          .setDescription(
            `❌ Le match \`#${matchId}\` (**${match.team1_name}** vs **${match.team2_name}**) ne concerne pas votre équipe (**${capitaine.team_name}**).`
          ),
      ],
      ephemeral: true,
    });
  }

  // Parse date/time
  const dateTimeStr = parseMatchDateTime(dateStr, heureStr);
  if (!dateTimeStr) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xcc4400)
          .setDescription('❌ Format invalide. Utilisez `DD/MM/YYYY` pour la date et `HH:MM` pour l\'heure.\nExemple : `/setdate match_id:42 date:25/03/2026 heure:21:00`'),
      ],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const updated = await setMatchDate(matchId, dateTimeStr);
  if (!updated) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xcc0000)
          .setDescription(`❌ Impossible de mettre à jour le match \`#${matchId}\`. Il est peut-être déjà terminé.`),
      ],
    });
  }

  // Delete old calendar card from Discord then clear state so refresh reposts it
  const calMsgId = state.getCalendarMessageId(String(matchId));
  if (calMsgId) {
    const calChannelId = state.getCalendarChannelId();
    if (calChannelId) {
      const calChannel = await client.channels.fetch(calChannelId).catch(() => null);
      if (calChannel) {
        const oldMsg = await calChannel.messages.fetch(calMsgId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }
    }
    state.removeCalendarMessageId(String(matchId));
  }

  // For each team channel, delete ALL tracked cards and clear state entirely.
  // This ensures a full ordered repost — including any card left orphaned from
  // previous sessions that would otherwise block the update (imageOnly continue).
  const teamChannels = state.getAllTeamChannelIds();
  for (const [tid, tcid] of Object.entries(teamChannels)) {
    const allMsgs = state.getAllTeamMessageIds(tid);
    const teamChannel = await client.channels.fetch(tcid).catch(() => null);
    for (const [mid, msgId] of Object.entries(allMsgs)) {
      if (teamChannel) {
        const oldMsg = await teamChannel.messages.fetch(msgId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }
      state.removeTeamMessageId(tid, mid);
    }
  }

  await Promise.all([refreshCalendar(client), refreshAllTeamChannels(client)]);

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x00cc66)
        .setTitle('✅ Date définie')
        .setDescription(
          `Match \`#${matchId}\` (**${match.team1_name}** vs **${match.team2_name}**)\n📅 **${dateStr}** à **${heureStr}**\n\nLe calendrier a été mis à jour.`
        ),
    ],
  });
}

async function handleAutocomplete(interaction) {
  const { commandName } = interaction;
  const sub = interaction.options.getSubcommand(false);
  const focused = interaction.options.getFocused().toLowerCase();

  // /capitaine add equipe → non-assigned teams
  if (commandName === 'capitaine' && sub === 'add') {
    const teams = await getUnassignedTeams();
    const choices = teams
      .filter((t) => t.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((t) => ({ name: t.name, value: String(t.id) }));
    return interaction.respond(choices);
  }

  // /setup equipe equipe → all teams (can reassign a channel)
  if (commandName === 'setup' && sub === 'equipe') {
    const teams = await getAllTeams();
    const choices = teams
      .filter((t) => t.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((t) => ({ name: t.name, value: String(t.id) }));
    return interaction.respond(choices);
  }

  return interaction.respond([]);
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

module.exports = {
  setupCommand,
  refreshCommand,
  ticketCommand,
  lookScrimCommand,
  capitaineCommand,
  setdateCommand,
  handleSetup,
  handleRefresh,
  handleTicket,
  handleLookScrim,
  handleCapitaine,
  handleSetdate,
  handleAutocomplete,
};
