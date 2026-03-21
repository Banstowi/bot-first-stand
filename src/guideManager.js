const { EmbedBuilder } = require('discord.js');
const state = require('./state');

function buildGuideEmbeds() {
  const commands = new EmbedBuilder()
    .setColor(0x5555cc)
    .setTitle('📖 Guide des Capitaines')
    .setDescription('Bienvenue ! Voici toutes les commandes disponibles pour les capitaines d\'équipe.')
    .addFields(
      {
        name: '📅 Programmer un match — `/setdate`',
        value: [
          '```/setdate match_id:<id> date:<JJ/MM> heure:<HH:MM>```',
          'Définissez la date et l\'heure de l\'un de vos matchs.',
          "L'ID du match est visible dans votre salon équipe ou le calendrier général.",
          '> **Exemple :** `/setdate match_id:42 date:25/03 heure:21:00`',
        ].join('\n'),
      },
      {
        name: '🎮 Rechercher un scrim — `/look-scrim`',
        value: [
          '```/look-scrim equipe:<rôle> date:<JJ/MM> heure:<HH> bo:<format>```',
          'Publiez une annonce de recherche de scrim pour votre équipe.',
          '> **Exemple :** `/look-scrim equipe:@MonEquipe date:22/03 heure:21H bo:BO3`',
        ].join('\n'),
      },
    )
    .setFooter({ text: 'Ce message est mis à jour automatiquement.' })
    .setTimestamp();

  return [commands];
}

async function refreshGuide(client) {
  const channelId = state.getGuideChannelId();
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`[Guide] Canal introuvable: ${channelId}`);
    return;
  }

  const embeds = buildGuideEmbeds();

  const existingMsgId = state.getGuideMessageId();
  if (existingMsgId) {
    const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
    if (existingMsg) {
      await existingMsg.edit({ embeds });
      console.log('[Guide] Guide mis à jour.');
      return;
    }
  }

  const sent = await channel.send({ embeds });
  state.setGuideMessageId(sent.id);
  console.log('[Guide] Guide posté.');
}

module.exports = { refreshGuide };
