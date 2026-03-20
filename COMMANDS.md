# Commandes Discord — Misfeets First Stand Bot

---

## Configuration (`/setup`)
> 🔒 Requiert la permission **Gérer le serveur**

| Commande | Description |
|---|---|
| `/setup annonce canal:#salon` | Définit le salon où les matchs sont annoncés **1h avant** le début |
| `/setup calendrier canal:#salon` | Définit le salon affichant les **2 prochains matchs par équipe** (mis à jour toutes les 2 min) |
| `/setup equipe canal:#salon team_id:42` | Associe un salon à une équipe — affiche ses **3 prochains matchs** uniquement |
| `/setup ticket categorie:#categorie` | Définit la catégorie Discord où sont créés les tickets de support |
| `/setup status` | Affiche la configuration actuelle de tous les canaux |

---

## Capitaines (`/capitaine`)
> 🔒 Requiert la permission **Gérer le serveur**

| Commande | Description |
|---|---|
| `/capitaine add utilisateur:@user team_id:42` | Enregistre un utilisateur comme **capitaine** de l'équipe `#42` |
| `/capitaine remove utilisateur:@user` | Retire le rôle capitaine d'un utilisateur |
| `/capitaine list` | Liste tous les capitaines enregistrés avec leur équipe |

---

## Planification des matchs (`/setdate`)
> 🔒 Réservé aux **capitaines** enregistrés (pour leurs propres matchs)

| Commande | Description |
|---|---|
| `/setdate match_id:42 date:25/03/2026 heure:21:00` | Définit la date et l'heure d'un match |

**Formats acceptés**
- Date : `DD/MM/YYYY` ou `DD/MM` (année courante par défaut)
- Heure : `21:00`, `21h00`, `21H`

> Le bot vérifie que le match appartient bien à l'équipe du capitaine avant d'effectuer la modification. Le calendrier est mis à jour immédiatement.

---

## Outils (`/refresh`)
> 🔒 Requiert la permission **Gérer le serveur**

| Commande | Description |
|---|---|
| `/refresh` | Force la vérification des nouveaux matchs et la mise à jour de tous les calendriers |

---

## Scrim (`/look-scrim`)
> 🔒 Réservé aux membres ayant le **rôle de l'équipe** concernée

| Commande | Description |
|---|---|
| `/look-scrim equipe:@role date:22/03 heure:21H bo:BO3` | Publie une recherche de scrim pour votre équipe |

**Options BO :** `BO1`, `BO2`, `BO3`

---

## Tickets (`/ticket`)
> Disponible pour tous les membres

| Commande | Description |
|---|---|
| `/ticket` | Ouvre un ticket privé avec le staff (validation roster, questions, suggestions) |

---

## Récapitulatif des permissions

| Commande | Qui peut l'utiliser |
|---|---|
| `/setup *` | Admins (Gérer le serveur) |
| `/refresh` | Admins (Gérer le serveur) |
| `/capitaine *` | Admins (Gérer le serveur) |
| `/setdate` | Capitaines enregistrés (leur équipe uniquement) |
| `/look-scrim` | Membres avec le rôle de l'équipe |
| `/ticket` | Tous les membres |

---

## Base de données — Référence

Pour les commandes nécessitant un `team_id`, l'ID correspond à la colonne `id` de la table `teams` en base de données.

Exemple : `/capitaine add utilisateur:@JohnDoe team_id:47` → associe JohnDoe à l'équipe dont l'ID est `47` dans la table `teams`.
