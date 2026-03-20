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

  const embed = new EmbedBuilder()
    .setColor(0x5555cc)
    .setTitle('🏅 Capitaines des équipes')
    .setTimestamp();

  if (capitaines.length === 0) {
    embed.setDescription('Aucun capitaine enregistré pour le moment.');
  } else {
    for (const c of capitaines) {
      embed.addFields({ name: c.team_name, value: `<@${c.discord_user_id}>`, inline: true });
    }
  }

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
