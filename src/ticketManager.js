const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const state = require('./state');

const TICKET_TYPES = {
  roster: { label: 'Valider mon roster', emoji: '📋', color: 0x5555cc },
  questions: { label: "J'ai des questions", emoji: '❓', color: 0xffaa00 },
  suggestions: { label: "J'ai des suggestions", emoji: '💡', color: 0x00cc66 },
};

function buildTicketSelectMenu() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket_open')
    .setPlaceholder('Choisissez le motif de votre ticket...')
    .addOptions([
      {
        label: 'Valider mon roster',
        description: 'Soumettre votre roster pour validation',
        value: 'roster',
        emoji: '📋',
      },
      {
        label: "J'ai des questions",
        description: 'Poser une question au staff',
        value: 'questions',
        emoji: '❓',
      },
      {
        label: "J'ai des suggestions",
        description: 'Proposer une amélioration ou une idée',
        value: 'suggestions',
        emoji: '💡',
      },
    ]);

  return new ActionRowBuilder().addComponents(select);
}

async function handleTicketOpen(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x5555cc)
    .setTitle('🎫 Ouvrir un ticket')
    .setDescription('Sélectionnez le motif de votre demande dans le menu ci-dessous.\nUn canal privé sera créé pour vous.');

  return interaction.reply({
    embeds: [embed],
    components: [buildTicketSelectMenu()],
    ephemeral: true,
  });
}

async function createTicket(interaction, type) {
  const ticketType = TICKET_TYPES[type];
  if (!ticketType) return;

  const categoryId = state.getTicketCategoryId();
  const guild = interaction.guild;
  const user = interaction.user;

  const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || user.id;
  const channelName = `ticket-${type}-${safeName}`;

  const existing = guild.channels.cache.find(
    (ch) => ch.name === channelName && (!categoryId || ch.parentId === categoryId)
  );
  if (existing) {
    return interaction.update({
      content: `❌ Vous avez déjà un ticket ouvert : <#${existing.id}>`,
      embeds: [],
      components: [],
    });
  }

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId || undefined,
    permissionOverwrites,
  });

  const embed = new EmbedBuilder()
    .setColor(ticketType.color)
    .setTitle(`${ticketType.emoji} ${ticketType.label}`)
    .setDescription(
      `Bonjour <@${user.id}> !\n\nVotre ticket a été créé. Un membre du staff vous répondra dès que possible.\n\nPour fermer ce ticket, cliquez sur le bouton ci-dessous.`
    )
    .setFooter({ text: `Ticket de ${user.tag}` })
    .setTimestamp();

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Fermer le ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );

  await channel.send({ content: `<@${user.id}>`, embeds: [embed], components: [closeRow] });

  return interaction.update({
    content: `✅ Votre ticket a été créé : <#${channel.id}>`,
    embeds: [],
    components: [],
  });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;

  await interaction.reply({ content: '🔒 Ce ticket sera fermé dans 5 secondes...' });

  setTimeout(() => {
    channel.delete().catch((err) => {
      console.error('[Ticket] Impossible de supprimer le canal:', err);
    });
  }, 5000);
}

module.exports = { handleTicketOpen, createTicket, closeTicket };
