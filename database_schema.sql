-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost
-- Généré le : dim. 22 mars 2026 à 19:23
-- Version du serveur : 11.8.3-MariaDB-deb11
-- Version de PHP : 8.4.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `s96498_firststand`
--

-- --------------------------------------------------------

--
-- Structure de la table `capitaines_discord`
--
CREATE TABLE `capitaines_discord` (
  `id`              int(11)     NOT NULL AUTO_INCREMENT,
  `discord_user_id` varchar(32) NOT NULL,
  `team_id`         int(11)     NOT NULL,
  `created_at`      timestamp   NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user` (`discord_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `classement`
--
CREATE TABLE `classement` (
  `id`            int(11)     NOT NULL AUTO_INCREMENT,
  `tournament_id` int(11)     NOT NULL,
  `team_id`       int(11)     NOT NULL,
  `pool_name`     varchar(10) DEFAULT NULL,
  `wins`          int(11)     DEFAULT 0,
  `losses`        int(11)     DEFAULT 0,
  `points`        int(11)     DEFAULT 0,
  `is_playoff`    tinyint(1)  DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `discord_matches`
--
CREATE TABLE `discord_matches` (
  `id`              int(11)      NOT NULL AUTO_INCREMENT,
  `tournament_id`   int(11)      DEFAULT NULL,
  `tournament_name` varchar(255) DEFAULT NULL,
  `round_name`      varchar(255) DEFAULT NULL,
  `team1_name`      varchar(255) DEFAULT NULL,
  `team1_logo`      varchar(255) DEFAULT NULL,
  `team2_name`      varchar(255) DEFAULT NULL,
  `team2_logo`      varchar(255) DEFAULT NULL,
  `match_date`      datetime     DEFAULT NULL,
  `twitch_link`     varchar(255) DEFAULT NULL,
  `status`          varchar(50)  DEFAULT 'PENDING',
  `score_team1`     int(11)      DEFAULT 0,
  `score_team2`     int(11)      DEFAULT 0,
  `winner_id`       int(11)      DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `players`
--
CREATE TABLE `players` (
  `id`          int(11)      NOT NULL AUTO_INCREMENT,
  `team_id`     int(11)      DEFAULT NULL,
  `pseudo`      varchar(100) DEFAULT NULL,
  `email`       varchar(255) DEFAULT NULL,
  `password`    varchar(255) DEFAULT NULL,
  `riot_id`     varchar(100) NOT NULL,
  `role`        varchar(20)  DEFAULT NULL,
  `is_captain`  tinyint(1)   DEFAULT 0,
  `dpm_url`     varchar(255) DEFAULT NULL,
  `rank_tier`   varchar(50)  DEFAULT 'UNRANKED',
  `rank_div`    varchar(10)  DEFAULT '',
  `lp`          int(11)      DEFAULT 0,
  `avatar_url`  varchar(255) DEFAULT NULL,
  `is_admin`    tinyint(1)   NOT NULL DEFAULT 0,
  `main_role`   varchar(20)  NOT NULL DEFAULT 'FILL',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `points_equipes`
--
CREATE TABLE `points_equipes` (
  `team_id`      int(11) NOT NULL,
  `main_points`  int(11) DEFAULT 0,
  `sub_points`   int(11) DEFAULT 0,
  `total_points` int(11) DEFAULT 0,
  PRIMARY KEY (`team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `teams`
--
CREATE TABLE `teams` (
  `id`            int(11)      NOT NULL AUTO_INCREMENT,
  `name`          varchar(100) NOT NULL,
  `discord_id`    varchar(255) DEFAULT NULL,
  `logo_url`      varchar(255) DEFAULT NULL,
  `opgg_url`      text         DEFAULT NULL,
  `is_paid`       tinyint(1)   DEFAULT 0,
  `created_at`    timestamp    NOT NULL DEFAULT current_timestamp(),
  `tournament_id` int(11)      DEFAULT NULL,
  `pool_name`     varchar(10)  DEFAULT NULL,
  `banner_url`    varchar(255) DEFAULT NULL,
  `tag`           varchar(3)   DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `tournaments`
--
CREATE TABLE `tournaments` (
  `id`                    int(11)      NOT NULL AUTO_INCREMENT,
  `name`                  varchar(100) NOT NULL,
  `max_teams`             int(11)      DEFAULT 16,
  `max_points`            int(11)      DEFAULT 25,
  `created_at`            timestamp    NOT NULL DEFAULT current_timestamp(),
  `logo_url`              varchar(255) DEFAULT 'https://via.placeholder.com/150',
  `status`                varchar(50)  DEFAULT 'IN_PROGRESS',
  `game`                  varchar(50)  DEFAULT 'LEAGUE_OF_LEGENDS',
  `platform`              varchar(50)  DEFAULT 'PC',
  `location`              varchar(50)  DEFAULT 'EUW',
  `format`                varchar(100) DEFAULT 'REGULAR_SEASON_AND_PLAYOFFS',
  `min_teams`             int(11)      DEFAULT 5,
  `min_players_per_team`  int(11)      DEFAULT 5,
  `max_players_per_team`  int(11)      DEFAULT 7,
  `discord_link`          varchar(255) DEFAULT 'https://discord.gg/ton-lien',
  `num_pools`             int(11)      NOT NULL DEFAULT 1,
  `start_date`            date         DEFAULT NULL,
  `end_date`              date         DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
