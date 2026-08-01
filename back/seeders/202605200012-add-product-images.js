'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const images = {
      'Panneaux Solaires': ['Commercial Solar Panel Installation at Sunset  _ Clean Energy Solutions.jpeg', 'Go Green.jpeg'],
      'Batteries & Stockage': ['solar installation.jpeg'],
      'Onduleurs & Régulateurs': ['solar installation.jpeg'],
      'Kits Solaires Complets': ['shop-installation-solaire.jpeg'],
      'Éclairage Solaire': ['Go Green.jpeg'],
      'Smartphones & Tablettes': ['reparation-telephones.jpeg'],
      'Ordinateurs & Périphériques': ['télécharger (3).jpeg'],
      'TV & Audio': ['télécharger.jpeg'],
      'Accessoires Électronique': ['télécharger (1).jpeg'],
      'Câbles & Connectiques': ['télécharger (2).jpeg'],
      'Électroménager': ['vente-electromenagers.png', 'These Dorm Fans Are The Best Way To Cool Down Your Desk, Bed & More — One\'s Just $15.jpeg'],
      'Vêtements & Mode': ['télécharger (4).jpeg', 'télécharger (5).jpeg']
    };

    for (const [category, files] of Object.entries(images)) {
      const catRows = await queryInterface.sequelize.query(
        `SELECT id FROM Categories WHERE name = ? LIMIT 1`,
        { replacements: [category], type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (!catRows.length) continue;
      const categoryId = catRows[0].id;

      const products = await queryInterface.sequelize.query(
        `SELECT id FROM Products WHERE categoryId = ? AND (photo IS NULL OR photo = '') LIMIT ?`,
        { replacements: [categoryId, files.length], type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      for (let i = 0; i < products.length && i < files.length; i++) {
        await queryInterface.sequelize.query(
          `UPDATE Products SET photo = ? WHERE id = ?`,
          { replacements: [files[i], products[i].id] }
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`UPDATE Products SET photo = NULL`);
  }
};
