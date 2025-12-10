const inventoryData = [
    {
        name: "Poudre de Traçage",
        category: "consommable",
        image: "assets/images/Poudre de Tra‡age.png",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Larme de Matera",
        category: "consommable",
        image: "assets/images/Larme de Matera.png",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Fruit Papooru",
        category: "agricole",
        image: "assets/images/Fruit_Papooru.jpg",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Fiole de vitalité",
        category: "consommable",
        image: "assets/images/Fiole de vitalit‚.jpg",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Parchemin d'Éveil",
        category: "consommable",
        image: "assets/images/Parchemin d'Eveil.jpg",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Parchemin d'Ascension",
        category: "consommable",
        image: "assets/images/Parchemin d'Ascension.jpg",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Clef Manndorf",
        category: "consommable",
        image: "assets/images/Cle_Manndorf.png",
        description:
            "Petite clé mécanique rare, composée de rouages de cuivre et d'ailes de chauve-souris taillées dans une pierre obscure. " +
            "Lorsqu'elle est activée, la clé ouvre un passage vers une quête adaptative dont la difficulté s'ajuste au niveau du joueur et de son équipe. " +
            "Jusqu'à cinq aventuriers peuvent franchir la brèche et entrer dans l'univers qu'elle révèle, un conte vivant d'Astoria aux récompenses uniques adaptées à leur progression. " +
            "La clé est liée à une seule histoire et disparaît après avoir mené le groupe d'aventuriers à son destin.",
        buyPrice: "",
        sellPrice: "150 Kaels",
        effect:
            "Ouvre une quête adaptative liée à une histoire unique d'Astoria pour un groupe jusqu'à cinq aventuriers, puis disparaît."
    },
    {
        name: "Armure de Vexarion",
        category: "equipement",
        image: "assets/images/Armure de Vexarion.png",
        description:
            "Cette armure luxueuse, forgée dans les lumières iridescentes du domaine divin, est un artefact sacré offert par Vexarion, Dieu de la Guerre et de la Stratégie. " +
            "Chaque plaque scintille d'un éclat changeant, comme si elle absorbait et reflétait la droiture du porteur. " +
            "Bénie par la Loi d'Honneur de Vexarion, elle déploie autour de son porteur une aura scintillante perceptible par tous les combattants. " +
            "Cette aura réagit uniquement aux actes déloyaux, jugeant la loyauté de ceux qui l'affrontent.",
        buyPrice: "",
        sellPrice: "",
        effect:
            "Effet : Aura d'Honneur — lorsqu'un ennemi porte une attaque déloyale (dans le dos, hors duel, coup bas), la force de l'assaillant est réduite de 10 points pendant 2 tours. " +
            "L'effet ne se déclenche que si le code d'honneur de Vexarion est bafoué et n'accorde aucun avantage lors d'un combat loyal."
    },
    {
        name: "Sceptre de Krythus",
        category: "equipement",
        image: "assets/images/Sceptre de Krythus.png",
        description:
            "Artefact sacré façonné dans les glaces du mont le plus haut, le Sceptre de Krythus incarne la puissance implacable de Krythus, Dieu de l'Hiver et des Tempêtes de Glace. " +
            "Sa tige gravée de runes givrées s'allonge d'elle-même pour s'adapter parfaitement à la taille de son porteur, comme si l'arme reconnaissait instinctivement son maître. " +
            "Le cristal à son sommet renferme une bribe de la magie du dieu, amplifiant la magie de glace qui y circule et renforçant chaque sort gelé lancé par le porteur.",
        buyPrice: "",
        sellPrice: "",
        effect:
            "Effet : Ajustement Givré — le sceptre adapte automatiquement la longueur de son manche à la morphologie du porteur, devenant une extension naturelle de son bras. " +
            "Effet : Faveur Glaciale — augmente la puissance des sorts de glace (+5 points de Glace, +5 points de Magie). " +
            "Effet : Cœur de Givre — libère une onde glaciale qui fige le sol et l'air dans un rayon de 10 mètres autour du porteur (durée : 3 tours, recharge : 5 tours, 1 tour de charge)."
    },
    {
        name: "Cape de l'Aube Vermeille [Exclu saison]",
        category: "equipement",
        image: "",
        description:
            "Artefact hivernal saisonnier prenant la forme d'une cape épaisse tombant jusqu'aux genoux, rembourrée d'une couche de laine. " +
            "Liée par un sceau gravé d'une tête de lion, elle renferme un fauve endormi dont l'aura peut être éveillée. " +
            "Apaisante et réchauffante, la parure révèle sa véritable forme au contact du mana du porteur, lorsque celui-ci tient le médaillon en main.",
        buyPrice: "",
        sellPrice: "",
        effect:
            "Effet : Parure royale — la cape prend une teinte carmin et illumine les environs dans un rayon de 5 mètres. " +
            "Elle réchauffe et immunise le porteur contre le froid et le givre tant qu'une main maintient le médaillon et y transfuse du mana. " +
            "Durée : 3 tours. Recharge : 3 tours. Contrepartie : au terme des 3 tours, la main tenant le médaillon subit une brûlure, forçant à le lâcher, " +
            "et l'aspiration de mana empêche toute utilisation de magie pendant 1 tour."
    },
    {
        name: "Book Of Aeris",
        category: "consommable",
        image: "assets/images/Book_of_Aeris.png",
        description:
            "Petit livre rare, d'une teinte bleue ornée d'une larme sur sa couverture. Lorsqu'il est activé, le livre ouvre un passage vers une quête adaptative dont la difficulté s'ajuste au niveau du joueur et de son équipe. " +
            "Jusqu'à cinq aventuriers peuvent franchir la brèche et entrer dans l'univers qu'il révèle, un conte vivant d'Astoria aux récompenses mystères uniques adaptées à leur progression. " +
            "Le livre est lié à une seule histoire et disparaît après avoir mené le groupe d'aventuriers à son histoire. " +
            "Le Conte d'Aeris raconte, à la troisième personne, une histoire déchirante : un amour impossible qui condamna une cité des mers entière à disparaître sous le joug d'un tyran.",
        buyPrice: "",
        sellPrice: "700 Kaels",
        effect:
            "Ouvre une quête adaptative liée au Conte d'Aeris pour un groupe jusqu'à cinq aventuriers, puis disparaît une fois l'histoire accomplie."
    },
    {
        name: "The Queen's Poison",
        category: "consommable",
        image: "assets/images/The_Queens_Poison.png",
        description:
            "Il y a de très nombreuses années, une reine isolée, dont le roi était tombé au combat, vit son trône et son royaume acculés. " +
            "Pour protéger son peuple qui baignait le sol de son sang, elle pria de toutes ses forces. " +
            "De ses prières naquit une bénédiction divine : une concoction capable de neutraliser l'esprit de la personne ciblée et de la rendre follement amoureuse de la première personne aperçue. " +
            "Envoyé dans la tente du roi ennemi, le poison de la reine produisit un effet si puissant que, lorsqu'il en comprit la nature, il était trop tard : " +
            "il aima profondément son propre fils, qui dut ôter la vie à son père devenu fou pour survivre.",
        buyPrice: "",
        sellPrice: "",
        effect:
            "Effet : Poison d'amour — neutralise les fonctions logiques et intellectuelles, zombifie l'esprit pendant 5 tours et rend la victime follement et obsessionnellement amoureuse de la première personne vue. " +
            "Ne peut être brisé que par un baiser d'amour véritable."
    },
    {
        name: "Cloche de Résonnance",
        category: "equipement",
        image: "assets/images/Cloche_de_Resonnance.png",
        description:
            "Petit artefact rare aux teintes noires et or. Lorsqu'elle est agitée, la cloche permet de révéler par semi-transparence un décor invisible, comme des chemins secrets, " +
            "en utilisant un principe d'écholocalisation magique. " +
            "En seconde propriété, utilisée par un meister ou une arme, elle plonge le duo dans une salle mentale qui leur est propre. " +
            "Ils y restent enfermés jusqu'à ce que leurs différends soient réglés, faisant de l'objet un outil de rituel pour harmoniser les duos.",
        buyPrice: "",
        sellPrice: "850 Kaels",
        effect:
            "Révèle des chemins et décors cachés via une résonance magique. " +
            "Peut aussi enfermer un meister et son arme dans un espace mental dédié jusqu'à résolution de leurs conflits."
    },
    {
        name: "Veille'Nuit",
        category: "agricole",
        image: "assets/images/VeilleNuit.png",
        description:
            "Fruit ancien ne poussant que sur les terres de Sancturia. En le croquant et en le mangeant, les utilisateurs deviennent lumineux, " +
            "éclairant leur environnement quelles que soient les conditions et leur permettant de se repérer dans les ténèbres. " +
            "Cependant, seuls deux utilisateurs peuvent bénéficier de sa lumière avant que le fruit ne perde ses propriétés. " +
            "La durée d'effet dépend du nombre de consommateurs. Aventuriers, êtes-vous prêts à devenir des lumières dans la nuit ? " +
            "Prenez garde à ne pas perdre vos alliés ni à les aveugler.",
        buyPrice: "25 Kaels /u",
        sellPrice: "15 Kaels /u (vente)",
        effect:
            "Effet : Lumière Aveuglante — illumine les consommateurs (maximum 2). " +
            "Durée : 10 tours pour 1 utilisateur, 5 tours pour 2 utilisateurs. " +
            "Permet d'éclairer la nuit, le brouillard et d'être visible à distance pour les alliés."
    }
    // Pour ajouter / éditer un objet :
    // - modifiez les champs ci-dessus (description, prix, effet, image)
    // - ou ajoutez un nouveau bloc :
    //   {
    //       name: "Nom de l'objet",
    //       image: "assets/images/Mon_Image.png",
    //       description: "Description de l'objet, utilité, durabilité de l'effet, ...",
    //       buyPrice: "prix d'achat",
    //       sellPrice: "prix de vente",
    //       effect: "Effet lorsque l'objet est consommé / utilisé."
    //   }
];


// -----------------------------------------------------------------------------
// Compétences (compétences par catégorie)
// -----------------------------------------------------------------------------
window.skillsCategories = [
    {
        id: "arts",
        label: "Arts & Expression",
        icon: { src: "assets/images/Bouton_1_Competences.png", alt: "Arts & Expression" },
        skills: [
            { name: "Violon", baseValue: 5, icon: "🎻" },
            { name: "Piano", baseValue: 5, icon: "🎹" },
            { name: "Orgue", baseValue: 0, icon: "🎼" },
            { name: "Harpe", baseValue: 5, icon: "🎶" },
            { name: "Lyre", baseValue: 5, icon: "🎶" },
            { name: "Barde", baseValue: 0, icon: "🎤" },
            { name: "Composition musicale", baseValue: 0, icon: "📝" },
            { name: "Sculpture", baseValue: 0, icon: "🗿" },
            { name: "Peinture", baseValue: 0, icon: "🖌️" },
            { name: "Gravure", baseValue: 0, icon: "✒️" },
            { name: "Broderie", baseValue: 0, icon: "🧵" },
            { name: "Couture", baseValue: 0, icon: "🪡" },
            { name: "Chant", baseValue: 10, icon: "🎤" },
            { name: "Danse", baseValue: 10, icon: "💃" },
            { name: "Danse rituelle/envoûtante", baseValue: 15, icon: "🩰" },
            { name: "Jeu d’acteur", baseValue: 0, icon: "🎭" },
            { name: "Théâtre/improvisation", baseValue: 0, icon: "🎭" },
            { name: "Poésie", baseValue: 0, icon: "📜" },
            { name: "Calligraphie", baseValue: 0, icon: "🖋️" },
            { name: "Maquillage", baseValue: 0, icon: "💄" },
            { name: "Équitation", baseValue: 20, icon: "🐎" },
            { name: "Méditation", baseValue: 0, icon: "🧘" }
        ]
    },
    {
        id: "connaissances",
        label: "Connaissances & Langues",
        icon: { src: "assets/images/Bouton_2_Competences.png", alt: "Connaissances & Langues" },
        skills: [
            { name: "Langues anciennes", baseValue: 0, icon: "📚" },
            { name: "Langues étrangères", baseValue: 0, icon: "🗣️" },
            { name: "Lecture", baseValue: 5, icon: "📖" },
            { name: "Écriture", baseValue: 5, icon: "✍️" },
            { name: "Écriture et lecture runique / magique", baseValue: 0, icon: "🔮" },
            { name: "Connaissance de la géopolitique", baseValue: 0, icon: "🗺️" },
            { name: "Connaissance de l’histoire", baseValue: 5, icon: "📜" },
            { name: "Connaissance de la culture", baseValue: 5, icon: "🏛️" },
            { name: "Connaissance de la cartographie", baseValue: 0, icon: "🧭" },
            { name: "Connaissance de la mythologie", baseValue: 5, icon: "📖" },
            { name: "Connaissance de la faune", baseValue: 10, icon: "🐾" },
            { name: "Connaissance de la flore", baseValue: 0, icon: "🌿" },
            { name: "Connaissance des monstres", baseValue: 15, icon: "👹" },
            { name: "Connaissance des sciences magiques", baseValue: 0, icon: "✨" },
            { name: "Connaissance Meister & Arme", baseValue: 0, icon: "⚔️" },
            { name: "Connaissances médicinales", baseValue: 0, icon: "💊" },
            { name: "Étiquette religieuse", baseValue: 15, icon: "⛪" },
            { name: "Étiquette royale", baseValue: 10, icon: "👑" },
            { name: "Stratégie militaire avancée", baseValue: 0, icon: "🎯" }
        ]
    },
    {
        id: "combat",
        label: "Combat & Défense",
        icon: { src: "assets/images/Bouton_3_Competences.png", alt: "Combat & Défense" },
        skills: [
            { name: "Force", baseValue: 0, icon: "💪" },
            { name: "Endurance", baseValue: 5, icon: "🏃" },
            { name: "Agilité", baseValue: 5, icon: "🤸" },
            { name: "Vitesse", baseValue: 5, icon: "💨" },
            { name: "Précision", baseValue: 0, icon: "🎯" },
            { name: "Résistance", baseValue: 5, icon: "🛡️" },
            { name: "Parade / contre", baseValue: 0, icon: "🛡️" },
            { name: "Maîtrise du bouclier", baseValue: 0, icon: "🛡️" },
            { name: "Maîtrise du bâton", baseValue: 0, icon: "🪄" },
            { name: "Maîtrise du trident", baseValue: 0, icon: "🔱" },
            { name: "Maîtrise du fouet", baseValue: 0, icon: "📿" },
            { name: "Maîtrise de l’épée lourde", baseValue: 0, icon: "⚔️" },
            { name: "Maîtrise du sabre", baseValue: 0, icon: "🗡️" },
            { name: "Maîtrise du katana", baseValue: 0, icon: "🗡️" },
            { name: "Maîtrise de la rapière", baseValue: 0, icon: "🤺" },
            { name: "Maîtrise du poignard", baseValue: 0, icon: "🔪" },
            { name: "Maîtrise CAC main nue", baseValue: 5, icon: "✊" },
            { name: "Maîtrise de la massue", baseValue: 0, icon: "🪓" },
            { name: "Maîtrise du gourdin", baseValue: 0, icon: "🪓" },
            { name: "Maîtrise du marteau de guerre", baseValue: 0, icon: "🔨" },
            { name: "Maîtrise du fléau", baseValue: 0, icon: "🔗" },
            { name: "Maîtrise de l’arc", baseValue: 0, icon: "🏹" }
        ]
    },
    {
        id: "pouvoirs",
        label: "Pouvoirs & Alice | Arme & Meister",
        icon: { src: "assets/images/Bouton_4_Competences.png", alt: "Pouvoirs & Alice | Arme & Meister" },
        skills: [
            { name: "Puissance Alice 1", baseValue: 0, icon: "✨" },
            { name: "Contrôle Alice 1", baseValue: 0, icon: "✨" },
            { name: "Puissance Alice 2", baseValue: 0, icon: "✨" },
            { name: "Contrôle Alice 2", baseValue: 0, icon: "✨" },
            { name: "Potentiel Magique", baseValue: 0, icon: "🔮" },
            { name: "Maîtrise Magie 1", baseValue: 0, icon: "🪄" },
            { name: "Puissance Magie 1", baseValue: 0, icon: "💥" },
            { name: "Maîtrise Magie 2", baseValue: 0, icon: "🪄" },
            { name: "Puissance Magie 2", baseValue: 0, icon: "💥" },
            { name: "Maîtrise Magie 3", baseValue: 0, icon: "🪄" },
            { name: "Puissance Magie 3", baseValue: 0, icon: "💥" },
            { name: "Résonnance des Âmes", baseValue: 0, icon: "🧬" },
            { name: "Propagation de longueur d'Âmes", baseValue: 0, icon: "🌌" },
            { name: "Détection d'Âmes", baseValue: 0, icon: "👁️" },
            { name: "Synchronisation d'Âmes", baseValue: 0, icon: "🔗" },
            { name: "Puissance de la capacité unique", baseValue: 0, icon: "⚡" },
            { name: "Maîtrise de la capacité unique", baseValue: 0, icon: "🌀" },
            { name: "Constitution", baseValue: 0, icon: "🛡️" },
            { name: "Impact", baseValue: 0, icon: "💢" },
            { name: "Légèreté", baseValue: 0, icon: "🎈" },
            { name: "Perforation", baseValue: 0, icon: "🗡️" },
            { name: "Tranchant", baseValue: 0, icon: "⚔️" }
        ]
    },
    {
        id: "social",
        label: "Compétences Sociales",
        icon: { src: "assets/images/Bouton_Competences_5.png", alt: "Compétences Sociales" },
        skills: [
            { name: "Séduction", baseValue: 0, icon: "💘" },
            { name: "Persuasion", baseValue: 5, icon: "🗣️" },
            { name: "Bluff", baseValue: 0, icon: "🎲" },
            { name: "Éloquence", baseValue: 5, icon: "🗨️" },
            { name: "Charisme", baseValue: 5, icon: "✨" },
            { name: "Diplomatie", baseValue: 0, icon: "🤝" },
            { name: "Réseautage", baseValue: 0, icon: "🔗" },
            { name: "Influence", baseValue: 15, icon: "📣" },
            { name: "Leadership", baseValue: 5, icon: "🧭" },
            { name: "Étiquette", baseValue: 0, icon: "📜" },
            { name: "Éthique", baseValue: 10, icon: "⚖️" },
            { name: "Bonté", baseValue: 15, icon: "💕" },
            { name: "Bienveillance", baseValue: 15, icon: "🤲" },
            { name: "Observation", baseValue: 0, icon: "👀" },
            { name: "Résistance mentale", baseValue: 0, icon: "🧠" },
            { name: "Stratège", baseValue: 0, icon: "📈" },
            { name: "Tactique de groupe", baseValue: 0, icon: "🧑‍🤝‍🧑" },
            { name: "Esprit vif", baseValue: 0, icon: "⚡" },
            { name: "Intimidation", baseValue: 0, icon: "😠" }
        ]
    },
    {
        id: "artisanat",
        label: "Artisanat & Métier",
        icon: { src: "assets/images/Bouton_Competences_6.png", alt: "Artisanat & Métier" },
        skills: [
            { name: "Forgeron", baseValue: 0, icon: "⚒️" },
            { name: "Armurier", baseValue: 0, icon: "🛡️" },
            { name: "Joaillerie", baseValue: 0, icon: "💍" },
            { name: "Inventeur", baseValue: 0, icon: "💡" },
            { name: "Bâtisseur", baseValue: 0, icon: "🧱" },
            { name: "Tailleur", baseValue: 0, icon: "🧵" },
            { name: "Cuisine", baseValue: 0, icon: "🍳" },
            { name: "Personnel de maison", baseValue: 0, icon: "🧹" },
            { name: "Mineur", baseValue: 0, icon: "⛏️" },
            { name: "Navigateur", baseValue: 0, icon: "🧭" }
        ]
    },
    {
        id: "nature",
        label: "Nature & Survie",
        icon: { src: "assets/images/Bouton_7_Competences.png", alt: "Nature & Survie" },
        skills: [
            { name: "Discrétion", baseValue: 0, icon: "🥷" },
            { name: "Camouflage", baseValue: 0, icon: "🌲" },
            { name: "Création de piège", baseValue: 15, icon: "🪤" },
            { name: "Survie en milieu hostile", baseValue: 10, icon: "🏕️" },
            { name: "Survie", baseValue: 5, icon: "🧭" },
            { name: "Chasse", baseValue: 0, icon: "🏹" },
            { name: "Pêche", baseValue: 0, icon: "🎣" },
            { name: "Travail du cuir", baseValue: 0, icon: "👞" },
            { name: "Botanique", baseValue: 0, icon: "🌿" },
            { name: "Herboristerie", baseValue: 0, icon: "🪴" },
            { name: "Alchimie (théorie)", baseValue: 0, icon: "📚" },
            { name: "Alchimie (pratique)", baseValue: 0, icon: "⚗️" },
            { name: "Apiculture", baseValue: 0, icon: "🐝" },
            { name: "Apothicaire", baseValue: 0, icon: "🧪" },
            { name: "Lien avec la nature", baseValue: 15, icon: "🌳" },
            { name: "Religion", baseValue: 15, icon: "🙏" }
        ]
    },
    {
        id: "physique",
        label: "Physique",
        icon: { src: "assets/images/Bouton_8_Competences.png", alt: "Physique" },
        skills: [
            { name: "Beauté", baseValue: 1, icon: "✨" },
            { name: "Prestance", baseValue: 1, icon: "🕴️" },
            { name: "Souplesse", baseValue: 1, icon: "🤸" },
            { name: "Fluidité", baseValue: 1, icon: "💧" },
            { name: "Posture", baseValue: 1, icon: "🧘" },
            { name: "Charme", baseValue: 10, icon: "💖" },
            { name: "Aura", baseValue: 10, icon: "🌟" },
            { name: "Élégance", baseValue: 1, icon: "👗" },
            { name: "Raffinement", baseValue: 1, icon: "🍸" },
            { name: "Harmonie", baseValue: 1, icon: "🎶" },
            { name: "Délicatesse", baseValue: 1, icon: "🪶" },
            { name: "Dignité", baseValue: 3, icon: "🎖️" },
            { name: "Pureté", baseValue: 13, icon: "🕊️" },
            { name: "Sportif", baseValue: 10, icon: "🏅" }
        ]
    },
    {
        id: "reputation",
        label: "Réputation & Marché",
        icon: { src: "assets/images/Bouton_9_Competences.png", alt: "Réputation & Marché" },
        skills: [
            { name: "Négociation", baseValue: 0, icon: "🤝" },
            { name: "Réputation", baseValue: 12, icon: "⭐" },
            { name: "Commerce", baseValue: 0, icon: "💰" },
            { name: "Influence", baseValue: 13, icon: "📣" }
        ]
    }
];
