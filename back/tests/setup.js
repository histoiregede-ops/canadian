require('dotenv').config();

// SQLite n'autorise qu'un seul écrivain à la fois. Chaque worker Jest ouvre sa
// propre connexion (le global-setup s'exécute dans le process principal et n'a
// pas d'effet sur les connexions des workers). On initie donc le PRAGMA ici,
// avant le chargement des fichiers de test : node-sqlite3 exécute les requêtes
// d'une connexion dans l'ordre, donc le busy_timeout est appliqué avant toute
// requête de test. Cela permet aux INSERT hors transaction (ex: stock_movements
// pendant la création d'une commande) d'attendre la fin de la transaction au
// lieu d'échouer avec SQLITE_BUSY.
const sequelize = require('../config/database');
sequelize.query('PRAGMA busy_timeout = 30000').catch(() => {});
