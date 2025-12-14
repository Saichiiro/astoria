(function () {
    const body = document.body;
    const isAdmin = body.dataset.admin === "true" || !body.hasAttribute("data-admin");

    const navButtons = Array.from(document.querySelectorAll(".magic-nav-btn"));
    const sections = Array.from(document.querySelectorAll(".magic-section"));
    const capacityList = document.getElementById("magicCapacityList");
    const capacityFilter = document.getElementById("magicCapacityFilter");
    const addCapacityBtn = document.getElementById("magicAddCapacityBtn");
    const adminSection = document.getElementById("magic-admin");

    if (!isAdmin && adminSection) {
        const adminNav = document.querySelector(".magic-nav-btn--admin");
        if (adminNav) {
            adminNav.style.display = "none";
        }
        adminSection.hidden = true;
    }

    navButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            if (!targetId) return;

            navButtons.forEach((b) => b.classList.remove("magic-nav-btn--active"));
            btn.classList.add("magic-nav-btn--active");

            sections.forEach((section) => {
                if (section.id === targetId) {
                    section.classList.add("magic-section--active");
                } else {
                    section.classList.remove("magic-section--active");
                }
            });
        });
    });

    const initialSheet = {
        specialization: {
            name: "",
            type: "",
            subtypes: [],
            summaryRp: "",
            summaryTech: ""
        },
        parameters: {
            source: "",
            range: "",
            effectType: "",
            globalCost: "",
            activation: "",
            weaknesses: ""
        },
        capacities: [
            {
                id: "cap-signature",
                name: "Lame astrale résonante",
                type: "offensif",
                rank: "signature",
                stats: ["Combat", "Pouvoirs"],
                rp: "Le meister fait vibrer son arme et libère une onde astrale qui déchire l’air.",
                effect: "Attaque de zone en cône, dégâts moyens, peut déséquilibrer les adversaires proches.",
                cost: "Consomme une grande partie de la réserve magique, utilisable 1 à 2 fois par scène.",
                limits: "Inefficace contre les protections mentales ou purement spirituelles.",
                adminNote: "Capacité signature à surveiller selon le niveau global du personnage.",
                locked: false
            },
            {
                id: "cap-support",
                name: "Chant de synchronisation",
                type: "soutien",
                rank: "majeur",
                stats: ["Social", "Pouvoirs"],
                rp: "Une mélodie résonne entre meister et arme, renforçant leur lien.",
                effect: "Octroie un bonus temporaire aux actions coordonnées meister/arme.",
                cost: "Nécessite concentration et temps de préparation.",
                limits: "Interrompu si le lanceur subit des dégâts importants.",
                adminNote: "",
                locked: false
            }
        ],
        progression: {
            maxSlots: 8,
            startingSlots: 4
        },
        admin: {
            status: "draft",
            notes: ""
        }
    };

    function renderCapacities(filterType) {
        if (!capacityList) return;

        capacityList.innerHTML = "";

        initialSheet.capacities
            .filter((cap) => !filterType || cap.type === filterType)
            .forEach((cap) => {
                const li = document.createElement("li");
                li.className = "magic-capacity-item";
                li.dataset.type = cap.type;

                li.innerHTML = `
                    <button type="button" class="magic-capacity-header" aria-expanded="false">
                        <div class="magic-capacity-main">
                            <span class="magic-capacity-name">${cap.name}</span>
                            <span class="magic-capacity-meta">${cap.type.charAt(0).toUpperCase() + cap.type.slice(1)} · ${cap.rank}</span>
                            <div class="magic-capacity-tags">
                                ${cap.stats.map((s) => `<span class="magic-tag">${s}</span>`).join("")}
                                <span class="magic-tag magic-tag--rank">${cap.rank}</span>
                            </div>
                        </div>
                        <span class="magic-capacity-toggle">▼</span>
                    </button>
                    <div class="magic-capacity-body">
                        <div>
                            <div class="magic-capacity-field-label">Description RP</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.rp}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Effet mécanique</div>
                            <div class="magic-capacity-field-value">${cap.effect}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Coût</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.cost}</div>
                        </div>
                        <div>
                            <div class="magic-capacity-field-label">Limites / conditions</div>
                            <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.limits || "—"}</div>
                        </div>
                        ${isAdmin ? `
                            <div>
                                <div class="magic-capacity-field-label">Note admin</div>
                                <div class="magic-capacity-field-value magic-capacity-field-value--dim">${cap.adminNote || "Aucune note."}</div>
                            </div>
                        ` : ""}
                    </div>
                `;

                const header = li.querySelector(".magic-capacity-header");
                header.addEventListener("click", () => {
                    const isOpen = li.classList.toggle("magic-capacity-item--open");
                    header.setAttribute("aria-expanded", isOpen ? "true" : "false");
                    const toggleIcon = header.querySelector(".magic-capacity-toggle");
                    if (toggleIcon) {
                        toggleIcon.textContent = isOpen ? "▲" : "▼";
                    }
                });

                capacityList.appendChild(li);
            });
    }

    renderCapacities("");

    if (capacityFilter) {
        capacityFilter.addEventListener("change", () => {
            renderCapacities(capacityFilter.value || "");
        });
    }

    if (addCapacityBtn) {
        addCapacityBtn.addEventListener("click", () => {
            alert("Ajout de capacités à venir (placeholder). Le backend définira la sauvegarde JSON.");
        });
    }
})();

