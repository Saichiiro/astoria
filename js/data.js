const inventoryData = [
    {
        name: "Kaels",
        category: "monnaie",
        image: "assets/images/label_kaels.png",
        description: "Monnaie principale du royaume d'Astoria. Utilisée pour les échanges commerciaux et les transactions.",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Poudre de Traçage",
        category: "consommable",
        image: "assets/images/objets/Poudre_de_Tracage.png",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Larme de Matera",
        category: "consommable",
        image: "assets/images/objets/Larme_de_Matera.png",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Fruit Papooru",
        category: "agricole",
        image: "assets/images/objets/Fruit_Papooru.jpg",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Fiole de vitalité",
        category: "consommable",
        image: "assets/images/objets/Fiole_de_vitalite.jpg",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: "",
        modifiers: [
            { stat: "Endurance", value: 1, type: "flat", durationTurns: 3 }
        ]
    },
    {
        name: "Parchemin d'Éveil",
        category: "consommable",
        image: "assets/images/objets/Parchemin_Eveil.jpg",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Parchemin d'Ascension",
        category: "consommable",
        image: "assets/images/objets/Parchemin_Ascension.jpg",
        description: "[Description de l'objet, utilité, durabilité de l'effet, ...]",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    },
    {
        name: "Clef Manndorf",
        category: "consommable",
        image: "assets/images/objets/Clef_Manndorf.png",
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
        image: "assets/images/objets/Armure_de_Vexarion.png",
        description:
            "Cette armure luxueuse, forgée dans les lumières iridescentes du domaine divin, est un artefact sacré offert par Vexarion, Dieu de la Guerre et de la Stratégie. " +
            "Chaque plaque scintille d'un éclat changeant, comme si elle absorbait et reflétait la droiture du porteur. " +
            "Bénie par la Loi d'Honneur de Vexarion, elle déploie autour de son porteur une aura scintillante perceptible par tous les combattants. " +
            "Cette aura réagit uniquement aux actes déloyaux, jugeant la loyauté de ceux qui l'affrontent.",
        buyPrice: "",
        sellPrice: "",
        effect:
            "Effet : Aura d'Honneur — lorsqu'un ennemi porte une attaque déloyale (dans le dos, hors duel, coup bas), la force de l'assaillant est réduite de 10 points pendant 2 tours. " +
            "L'effet ne se déclenche que si le code d'honneur de Vexarion est bafoué et n'accorde aucun avantage lors d'un combat loyal.",
        modifiers: [
            { stat: "Force", value: 1, type: "flat" },
            { stat: "Resistance", value: 1, type: "flat" }
        ]
    },
    {
        name: "Sceptre de Krythus",
        category: "equipement",
        image: "assets/images/objets/Sceptre_de_Krythus.png",
        description:
            "Artefact sacré façonné dans les glaces du mont le plus haut, le Sceptre de Krythus incarne la puissance implacable de Krythus, Dieu de l'Hiver et des Tempêtes de Glace. " +
            "Sa tige gravée de runes givrées s'allonge d'elle-même pour s'adapter parfaitement à la taille de son porteur, comme si l'arme reconnaissait instinctivement son maître. " +
            "Le cristal à son sommet renferme une bribe de la magie du dieu, amplifiant la magie de glace qui y circule et renforçant chaque sort gelé lancé par le porteur.",
        buyPrice: "",
        sellPrice: "",
        effect:
            "Effet : Ajustement Givré — le sceptre adapte automatiquement la longueur de son manche à la morphologie du porteur, devenant une extension naturelle de son bras. " +
            "Effet : Faveur Glaciale — augmente la puissance des sorts de glace (+5 points de Glace, +5 points de Magie). " +
            "Effet : Cœur de Givre — libère une onde glaciale qui fige le sol et l'air dans un rayon de 10 mètres autour du porteur (durée : 3 tours, recharge : 5 tours, 1 tour de charge).",
        modifiers: [
            { stat: "Puissance Magie 1", value: 2, type: "flat" },
            { stat: "Maitrise Magie 1", value: 1, type: "flat" }
        ]
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
        image: "assets/images/objets/Book_of_Aeris.png",
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
        image: "assets/images/objets/The_Queens_Poison.png",
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
        image: "assets/images/objets/Cloche_de_Resonnance.png",
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
        image: "assets/images/objets/VeilleNuit.png",
        description:
            "Fruit ancien ne poussant que sur les terres de Sancturia. En le croquant et en le mangeant, les utilisateurs deviennent lumineux, " +
            "éclairant leur environnement quelles que soient les conditions et leur permettant de se repérer dans les ténèbres. " +
            "Cependant, seuls deux utilisateurs peuvent bénéficier de sa lumière avant que le fruit ne perde ses propriétés. " +
            "La durée d'effet dépend du nombre de consommateurs. Aventuriers, êtes-vous prêts à devenir des lumières dans la nuit ? " +
            "Prenez garde à ne pas perdre vos alliés ni à les aveugler.",
        buyPrice: "25 Kaels /u",
        sellPrice: "15 Kaels /u",
        effect:
            "Effet : Lumière Aveuglante — illumine les consommateurs (maximum 2). " +
            "Durée : 10 tours pour 1 utilisateur, 5 tours pour 2 utilisateurs. " +
            "Permet d'éclairer la nuit, le brouillard et d'être visible à distance pour les alliés.",
        modifiers: [
            { stat: "Observation", value: 1, type: "flat", durationTurns: 2 }
        ]
    },
    {
        name: "Lucky Soul",
        category: "consommable",
        image: "assets/nokorah/lucky-soul.svg",
        description: "Ressource rare consommee pour invoquer, ameliorer ou abandonner un Nokorah.",
        buyPrice: "",
        sellPrice: "",
        effect: ""
    }
    // Pour ajouter / éditer un objet :
    // - modifiez les champs ci-dessus (description, prix, effet, image)
    // - ou ajoutez un nouveau bloc :
    //   {
    //       name: "Nom de l'objet",
    //       image: "assets/images/objets/Mon_Image.png",
    //       description: "Description de l'objet, utilité, durabilité de l'effet, ...",
    //       buyPrice: "prix d'achat",
    //       sellPrice: "prix de vente",
    //       effect: "Effet lorsque l'objet est consommé / utilisé."
    //   }
];

(function () {
    const SCROLL_TYPES_META_KEY = "astoria_scroll_types_meta";
    const DEFAULT_SCROLL_TYPES = [
        { key: "feu", label: "Feu", emoji: String.fromCodePoint(0x1F525), matchers: ["feu"] },
        { key: "eau", label: "Eau", emoji: String.fromCodePoint(0x1F4A7), matchers: ["eau"] },
        { key: "vent", label: "Vent", emoji: String.fromCodePoint(0x1F32C), matchers: ["vent"] },
        { key: "terre", label: "Terre", emoji: String.fromCodePoint(0x1FAA8), matchers: ["terre"] },
        { key: "nature", label: "Nature", emoji: String.fromCodePoint(0x1F331), matchers: ["nature"] },
        { key: "roche", label: "Roche", emoji: String.fromCodePoint(0x1FAA8), matchers: ["roche"] },
        { key: "metaux", label: "Métaux", emoji: String.fromCodePoint(0x1F9F2), matchers: ["metaux", "métaux"] },
        { key: "cryo", label: "Cryo (glace)", emoji: String.fromCodePoint(0x1F9CA), matchers: ["cryo", "glace"] },
        { key: "foudre", label: "Foudre", emoji: String.fromCodePoint(0x26A1), matchers: ["foudre"] },
        { key: "lumiere", label: "Lumière", emoji: String.fromCodePoint(0x1F31F), matchers: ["lumiere", "lumière"] },
        { key: "tenebres", label: "Ténèbres", emoji: String.fromCodePoint(0x1F319), matchers: ["tenebres", "ténèbres"] },
        { key: "bois", label: "Bois", emoji: String.fromCodePoint(0x1FAB5), matchers: ["bois"] },
        { key: "boue", label: "Boue", emoji: String.fromCodePoint(0x1F7EB), matchers: ["boue"] },
        { key: "lave", label: "Lave", emoji: String.fromCodePoint(0x1F30B), matchers: ["lave"] },
        { key: "acide", label: "Acide", emoji: String.fromCodePoint(0x1F9EA), matchers: ["acide"] },
        { key: "cristal", label: "Cristal", emoji: String.fromCodePoint(0x1F48E), matchers: ["cristal"] },
        { key: "gravite", label: "Gravité", emoji: String.fromCodePoint(0x1FA90), matchers: ["gravite", "gravité"] },
        { key: "osmose", label: "Osmose", emoji: String.fromCodePoint(0x1F9EC), matchers: ["osmose"] },
        { key: "telekinesie", label: "Télékinésie", emoji: String.fromCodePoint(0x1F9E0), matchers: ["telekinesie", "télékinésie"] },
        { key: "invisibilite", label: "Invisibilité", emoji: String.fromCodePoint(0x1FAE5), matchers: ["invisibilite", "invisibilité"] },
        { key: "vol", label: "Vol", emoji: String.fromCodePoint(0x1FABD), matchers: ["vol"] },
        { key: "soin", label: "Soin", emoji: String.fromCodePoint(0x1F496), matchers: ["soin"] },
        { key: "amelioration-sens", label: "Amélioration des sens", emoji: String.fromCodePoint(0x1F441), matchers: ["amelioration des sens", "amélioration des sens"] },
        { key: "reve", label: "Rêve", emoji: String.fromCodePoint(0x1F4AD), matchers: ["reve", "rêve"] },
        { key: "controle-mental", label: "Contrôle mental", emoji: String.fromCodePoint(0x1F9E0), matchers: ["controle mental", "contrôle mental"] },
        { key: "controle-temps", label: "Contrôle du temps", emoji: String.fromCodePoint(0x23F3), matchers: ["controle du temps", "controle temps", "contrôle du temps", "contrôle temps"] },
        { key: "portails", label: "Portails", emoji: String.fromCodePoint(0x1F300), matchers: ["portail", "portails", "portal", "portals"] },
        { key: "monde-poche", label: "Monde de poche", emoji: String.fromCodePoint(0x1F5FA), matchers: ["monde de poche"] },
        { key: "teleportation", label: "Téléportation", emoji: String.fromCodePoint(0x1F6AA), matchers: ["teleportation", "téléportation"] },
        { key: "mana-brut", label: "Mana brut", emoji: String.fromCodePoint(0x1F300), matchers: ["mana brut"] },
        { key: "ordre", label: "Ordre", emoji: String.fromCodePoint(0x2696), matchers: ["ordre"] },
        { key: "antimagie", label: "Antimagie", emoji: String.fromCodePoint(0x1F6AB), matchers: ["antimagie"] },
        { key: "amelioration-runique", label: "Amélioration runique", emoji: String.fromCodePoint(0x1FA84), matchers: ["amelioration runique", "amélioration runique"] },
        { key: "invocation-energie", label: "Invocation d'énergie", emoji: String.fromCodePoint(0x1F4AB), matchers: ["invocation d'energie", "invocation d’énergie", "invocation energie"] },
        { key: "amplification-elementaire", label: "Amplification élémentaire", emoji: String.fromCodePoint(0x1F52E), matchers: ["amplification elementaire", "amplification élémentaire"] },
        { key: "rotation", label: "Rotation", emoji: String.fromCodePoint(0x1F504), matchers: ["rotation"] },
        { key: "magnetisme", label: "Magnétisme", emoji: String.fromCodePoint(0x1F9F2), matchers: ["magnetisme", "magnétisme"] },
        { key: "fil", label: "Fil", emoji: String.fromCodePoint(0x1F9F5), matchers: ["fil"] },
        { key: "sable", label: "Sable", emoji: String.fromCodePoint(0x1F3DC), matchers: ["sable"] },
        { key: "ombres-solides", label: "Ombres solides", emoji: String.fromCodePoint(0x1F573), matchers: ["ombres solides"] },
        { key: "verre", label: "Verre", emoji: String.fromCodePoint(0x1FA9F), matchers: ["verre"] },
        { key: "cendres", label: "Cendres", emoji: String.fromCodePoint(0x26B1), matchers: ["cendres"] },
        { key: "argile", label: "Argile", emoji: String.fromCodePoint(0x1F9F1), matchers: ["argile"] },
        { key: "invocation-animale", label: "Invocation animale", emoji: String.fromCodePoint(0x1F43E), matchers: ["invocation animale"] },
        { key: "invocation-armes", label: "Invocation d'armes", emoji: String.fromCodePoint(0x2694), matchers: ["invocation d'armes", "invocation armes"] },
        { key: "invocation-golems", label: "Invocation de golems", emoji: String.fromCodePoint(0x1F5FF), matchers: ["invocation de golems", "invocation golems"] },
        { key: "esprits-elementaires", label: "Esprits élémentaires", emoji: String.fromCodePoint(0x1F47B), matchers: ["esprits elementaires", "esprits élémentaires"] },
        { key: "pantins", label: "Pantins", emoji: String.fromCodePoint(0x1F38E), matchers: ["pantins"] },
        { key: "fabrication-familiers", label: "Fabrication de familiers", emoji: String.fromCodePoint(0x1F9F8), matchers: ["fabrication de familiers", "fabrication familiers"] },
        { key: "metamorphose-animale", label: "Métamorphose animale", emoji: String.fromCodePoint(0x1F43A), matchers: ["metamorphose animale", "métamorphose animale"] },
        { key: "mutations", label: "Mutations", emoji: String.fromCodePoint(0x1F9EC), matchers: ["mutations"] },
        { key: "regeneration-avancee", label: "Régénération avancée", emoji: String.fromCodePoint(0x1FA79), matchers: ["regeneration avancee", "régénération avancée"] },
        { key: "microbiologie", label: "Microbiologie", emoji: String.fromCodePoint(0x1F9A0), matchers: ["microbiologie"] },
        { key: "son", label: "Son", emoji: String.fromCodePoint(0x1F50A), matchers: ["son"] },
        { key: "illusion", label: "Illusion", emoji: String.fromCodePoint(0x1F3AD), matchers: ["illusion"] },
        { key: "sang", label: "Sang", emoji: String.fromCodePoint(0x1FA78), matchers: ["sang"] },
        { key: "chance", label: "Chance / Malchance", emoji: String.fromCodePoint(0x1F340), matchers: ["chance", "malchance"] },
        { key: "lien", label: "Lien", emoji: String.fromCodePoint(0x1F517), matchers: ["lien"] },
        { key: "detection", label: "Détection", emoji: String.fromCodePoint(0x1F50D), matchers: ["detection", "détection"] },
        { key: "silence", label: "Silence", emoji: String.fromCodePoint(0x1F92B), matchers: ["silence"] },
        { key: "corruption", label: "Corruption", emoji: String.fromCodePoint(0x1F480), matchers: ["corruption"] },
        { key: "cercle-demoniaque", label: "Cercle démoniaque", emoji: String.fromCodePoint(0x1F52F), matchers: ["cercle demoniaque", "cercle démoniaque"] },
        { key: "devoreur-ames", label: "Dévoreur d'âmes", emoji: String.fromCodePoint(0x1F47B), matchers: ["devoreur d'ames", "dévoreur d'âmes"] },
        { key: "rouille", label: "Rouille", emoji: String.fromCodePoint(0x1F9F2), matchers: ["rouille"] },
        { key: "berserker", label: "Berserker", emoji: String.fromCodePoint(0x1FA93), matchers: ["berserker"] },
        { key: "maledictions", label: "Malédictions", emoji: String.fromCodePoint(0x1F9FF), matchers: ["maledictions", "malédictions"] },
        { key: "variation-masse", label: "Variation de masse", emoji: String.fromCodePoint(0x2696), matchers: ["variation de masse"] },
        { key: "meteorologie", label: "Météorologie", emoji: String.fromCodePoint(0x26C8), matchers: ["meteorologie", "météorologie"] },
        { key: "chimie-magique", label: "Chimie magique", emoji: String.fromCodePoint(0x2697), matchers: ["chimie magique"] },
        { key: "magie-astrale", label: "Magie astrale", emoji: String.fromCodePoint(0x1F30C), matchers: ["magie astrale"] },
        { key: "elasticite", label: "Élasticité", emoji: String.fromCodePoint(0x1F9F6), matchers: ["elasticite", "élasticité"] }
    ];

    const normalizeText = window.astoriaItemTags?.normalizeText || ((value) => String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase());

    const loadStoredScrollTypes = () => {
        try {
            const raw = localStorage.getItem(SCROLL_TYPES_META_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || !parsed.length) return null;
            return parsed
                .filter((entry) => entry && entry.key)
                .map((entry) => ({
                    key: String(entry.key),
                    label: entry.label ? String(entry.label) : String(entry.key),
                    emoji: entry.emoji ? String(entry.emoji) : "",
                    matchers: Array.isArray(entry.matchers) ? entry.matchers : []
                }));
        } catch {
            return null;
        }
    };

    const stored = loadStoredScrollTypes();
    const existing = Array.isArray(window.astoriaScrollTypes) && window.astoriaScrollTypes.length
        ? window.astoriaScrollTypes
        : null;
    const list = (stored && stored.length) ? stored : (existing || DEFAULT_SCROLL_TYPES);

    window.astoriaScrollTypes = list;

    const scrollTypeMap = new Map(list.map((entry) => [normalizeText(entry.key), entry]));
    window.astoriaGetScrollTypeMeta = (key) => {
        if (!key) return null;
        return scrollTypeMap.get(normalizeText(key)) || null;
    };
})();

(function () {
    if (window.astoriaItemTags) return;

    const normalizeText = window.astoriaListHelpers?.normalizeText || ((value) => String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase());

    const splitTags = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
            return value.split(/[;,]/g);
        }
        return [];
    };

    const normalizeTag = (value) => normalizeText(value).trim();

    const getTags = (itemOrTags) => {
        let raw = itemOrTags;
        if (itemOrTags && typeof itemOrTags === "object" && !Array.isArray(itemOrTags)) {
            raw = itemOrTags.tags ?? itemOrTags.tag ?? itemOrTags.labels ?? null;
        }
        return splitTags(raw)
            .map((tag) => normalizeTag(String(tag || "")))
            .filter(Boolean);
    };

    const hasTag = (itemOrTags, tag) => {
        const tags = getTags(itemOrTags);
        if (!tags.length) return false;
        const needle = normalizeTag(tag);
        return tags.includes(needle);
    };

    const getTaggedValue = (tags, prefix) => {
        const key = normalizeTag(prefix);
        for (const tag of tags) {
            if (tag.startsWith(`${key}:`) || tag.startsWith(`${key}-`) || tag.startsWith(`${key}_`)) {
                return tag.slice(key.length + 1);
            }
        }
        return "";
    };

    const isScrollItem = (itemOrName) => {
        const tags = getTags(itemOrName);
        if (tags.length) {
            if (tags.some((tag) =>
                tag === "scroll" ||
                tag === "parchemin" ||
                tag.startsWith("scroll:") ||
                tag.startsWith("parchemin:") ||
                tag.startsWith("scroll-") ||
                tag.startsWith("parchemin-") ||
                tag.startsWith("scroll_") ||
                tag.startsWith("parchemin_")
            )) {
                return true;
            }
        }
        const name = typeof itemOrName === "string" ? itemOrName : itemOrName?.name;
        if (!name) return false;
        const normalized = normalizeText(name);
        return normalized.includes("parchemin") || normalized.includes("scroll");
    };

    const getScrollCategory = (itemOrName) => {
        const tags = getTags(itemOrName);
        if (tags.length) {
            const tagged = getTaggedValue(tags, "scroll") || getTaggedValue(tags, "parchemin");
            if (tagged) return tagged;
            if ((tags.includes("scroll") || tags.includes("parchemin")) && tags.includes("eveil")) return "eveil";
            if ((tags.includes("scroll") || tags.includes("parchemin")) && tags.includes("ascension")) return "ascension";
        }
        const name = typeof itemOrName === "string" ? itemOrName : itemOrName?.name;
        if (!name) return null;
        const normalized = normalizeText(name);
        if (!normalized.includes("parchemin") && !normalized.includes("scroll")) return null;
        if (normalized.includes("eveil") || normalized.includes("eveille") || (normalized.includes("veil") && normalized.includes("parchemin"))) {
            return "eveil";
        }
        if (normalized.includes("ascension")) return "ascension";
        return null;
    };

    const getScrollTypeKeyFromTags = (itemOrTags) => {
        const tags = getTags(itemOrTags);
        if (!tags.length) return "";
        for (const tag of tags) {
            if (tag.startsWith("scroll:") || tag.startsWith("scroll-") || tag.startsWith("scroll_")) {
                return tag.slice(7);
            }
            if (tag.startsWith("parchemin:") || tag.startsWith("parchemin-") || tag.startsWith("parchemin_")) {
                return tag.slice(10);
            }
        }
        return "";
    };

    window.astoriaItemTags = {
        normalizeText,
        getTags,
        hasTag,
        isScrollItem,
        getScrollCategory,
        getScrollTypeKeyFromTags
    };
})();

window.inventoryData = inventoryData;

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
            { name: "Maîtrise Magie 1", baseValue: 0, icon: "🪄" },
            { name: "Puissance Magie 1", baseValue: 0, icon: "💥" },
            { name: "Maîtrise Magie 2", baseValue: 0, icon: "🪄" },
            { name: "Puissance Magie 2", baseValue: 0, icon: "💥" },
            { name: "Maîtrise Magie 3", baseValue: 0, icon: "🪄" },
            { name: "Puissance Magie 3", baseValue: 0, icon: "💥" },
            { name: "Maîtrise Magie Supplémentaire", baseValue: 0, icon: "🪄" },
            { name: "Puissance Magie Supplémentaire", baseValue: 0, icon: "💥" },
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

