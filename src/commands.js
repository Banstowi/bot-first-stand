const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const state = require('./state');
const { refreshCalendar } = require('./calendarManager');

const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configurer les canaux du bot de tournoi')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('annonce')
      .setDescription("Canal où les nouveaux matchs seront annoncés 1h avant (avec @everyone)")
      .addChannelOption((opt) =>
        opt.setName('canal').setDescription('Canal d\'annonce').setRequired(true)
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
  );

async function handleSetup(interaction, client) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'status') {
    const annId = state.getAnnouncementChannelId();
    const calId = state.getCalendarChannelId();
    const embed = new EmbedBuilder()
      .setColor(0x5555cc)
      .setTitle('⚙️ Configuration des canaux')
      .addFields(
        {
          name: '📢 Canal d\'annonces',
          value: annId ? `<#${annId}>` : '❌ Non configuré',
          inline: true,
        },
        {
          name: '📅 Canal calendrier',
          value: calId ? `<#${calId}>` : '❌ Non configuré',
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
    // Immediately refresh calendar in the new channel
    await refreshCalendar(client);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00cc66)
          .setDescription(`✅ Canal calendrier configuré sur <#${channel.id}>\nLes matchs des 3 prochains jours y sont affichés et mis à jour toutes les 15 minutes.`),
      ],
    });
  }
}

module.exports = { setupCommand, handleSetup };
