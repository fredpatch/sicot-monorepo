-- Script d'initialisation de la base de données SICOT
-- À exécuter en tant que superuser PostgreSQL sur SERV-APPI
--
-- Usage : psql -U postgres -f scripts/setup-db.sql

-- Création de l'utilisateur
CREATE USER sicot_user WITH PASSWORD 'admin';

-- Création de la base
CREATE DATABASE sicot_db
  WITH OWNER = sicot_user
  ENCODING = 'UTF8'
  LC_COLLATE = 'fr_FR.UTF-8'
  LC_CTYPE = 'fr_FR.UTF-8'
  TEMPLATE = template0;

-- Permissions
GRANT ALL PRIVILEGES ON DATABASE sicot_db TO sicot_user;

-- Connexion à la base
\c sicot_db

-- Extension pour les recherches full-text
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Activer les recherches sans accents (utile pour FR)
CREATE TEXT SEARCH CONFIGURATION french_unaccent (COPY = french);
ALTER TEXT SEARCH CONFIGURATION french_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;

GRANT ALL ON SCHEMA public TO sicot_user;

\echo '✅ Base de données SICOT initialisée avec succès.'
\echo '   Lancez ensuite : npm run db:migrate --workspace=packages/server'
