(function () {
    const basePath = "assets/images/";

    function normalizeName(name) {
        return (name || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "")
            .toLowerCase();
    }

    const overridesByKey = {
        [normalizeName("Poudre de Traçage")]: basePath + "Poudre_de_Tracage.png",
        [normalizeName("Fiole de vitalité")]: basePath + "Fiole_de_vitalite.jpg",
        [normalizeName("Larme de Matera")]: basePath + "Larme_de_Matera.png",
        [normalizeName("Armure de Vexarion")]: basePath + "Armure_de_Vexarion.png",
        [normalizeName("Clef Manndorf")]: basePath + "Clef_Manndorf.png",
        [normalizeName("Parchemin d'Éveil")]: basePath + "Parchemin_Eveil.jpg",
        [normalizeName("Parchemin d'Ascension")]: basePath + "Parchemin_Ascension.jpg",
        [normalizeName("Sceptre de Krythus")]: basePath + "Sceptre_de_Krythus.png",
        [normalizeName("Cape de l'Aube Vermeille [Exclu saison]")]:
            basePath + "Cape_de_lAube_Vermeille_off.jpg",
        [normalizeName("Book Of Aeris")]: basePath + "Book_of_Aeris.png",
        [normalizeName("The Queen's Poison")]: basePath + "The_Queens_Poison.png",
        [normalizeName("Cloche de Résonnance")]: basePath + "Cloche_de_Resonnance.png",
        [normalizeName("Veille'Nuit")]: basePath + "VeilleNuit.png"
    };

    const galleriesByKey = {
        [normalizeName("Cape de l'Aube Vermeille [Exclu saison]")]: [
            basePath + "Cape_de_lAube_Vermeille_off.jpg",
            basePath + "Cape_de_lAube_Vermeille_on.jpg"
        ]
    };

    const largePlaceholder =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>" +
                "<rect width='200' height='200' fill='#fce4ec'/>" +
                "<text x='50%' y='50%' text-anchor='middle' fill='#d81b60' font-family='Segoe UI, Arial' font-size='16'>Image</text>" +
            "</svg>"
        );

    const smallPlaceholder =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>" +
                "<rect width='80' height='80' fill='#f0f0f0'/>" +
                "<text x='50%' y='50%' text-anchor='middle' dy='0.3em' fill='#d81b60' font-family='Arial' font-size='14'>?</text>" +
            "</svg>"
        );

    function resolveItemImages(item) {
        const name = item && (item.name || item.nom || "");
        const key = normalizeName(name);
        const override = overridesByKey[key];
        const gallery = galleriesByKey[key];
        const rawImage = item && (item.image || item.img || "");

        const primaryCandidate = (gallery && gallery[0]) || override || rawImage;
        const primary = primaryCandidate || largePlaceholder;

        const galleryList =
            (gallery && gallery.length ? gallery : []).length > 0
                ? gallery
                : (primaryCandidate ? [primaryCandidate] : [largePlaceholder]);

        return {
            primary,
            gallery: galleryList.map((src) => src || largePlaceholder)
        };
    }

    window.astoriaImageHelpers = {
        basePath,
        normalizeName,
        overridesByKey,
        galleriesByKey,
        largePlaceholder,
        smallPlaceholder,
        resolveItemImages
    };
})();

