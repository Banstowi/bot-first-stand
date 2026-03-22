const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const state = require('./state');

const BRACKET_IMAGE_PATH = path.join(__dirname, '..', 'data', 'bracket.png');

const SECTIONS = [
  {
    index: 0,
    label: 'I — Règlement général',
    color: 0x4a6fa5,
    description: [
      'Le Tournoi est organisé par la structure **Misfeets** représentée par **Fonfon & Banst**.',
      '',
      '**1.** Le présent règlement encadre le bon déroulement du tournoi League of Legends organisé par les administrateurs.',
      '**2.** En s\'inscrivant au tournoi, chaque équipe et chaque joueur accepte l\'intégralité de ce règlement.',
      '**3.** Les administrateurs se réservent le droit de modifier, adapter ou compléter ce règlement si nécessaire.',
      '**4.** Les décisions des administrateurs sont finales et devront être respectées par l\'ensemble des participants.',
      '**5.** Les équipes doivent adopter un comportement respectueux envers les autres participants, les organisateurs et les éventuels spectateurs.',
      '**6.** Les capitaines doivent donner **2 disponibilités différentes** pour un seul et même match.',
      '**7.** Les matchs doivent en priorité se faire dans l\'ordre de l\'ID (visible sur Discord dans vos salons « programmation » ou dans le « calendrier » global). Si cela n\'est pas possible, inversez avec le suivant (pas besoin de nous concerter pour cela).',
      '',
      '> ⚠️ Tout comportement toxique, antisportif, insultant ou visant à perturber le bon déroulement du tournoi pourra entraîner des sanctions.',
    ].join('\n'),
  },
  {
    index: 1,
    label: 'II — Éligibilité et inscriptions',
    color: 0x4a6fa5,
    description: [
      '**1.** Le tournoi est ouvert aux équipes complètes de **5 joueurs**.',
      '**2.** Toute équipe doit avoir un **capitaine** pour communiquer avec les autres équipes et organiser les matchs.',
      '**3.** Les **subs** sont autorisés dans la mesure où ils ne dépassent pas le **Platine 1**. Ils devront jouer un maximum de **40 %** des matchs (3 matchs en phase de poules) et, si l\'équipe atteint la finale, 5 matchs au total. Ils devront être renseignés dans la line-up avant chaque rencontre. Les Pick-ups sont autorisés sur acceptation du staff (**+400 LP de diff max**).',
      '**4.** Tout compte **Unranked** ne sera pas accepté.',
      '**5.** L\'inscription d\'une équipe sera validée uniquement après vérification et approbation des organisateurs.',
      '**6.** Le **rang moyen de l\'équipe** ne doit pas dépasser **Platine 1**. Les organisateurs se réservent le droit de refuser une inscription si le niveau estimé dépasse cette limite.',
      '**7.** Les joueurs doivent déclarer **tous leurs comptes** League of Legends (comptes principaux et smurfs) aux organisateurs lors de l\'inscription.',
      '**8.** Toute utilisation d\'un compte non renseigné ne sera pas autorisée.',
    ].join('\n'),
  },
  {
    index: 2,
    label: 'III — Format du tournoi',
    color: 0x4a6fa5,
    description: [
      'Le tournoi se déroule en **fearless** avec **16 équipes** et comprend deux phases.',
      '',
      '**📋 Phase de groupes**',
      '• 2 groupes de 8 équipes.',
      '• Les matchs se jouent en **BO3**.',
      '• Les **2 meilleures équipes** de chaque groupe se qualifient pour les quarts de finale.',
      '• Les positions **3 à 6** seront en 8èmes de finale.',
      '• Les équipes **7 et 8** de chaque poule sont éliminées.',
      '',
      '**🏆 Phases finales** *(élimination directe)*',
      '• 8èmes de finale : **BO3**',
      '• Quarts de finale : **BO3**',
      '• Demi-finales : **BO5**',
      '• Finale : **BO5**',
      '',
      'Les rencontres seront programmées et communiquées par les capitaines d\'équipes.',
    ].join('\n'),
    hasImage: true,
  },
  {
    index: 3,
    label: 'IV — Règlement des rencontres',
    color: 0x4a6fa5,
    description: [
      '**⏱️ Retards**',
      '**1.** Tout retard dépassant les **15 minutes** accordera une première défaite aux retardataires (le BO commencera donc en **1-0**).',
      '**2.** Tout retard de plus de **30 minutes** accordera une victoire par **forfait** à l\'équipe adverse.',
      '**3.** Tout match ne pouvant être réalisé sera déclaré perdu pour l\'équipe ne pouvant se rendre disponible.',
      '',
      '**🎮 Comportement en jeu**',
      '**1.** Il est autorisé de banter/trashtalk **avant et après** une rencontre, dans les limites du raisonnable et en restant bon enfant ainsi que fair-play.',
      '**2.** Tout comportement odieux ou visant à nuire à l\'adversaire sera sanctionné.',
      '**3.** Il est **interdit de `/surrender`** lors d\'une rencontre — tant qu\'un nexus n\'est pas tombé, le jeu continue.',
      '',
      '> Le `/all` est autorisé tant que ça reste dans les valeurs du sport. Le trashtalk c\'est avant ou après, **pas pendant**.',
    ].join('\n'),
  },
  {
    index: 4,
    label: 'V — Stream & diffusions',
    color: 0x4a6fa5,
    description: [
      '• Les joueurs et les tiers sont autorisés à **stream ou caster** les matchs du tournoi avec l\'accord des administrateurs.',
      '• Il est fortement recommandé de mettre du **délai** lors de la diffusion d\'une POV de joueur (demander l\'autorisation des organisateurs).',
      '• Les organisateurs se réservent le droit de **diffuser certains matchs** sur leurs propres chaînes.',
      '• Toute diffusion devra obligatoirement utiliser l\'**overlay officiel** fourni par les organisateurs.',
    ].join('\n'),
  },
  {
    index: 5,
    label: 'VI — Gains',
    color: 0xf0a500,
    description: [
      'Les récompenses du tournoi sont les suivantes :',
      '',
      '🥇 **1ère place** : 50 €',
      '🥈 **2ème place** : Le droit de réessayer à la prochaine édition.',
      '',
      'Les modalités de paiement seront communiquées aux équipes gagnantes après la fin du tournoi.',
    ].join('\n'),
  },
  {
    index: 6,
    label: 'VII — Infractions au règlement',
    color: 0xcc2200,
    description: [
      'Les organisateurs se réservent le droit de **sanctionner** toute équipe ne respectant pas le règlement.',
      '',
      '**Les sanctions peuvent inclure :**',
      '• Avertissement',
      '• Défaite administrative',
      '• Disqualification du tournoi',
      '• Bannissement du tournoi',
      '',
      '> ⚠️ Toute tentative de triche, de smurf dissimulé ou de contournement des règles pourra entraîner une **exclusion immédiate**.',
      '',
      'Les organisateurs se réservent le droit de bannir un joueur de l\'équipe et/ou l\'équipe dans son entièreté si celle-ci dépasse le niveau autorisé ou ne respecte pas le règlement.',
    ].join('\n'),
  },
];

const TOTAL = SECTIONS.length;

function buildEmbed(pageIndex) {
  const section = SECTIONS[pageIndex];
  const embed = new EmbedBuilder()
    .setColor(section.color)
    .setTitle(`📜 ${section.label}`)
    .setDescription(section.description)
    .setFooter({ text: `Tournoi Misfeets • Section ${pageIndex + 1} / ${TOTAL}` });

  if (section.hasImage && fs.existsSync(BRACKET_IMAGE_PATH)) {
    embed.setImage('attachment://bracket.png');
  }

  return embed;
}

function buildNavRow(currentPage) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`reglement_nav_${currentPage - 1}`)
      .setLabel('◀ Précédent')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId('reglement_info')
      .setLabel(`${currentPage + 1} / ${TOTAL}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`reglement_nav_${currentPage + 1}`)
      .setLabel('Suivant ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === TOTAL - 1),
  );
}

function buildMessageOptions(pageIndex) {
  const embed = buildEmbed(pageIndex);
  const components = [buildNavRow(pageIndex)];
  const section = SECTIONS[pageIndex];

  if (section.hasImage && fs.existsSync(BRACKET_IMAGE_PATH)) {
    return {
      embeds: [embed],
      components,
      files: [new AttachmentBuilder(BRACKET_IMAGE_PATH, { name: 'bracket.png' })],
    };
  }

  return { embeds: [embed], components, attachments: [] };
}

async function postReglement(channel) {
  const options = buildMessageOptions(0);
  const sent = await channel.send(options);
  state.setReglementChannelId(channel.id);
  state.setReglementMessageId(sent.id);
  console.log('[Règlement] Posté dans #' + channel.name);
  return sent;
}

async function refreshReglement(client) {
  const channelId = state.getReglementChannelId();
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const existingMsgId = state.getReglementMessageId();
  if (existingMsgId) {
    const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
    if (existingMsg) {
      await existingMsg.edit(buildMessageOptions(0));
      console.log('[Règlement] Message mis à jour.');
      return;
    }
  }

  await postReglement(channel);
}

async function handleReglementNav(interaction, targetPage) {
  if (targetPage < 0 || targetPage >= TOTAL) return;
  const options = buildMessageOptions(targetPage);
  await interaction.update(options);
}

module.exports = { postReglement, refreshReglement, handleReglementNav, TOTAL };
