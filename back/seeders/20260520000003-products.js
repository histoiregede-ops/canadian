'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const catRows = await queryInterface.sequelize.query(
      `SELECT id, name FROM Categories`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const catMap = {};
    catRows.forEach(c => { catMap[c.name] = c.id; });

    const getCatId = (name) => catMap[name] || catMap['Autres'] || null;

    const products = [
      // ── PANNEAUX SOLAIRES ──
      { name: 'Panneau Solaire 450W Monocristallin PERC', desc: 'Haute efficacité 22.5%, cellules demi-découpées, garantie 25 ans. Idéal pour installation résidentielle et commerciale.', price: 175000, stock: 15, cat: 'Panneaux Solaires', featured: true },
      { name: 'Panneau Solaire 550W Bifacial', desc: 'Panneau bifacial à haut rendement, capture la lumière des deux côtés. Parfait pour les installations au sol.', price: 225000, stock: 8, cat: 'Panneaux Solaires', featured: true },
      { name: 'Panneau Solaire 300W Polycristallin', desc: 'Bon rapport qualité-prix pour installation résidentielle. Garantie 15 ans.', price: 95000, stock: 25, cat: 'Panneaux Solaires' },
      { name: 'Kit 2 Panneaux Solaires 400W + Support', desc: 'Pack complet avec supports de fixation toit, câbles et connecteurs MC4.', price: 380000, stock: 6, cat: 'Panneaux Solaires', featured: true },
      { name: 'Mini Panneau Solaire 100W 12V', desc: 'Portable, idéal pour camping, caravane ou petite application. Léger et facile à installer.', price: 45000, stock: 30, cat: 'Panneaux Solaires' },

      // ── BATTERIES & STOCKAGE ──
      { name: 'Batterie Lithium LiFePO4 12V 200Ah', desc: 'Batterie au lithium fer phosphate, 6000 cycles, BMS intégré. Poids léger, longue durée de vie.', price: 650000, stock: 5, cat: 'Batteries & Stockage', featured: true },
      { name: 'Batterie Gel Solaire 12V 150Ah', desc: 'Batterie Gel sans entretien, cycle profond. Idéale pour installation solaire.', price: 250000, stock: 12, cat: 'Batteries & Stockage' },
      { name: 'Batterie AGM 12V 100Ah', desc: 'Batterie AGM haute performance, décharge lente. Parfaite pour système de secours.', price: 150000, stock: 20, cat: 'Batteries & Stockage' },
      { name: 'Power Station 1000W', desc: 'Station d\'énergie portable 1000W/1000Wh, sortie AC/DC/USB-C. Recharge solaire et secteur.', price: 450000, stock: 4, cat: 'Batteries & Stockage', featured: true },
      { name: 'Batterie Voiture 12V 70Ah', desc: 'Batterie automobile standard, haute puissance de démarrage.', price: 85000, stock: 18, cat: 'Batteries & Stockage' },

      // ── ONDULEURS & RÉGULATEURS ──
      { name: 'Onduleur Hybride 5KW 48V', desc: 'Onduleur solaire hybride, double entrée (solaire + secteur), pure onde sinusoïdale, écran LCD.', price: 550000, stock: 4, cat: 'Onduleurs & Régulateurs', featured: true },
      { name: 'Onduleur 3KW 24V', desc: 'Onduleur solaire pur sinus 3000W, idéal pour maison ou petit commerce.', price: 350000, stock: 7, cat: 'Onduleurs & Régulateurs' },
      { name: 'Régulateur MPPT 60A', desc: 'Régulateur de charge MPPT 60A, maximum power point tracking, écran LCD, support 12V/24V.', price: 95000, stock: 10, cat: 'Onduleurs & Régulateurs', featured: true },
      { name: 'Régulateur PWM 30A', desc: 'Régulateur de charge PWM 30A, économique et fiable pour petit système solaire.', price: 25000, stock: 25, cat: 'Onduleurs & Régulateurs' },
      { name: 'Convertisseur 12V-220V 2000W', desc: 'Convertisseur de tension pure onde sinusoïdale, protection surcharge et court-circuit.', price: 120000, stock: 8, cat: 'Onduleurs & Régulateurs' },

      // ── KITS SOLAIRES COMPLETS ──
      { name: 'Kit Solaire Maison 500W Complet', desc: 'Kit clé en main : 2 panneaux 250W + régulateur + batterie 100Ah + onduleur 1KW + câbles.', price: 450000, stock: 3, cat: 'Kits Solaires Complets', featured: true },
      { name: 'Kit Solaire Premium 1500W', desc: 'Kit complet pour maison grande consommation : 4 panneaux 375W + onduleur 3KW + 2 batteries 200Ah.', price: 1250000, stock: 2, cat: 'Kits Solaires Complets', featured: true },
      { name: 'Kit Solaire Éclairage Public LED', desc: 'Kit d\'éclairage public solaire : panneau 100W + lampe LED + batterie + régulateur + mât.', price: 185000, stock: 8, cat: 'Kits Solaires Complets' },
      { name: 'Mini Kit Solaire 200W Portable', desc: 'Kit solaire portable : panneau pliable 200W + power station 300Wh. Idéal pour voyage.', price: 250000, stock: 6, cat: 'Kits Solaires Complets' },

      // ── ÉCLAIRAGE SOLAIRE ──
      { name: 'Lampe Solaire LED 200W', desc: 'Projecteur LED solaire 200W avec détecteur de mouvement. Idéal pour extérieur.', price: 55000, stock: 20, cat: 'Éclairage Solaire' },
      { name: 'Lampe Torche Solaire Rechargeable', desc: 'Lampe torche LED 1000 lumens, rechargeable via panneau solaire intégré ou USB.', price: 12000, stock: 50, cat: 'Éclairage Solaire' },
      { name: 'Guirlande Solaire LED 10m', desc: 'Guirlande lumineuse solaire 10m avec 100 LED, idéale pour décoration extérieure.', price: 15000, stock: 35, cat: 'Éclairage Solaire' },
      { name: 'Lampe de Jardin Solaire sur Piquet', desc: 'Lampe de jardin solaire automatique, installation sans fil. Lot de 4.', price: 25000, stock: 25, cat: 'Éclairage Solaire' },
      { name: 'Projecteur Solaire 100W avec Télécommande', desc: 'Projecteur LED solaire 100W, télécommande incluse, 3 modes d\'éclairage.', price: 35000, stock: 15, cat: 'Éclairage Solaire' },

      // ── SMARTPHONES & TABLETTES ──
      { name: 'iPhone 16 Pro Max 256GB', desc: 'Neuf scellé, écran 6.9", puce A18 Pro, appareil photo 48MP, titane naturel.', price: 1450000, stock: 3, cat: 'Smartphones & Tablettes', featured: true },
      { name: 'iPhone 15 Pro 128GB', desc: 'Neuf scellé, écran 6.1", Dynamic Island, appareil photo 48MP.', price: 950000, stock: 5, cat: 'Smartphones & Tablettes' },
      { name: 'Samsung Galaxy S24 Ultra 256GB', desc: 'Neuf scellé, écran 6.8", S Pen intégré, appareil photo 200MP.', price: 1100000, stock: 4, cat: 'Smartphones & Tablettes', featured: true },
      { name: 'Samsung Galaxy A55 5G 128GB', desc: 'Smartphone milieu de gamme performant, écran Super AMOLED 120Hz.', price: 275000, stock: 12, cat: 'Smartphones & Tablettes' },
      { name: 'Redmi Note 13 Pro+ 256GB', desc: 'Smartphone 5G, écran 6.67", appareil 200MP, charge rapide 120W.', price: 250000, stock: 8, cat: 'Smartphones & Tablettes' },
      { name: 'Tecno Camon 30 Premier 256GB', desc: 'Smartphone premium, écran AMOLED, appareil 50MP OIS, charge rapide.', price: 220000, stock: 10, cat: 'Smartphones & Tablettes' },
      { name: 'iPad Air M2 11" 256GB', desc: 'Tablette Apple avec puce M2, écran Liquid Retina, compatible Apple Pencil Pro.', price: 750000, stock: 3, cat: 'Smartphones & Tablettes', featured: true },
      { name: 'Samsung Galaxy Tab S9 FE 128GB', desc: 'Tablette polyvalente avec S Pen inclus, écran 10.9", résistante à l\'eau.', price: 350000, stock: 5, cat: 'Smartphones & Tablettes' },

      // ── ORDINATEURS & PÉRIPHÉRIQUES ──
      { name: 'MacBook Air M3 15" 16Go/256Go', desc: 'Ordinateur portable Apple, puce M3, écran 15.3", 18h d\'autonomie.', price: 1450000, stock: 2, cat: 'Ordinateurs & Périphériques', featured: true },
      { name: 'HP Pavilion 15 i7 16Go/512Go SSD', desc: 'PC portable, Intel Core i7 13e gen, 16Go RAM, SSD 512Go, écran FHD 15.6".', price: 650000, stock: 5, cat: 'Ordinateurs & Périphériques' },
      { name: 'Lenovo ThinkPad X1 Carbon i7', desc: 'Ultrabook professionnel, 14" WUXGA, 16Go RAM, SSD 512Go, carbone.', price: 850000, stock: 3, cat: 'Ordinateurs & Périphériques' },
      { name: 'Écran PC LED 27" Full HD', desc: 'Écran PC 27" Full HD 1080p, 75Hz, HDMI/VGA, design sans bord.', price: 135000, stock: 8, cat: 'Ordinateurs & Périphériques' },
      { name: 'Clavier Mécanique RGB Gamer', desc: 'Clavier mécanique avec switch bleu, rétroéclairage RGB, repose-poignet.', price: 45000, stock: 15, cat: 'Ordinateurs & Périphériques' },
      { name: 'Souris Sans Fil Logitech MX Master 3S', desc: 'Souris ergonomique sans fil, capteur 8000 DPI, rechargeable USB-C.', price: 65000, stock: 10, cat: 'Ordinateurs & Périphériques' },
      { name: 'Disque Dur Externe 2To USB 3.0', desc: 'Disque dur externe portable 2To, USB 3.0, plug-and-play, noir.', price: 45000, stock: 20, cat: 'Ordinateurs & Périphériques' },

      // ── TV & AUDIO ──
      { name: 'TV LED 55" 4K UHD Smart TV', desc: 'Téléviseur 55" 4K UHD, Smart TV Android, WiFi, HDMI 2.1, Dolby Audio.', price: 450000, stock: 4, cat: 'TV & Audio', featured: true },
      { name: 'TV LED 43" Full HD Smart TV', desc: 'Téléviseur 43" Full HD, Smart TV intégré, WiFi, ports HDMI/USB.', price: 250000, stock: 6, cat: 'TV & Audio' },
      { name: 'TV LED 32" HD Ready', desc: 'Téléviseur 32" HD, idéal pour chambre ou cuisine, entrée HDMI/VGA.', price: 125000, stock: 10, cat: 'TV & Audio' },
      { name: 'Enceinte Bluetooth JBL Charge 5', desc: 'Enceinte portable Bluetooth 20W, batterie 20h, résistante à l\'eau IP67.', price: 95000, stock: 8, cat: 'TV & Audio' },
      { name: 'Casque Audio Sans Fil Sony WH-1000XM5', desc: 'Casque circum-auriculaire Bluetooth avec réduction de bruit active, 30h d\'autonomie.', price: 250000, stock: 4, cat: 'TV & Audio', featured: true },
      { name: 'Barre de Son 2.1 avec Subwoofer', desc: 'Barre de son 2.1 canaux, 120W, subwoofer sans fil, Bluetooth, HDMI ARC.', price: 150000, stock: 5, cat: 'TV & Audio' },

      // ── ACCESSOIRES ÉLECTRONIQUE ──
      { name: 'Powerbank 20000mAh Charge Rapide', desc: 'Batterie externe 20000mAH, charge rapide 22.5W, double sortie USB + USB-C.', price: 25000, stock: 30, cat: 'Accessoires Électronique' },
      { name: 'Support Téléphone Voiture', desc: 'Support smartphone pour voiture, fixation sur tableau de bord ou pare-brise, rotatif 360°.', price: 8000, stock: 40, cat: 'Accessoires Électronique' },
      { name: 'Coque iPhone 15 Pro Max Silicone', desc: 'Coque protectrice en silicone, doublure microfibre, MagSafe compatible.', price: 12000, stock: 25, cat: 'Accessoires Électronique' },
      { name: 'Film Protecteur Verre Trempé iPhone', desc: 'Verre trempé 9H, anti-rayures, revêtement oléophobique. Pour iPhone 15 Pro Max.', price: 5000, stock: 50, cat: 'Accessoires Électronique' },
      { name: 'Chargeur Secteur USB-C 30W GaN', desc: 'Chargeur rapide GaN 30W, compatible iPhone et Android, PD 3.0, compact.', price: 15000, stock: 35, cat: 'Accessoires Électronique' },
      { name: 'Hub USB-C 7 en 1', desc: 'Adaptateur USB-C multiport : HDMI 4K, USB 3.0, SD/TF, PD 100W, RJ45.', price: 35000, stock: 15, cat: 'Accessoires Électronique' },
      { name: 'Montre Connectée Amazfit GTR 4', desc: 'Montre connectée GPS, écran AMOLED, 14 jours d\'autonomie, santé et sport.', price: 95000, stock: 7, cat: 'Accessoires Électronique' },

      // ── CÂBLES & CONNECTIQUES ──
      { name: 'Câble USB-C vers USB-C 2m', desc: 'Câble USB-C 2m, charge rapide 100W, données 10Gbps, tressé nylon.', price: 5000, stock: 60, cat: 'Câbles & Connectiques' },
      { name: 'Câble Lightning 1m Apple MFI', desc: 'Câble Lightning certifié Apple MFI, charge rapide, synchro données.', price: 8000, stock: 45, cat: 'Câbles & Connectiques' },
      { name: 'Câble HDMI 2.1 3m 8K', desc: 'Câble HDMI 2.1 haute vitesse 48Gbps, 8K@60Hz, compatible eARC.', price: 12000, stock: 25, cat: 'Câbles & Connectiques' },
      { name: 'Adaptateur Secteur Prise Européenne', desc: 'Adaptateur de voyage universel, prise UE vers schuko, 16A.', price: 3500, stock: 80, cat: 'Câbles & Connectiques' },
      { name: 'Câble Solaire 6mm2 (mètre)', desc: 'Câble solaire 6mm2 résistant UV, pour connexion panneaux solaires, vendu au mètre.', price: 1500, stock: 200, cat: 'Câbles & Connectiques' },
      { name: 'Multiprise Parafoudre 6 Prises', desc: 'Multiprise 6 prises avec protection parafoudre, interrupteur lumineux, 3m.', price: 15000, stock: 20, cat: 'Câbles & Connectiques' },

      // ── ÉLECTROMÉNAGER ──
      { name: 'Ventilateur sur Pied 18"', desc: 'Ventilateur sur pied 45cm, 3 vitesses, oscillation, grille de protection métal.', price: 45000, stock: 15, cat: 'Électroménager' },
      { name: 'Climatiseur Split 12000 BTU Inverter', desc: 'Climatiseur split mural 12000 BTU, inverter, télécommande, mode froid/chaud.', price: 450000, stock: 4, cat: 'Électroménager', featured: true },
      { name: 'Réfrigérateur 2 Portes 280L', desc: 'Réfrigérateur 2 portes 280L, classe énergétique A+, éclairage LED, clayettes verre.', price: 350000, stock: 3, cat: 'Électroménager' },
      { name: 'Machine à Laver 7kg Frontale', desc: 'Machine à laver frontale 7kg, 1200 tours/min, classe A+++, 15 programmes.', price: 325000, stock: 3, cat: 'Électroménager' },
      { name: 'Micro-Ondes 23L Grill 1000W', desc: 'Four micro-ondes 23L avec fonction grill, 5 niveaux de puissance, minuterie.', price: 95000, stock: 8, cat: 'Électroménager' },
      { name: 'Fer à Repasser Vapeur 2400W', desc: 'Fer à repasser vapeur 2400W, semelle céramique, anti-goutte, 200ml.', price: 25000, stock: 20, cat: 'Électroménager' },
      { name: 'Cuisinière 4 Feux Vitrocéramique', desc: 'Table de cuisson vitrocéramique 4 foyers, touches sensitives, sécurité enfant.', price: 185000, stock: 5, cat: 'Électroménager' },

      // ── VÊTEMENTS & MODE ──
      { name: 'T-Shirt Coton Premium Homme', desc: 'T-shirt coton peigné 180g/m², coupe classique, disponible en plusieurs couleurs.', price: 12000, stock: 50, cat: 'Vêtements & Mode' },
      { name: 'Chemise Business Manche Longues', desc: 'Chemise homme en coton, coupe slim, col italien, idéale pour le bureau.', price: 25000, stock: 25, cat: 'Vêtements & Mode' },
      { name: 'Pantalon Chino Homme', desc: 'Pantalon chino coupe droite, coton stretch, confortable et élégant.', price: 30000, stock: 20, cat: 'Vêtements & Mode' },
      { name: 'Tissu Pagne Wax Haut Qualité (6 yards)', desc: 'Pagne wax 100% coton, motifs africains traditionnels, 6 yards. Idéal pour couture.', price: 35000, stock: 30, cat: 'Vêtements & Mode', featured: true },
      { name: 'Boubou Traditionnel Brodé', desc: 'Boubou homme en bazin riche, broderie fine, plusieurs coloris disponibles.', price: 85000, stock: 10, cat: 'Vêtements & Mode', featured: true },
      { name: 'Sac à Main Cuir Femme', desc: 'Sac à main en cuir véritable, bandoulière amovible, compartiments multiples.', price: 65000, stock: 8, cat: 'Vêtements & Mode' },
      { name: 'Montre Classique Acier Inoxydable', desc: 'Montre homme acier inoxydable, mouvement quartz, cadran bleu, étanche 50m.', price: 45000, stock: 15, cat: 'Vêtements & Mode' },
      { name: 'Chaussures Derby Cuir Homme', desc: 'Chaussures derby en cuir véritable, semelle caoutchouc, confort toute la journée.', price: 55000, stock: 12, cat: 'Vêtements & Mode' },
      { name: 'Parfum Homme 100mL', desc: 'Eau de parfum homme, notes boisées et épicées, longue tenue.', price: 45000, stock: 20, cat: 'Vêtements & Mode' },
      { name: 'Lunettes de Soleil Polaroid', desc: 'Lunettes de soleil polarisées, protection UV400, monture noire classique.', price: 25000, stock: 25, cat: 'Vêtements & Mode' },
    ];

    for (const p of products) {
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM Products WHERE name = '${p.name.replace(/'/g, "''")}' LIMIT 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        const id = uuidv4();
        const desc = p.desc.replace(/'/g, "''");
        await queryInterface.sequelize.query(
          `INSERT INTO Products (id, name, description, price, stockQuantity, status, categoryId, isFeatured, createdAt, updatedAt)
           VALUES ('${id}', '${p.name.replace(/'/g, "''")}', '${desc}', ${p.price}, ${p.stock}, 'available', '${getCatId(p.cat)}', ${p.featured ? 1 : 0}, NOW(), NOW())`
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Products', null, {});
  }
};