const { EmbedBuilder } = require('discord.js');
const state = require('./state');

function buildCommandesEmbeds() {
  const matchCmds = new EmbedBuilder()
    .setColor(0x5555cc)
    .setTitle('⚔️ Commandes de match — Capitaines')
    .setDescription('Commandes disponibles pour gérer vos matchs de tournoi.')
    .addFields(
      {
        name: '📅 Programmer une date — `/setdate`',
        value: [
          '```/setdate match_id:<id> date:<JJ/MM> heure:<HH:MM>```',
          "Définissez la date et l'heure d'un de vos matchs.",
          "L'ID du match est visible dans votre salon équipe ou le calendrier.",
          '> **Exemple :** `/setdate match_id:42 date:25/03 heure:21:00`',
        ].join('\n'),
      },
      {
        name: '🏆 Soumettre un résultat — `/resultat`',
        value: [
          '```/resultat match_id:<id> winner:<équipe> nexus_gagnant:<2|3> nexus_perdant:<0|1|2>```',
          "Enregistrez le résultat d'un de vos matchs une fois terminé.",
          '`nexus_gagnant` = parties gagnées par le vainqueur · `nexus_perdant` = parties gagnées par le perdant.',
          '> **Exemple :** `/resultat match_id:42 winner:MonEquipe nexus_gagnant:2 nexus_perdant:1`',
        ].join('\n'),
      },
      {
        name: '🎮 Rechercher un scrim — `/look-scrim`',
        value: [
          '```/look-scrim equipe:<rôle> date:<JJ/MM> heure:<HH> bo:<format>```',
          "Publiez une annonce de recherche de scrim pour votre équipe.",
          '> **Exemple :** `/look-scrim equipe:@MonEquipe date:22/03 heure:21H bo:BO3`',
        ].join('\n'),
      },
    )
    .setFooter({ text: 'Ce message est mis à jour automatiquement.' })
    .setTimestamp();

  const sidePickExpl = new EmbedBuilder()
    .setColor(0x2244aa)
    .setTitle('🔵🔴 Choix du side — Comment ça marche ?')
    .setDescription(
      "Dans votre salon équipe, chaque carte de match affiche les **points** des deux équipes et deux réactions : 🔵 et 🔴.\n\u200b"
    )
    .addFields(
      {
        name: '📊 Qui choisit ?',
        value:
          "**L'équipe avec le moins de points** a le droit de choisir son side pour la première partie.\n" +
          "Si votre équipe a plus de points que l'adversaire, c'est **l'adversaire qui choisit** — vos réactions seront supprimées automatiquement.",
      },
      {
        name: '🔵 Réagir = choisir',
        value:
          '`🔵` → Votre équipe joue **Blue side** en game 1\n' +
          '`🔴` → Votre équipe joue **Red side** en game 1\n\n' +
          "Une fois votre choix effectué, il est **définitif** — l'autre réaction disparaît et la carte de match se met à jour.",
      },
      {
        name: '⚠️ Règles importantes',
        value: [
          '• Seul le **capitaine de l\'équipe avec le moins de points** peut voter.',
          '• Toute réaction d\'un autre joueur est supprimée immédiatement.',
          '• Le choix ne peut pas être modifié après validation.',
          '• En cas de points **égaux**, aucune équipe ne peut choisir.',
        ].join('\n'),
      },
    );

  return [matchCmds, sidePickExpl];
}

async function refreshCommandes(client) {
  const channelId = state.getCommandesChannelId();
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`[Commandes] Canal introuvable: ${channelId}`);
    return;
  }

  const embeds = buildCommandesEmbeds();

  const existingMsgId = state.getCommandesMessageId();
  if (existingMsgId) {
    const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
    if (existingMsg) {
      await existingMsg.edit({ embeds });
      console.log('[Commandes] Panneau commandes mis à jour.');
      return;
    }
  }

  const sent = await channel.send({ embeds });
  state.setCommandesMessageId(sent.id);
  console.log('[Commandes] Panneau commandes posté.');
}

module.exports = { refreshCommandes };
