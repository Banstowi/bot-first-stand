const { EmbedBuilder } = require('discord.js');
const { getAllCapitaines } = require('./database');
const state = require('./state');

async function refreshListing(client) {
  const channelId = state.getListingChannelId();
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`[Listing] Canal introuvable: ${channelId}`);
    return;
  }

  const capitaines = await getAllCapitaines();

  let description;
  if (capitaines.length === 0) {
    description = 'Aucun capitaine enregistré pour le moment.';
  } else {
    // Resolve Discord display names
    const rows = [];
    for (const c of capitaines) {
      const user = await client.users.fetch(c.discord_user_id).catch(() => null);
      const name = user ? (user.globalName || user.username) : `<@${c.discord_user_id}>`;
      rows.push({ team: c.team_name, captain: name });
    }

    // Compute column widths
    const colTeam = Math.max('Équipe'.length, ...rows.map((r) => r.team.length));
    const colCap  = Math.max('Capitaine'.length, ...rows.map((r) => r.captain.length));

    const pad = (s, n) => s + ' '.repeat(n - s.length);
    const divider = '─'.repeat(colTeam + 1) + '┼' + '─'.repeat(colCap + 2);

    const lines = [
      `${pad('Équipe', colTeam)} │ Capitaine`,
      divider,
      ...rows.map((r) => `${pad(r.team, colTeam)} │ ${r.captain}`),
    ];

    description = '```\n' + lines.join('\n') + '\n```';
  }

  const embed = new EmbedBuilder()
    .setColor(0x5555cc)
    .setTitle('🥇 Capitaines des équipes')
    .setDescription(description)
    .setTimestamp();

  const existingMsgId = state.getListingMessageId();
  if (existingMsgId) {
    const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
    if (existingMsg) {
      await existingMsg.edit({ embeds: [embed] });
      console.log('[Listing] Listing mis à jour.');
      return;
    }
  }

  const sent = await channel.send({ embeds: [embed] });
  state.setListingMessageId(sent.id);
  console.log('[Listing] Listing posté.');
}

module.exports = { refreshListing };
