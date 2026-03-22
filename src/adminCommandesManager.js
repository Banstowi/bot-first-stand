const { EmbedBuilder } = require('discord.js');
const state = require('./state');

function buildAdminCommandesEmbeds() {
  const setupCmds = new EmbedBuilder()
    .setColor(0xcc4400)
    .setTitle('🛠️ Commandes Admin — Configuration')
    .setDescription('Commandes `/setup` pour configurer les canaux et panneaux du bot.')
    .addFields(
      {
        name: '📣 Annonces — `/setup annonce`',
        value: '```/setup annonce canal:<#canal>```\nDéfinit le canal où le bot publie les annonces de match (J-7, J-1).',
      },
      {
        name: '📅 Calendrier — `/setup calendrier`',
        value: '```/setup calendrier canal:<#canal>```\nDéfinit le canal du calendrier général des matchs.',
      },
      {
        name: '📋 Listing capitaines — `/setup listing`',
        value: '```/setup listing canal:<#canal>```\nAffiche et met à jour automatiquement la liste des capitaines par équipe.',
      },
      {
        name: '📖 Guide capitaines — `/setup guide`',
        value: '```/setup guide canal:<#canal>```\nPoste le guide des commandes disponibles pour les capitaines.',
      },
      {
        name: '⚔️ Commandes capitaines — `/setup commandes`',
        value: '```/setup commandes canal:<#canal>```\nPoste le panneau des commandes de match + explication du side-pick.',
      },
      {
        name: '🏆 Résultats — `/setup resultats`',
        value: '```/setup resultats canal:<#canal>```\nDéfinit le canal où les cartes de résultats sont postées après `/resultat`.',
      },
      {
        name: '📜 Règlement — `/setup reglement`',
        value: '```/setup reglement canal:<#canal>```\nPoste le règlement du tournoi.',
      },
      {
        name: '🎫 Tickets — `/setup ticket`',
        value: '```/setup ticket categorie:<catégorie>```\nDéfinit la catégorie Discord où les tickets de support sont créés.',
      },
      {
        name: '📌 Panel ticket — `/setup ticket-panel`',
        value: '```/setup ticket-panel canal:<#canal>```\nPoste le bouton de création de ticket dans le canal indiqué.',
      },
      {
        name: '🏠 Salon équipe — `/setup equipe`',
        value: '```/setup equipe equipe:<@role> canal:<#canal>```\nAssocie un canal Discord à une équipe pour afficher ses cartes de match.',
      },
      {
        name: '🛠️ Commandes admin — `/setup admin-commande`',
        value: '```/setup admin-commande canal:<#canal>```\nPoste ce panneau de commandes admin dans le canal indiqué.',
      },
    )
    .setFooter({ text: 'Ce message est mis à jour automatiquement.' })
    .setTimestamp();

  const manageCmds = new EmbedBuilder()
    .setColor(0xaa2200)
    .setTitle('👑 Commandes Admin — Gestion')
    .setDescription('Commandes de gestion des capitaines, résultats et base de données.')
    .addFields(
      {
        name: '➕ Ajouter un capitaine — `/capitaine add`',
        value: '```/capitaine add utilisateur:<@user> equipe:<id>```\nAssocie un utilisateur Discord à une équipe en tant que capitaine.',
      },
      {
        name: '➖ Retirer un capitaine — `/capitaine remove`',
        value: '```/capitaine remove utilisateur:<@user>```\nSupprime l\'association capitaine d\'un utilisateur.',
      },
      {
        name: '📋 Lister les capitaines — `/capitaine list`',
        value: '```/capitaine list```\nAffiche tous les capitaines enregistrés.',
      },
      {
        name: '✏️ Corriger un résultat — `/correction`',
        value: '```/correction match_id:<id> winner:<équipe> nexus_gagnant:<2|3> nexus_perdant:<0|1|2>```\nCorrige le résultat d\'un match déjà enregistré.',
      },
      {
        name: '⚠️ Réinitialiser la BDD — `/setup reset`',
        value: [
          '```/setup reset confirmation:CONFIRMER```',
          '**Irréversible.** Efface tous les capitaines et remet tous les matchs en `PENDING`.',
          '> Dates, résultats, scores et choix de side sont supprimés.',
        ].join('\n'),
      },
    );

  return [setupCmds, manageCmds];
}

async function refreshAdminCommandes(client) {
  const channelId = state.getAdminCommandesChannelId();
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`[AdminCommandes] Canal introuvable: ${channelId}`);
    return;
  }

  const embeds = buildAdminCommandesEmbeds();

  const existingMsgId = state.getAdminCommandesMessageId();
  if (existingMsgId) {
    const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
    if (existingMsg) {
      await existingMsg.edit({ embeds });
      console.log('[AdminCommandes] Panneau admin mis à jour.');
      return;
    }
  }

  const sent = await channel.send({ embeds });
  state.setAdminCommandesMessageId(sent.id);
  console.log('[AdminCommandes] Panneau admin posté.');
}

module.exports = { refreshAdminCommandes };
