import {
    isAuthenticated,
    getCurrentUser,
    getUserCharacters,
    getActiveCharacter,
    setActiveCharacter,
    createCharacter,
    logout,
    refreshSessionUser
} from './auth.js';

const MAX_SLOTS = 5;

const dom = {
    grid: document.getElementById('characterGrid'),
    status: document.getElementById('characterSelectStatus'),
    userName: document.getElementById('currentUserName'),
    userRole: document.getElementById('currentUserRole'),
    logoutBtns: Array.from(document.querySelectorAll('#logoutButton')),
    backdrop: document.getElementById('createCharacterBackdrop'),
    form: document.getElementById('createCharacterForm'),
    error: document.getElementById('createCharacterError'),
    nameInput: document.getElementById('characterNameInput'),
    raceInput: document.getElementById('characterRaceInput'),
    classInput: document.getElementById('characterClassInput'),
    cancelBtn: document.getElementById('createCharacterCancel'),
    submitBtn: document.getElementById('createCharacterSubmit')
};

let currentUser = null;
let userCharacters = [];
let activeCharacterId = null;

function setStatus(message) {
    if (!dom.status) return;
    dom.status.textContent = message || '';
}

function safeProfileData(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }
    return {};
}

function getAvatarUrl(character) {
    if (!character) return '';
    const profileData = safeProfileData(character.profile_data);
    return profileData.avatar_url || '';
}

function getCharacterSubtitle(character) {
    if (!character) return '';
    const race = (character.race || '').trim();
    const charClass = (character.class || '').trim();
    if (race && charClass) return `${race} \u2022 ${charClass}`;
    return race || charClass || '';
}

function createAvatarBlock(character, isEmpty) {
    const avatar = document.createElement('div');
    avatar.className = 'character-card-avatar';

    if (isEmpty) {
        const plus = document.createElement('span');
        plus.className = 'character-card-plus';
        plus.textContent = '+';
        avatar.appendChild(plus);
        return avatar;
    }

    const avatarUrl = getAvatarUrl(character);
    const initial = document.createElement('span');
    initial.className = 'character-card-initial';
    initial.textContent = character.name ? character.name.charAt(0).toUpperCase() : '?';

    if (!avatarUrl) {
        avatar.appendChild(initial);
        return avatar;
    }

    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = character.name || 'Avatar';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => {
        img.remove();
        avatar.appendChild(initial);
    };
    avatar.appendChild(img);
    return avatar;
}

function createCharacterCard(character, slotIndex) {
    const isEmpty = !character;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `character-card${isEmpty ? ' is-empty' : ''}`;
    card.dataset.action = isEmpty ? 'create' : 'select';
    card.dataset.slot = String(slotIndex + 1);

    if (character && character.id) {
        card.dataset.characterId = character.id;
        if (character.id === activeCharacterId) {
            card.classList.add('is-active');
        }
    }

    const name = document.createElement('div');
    name.className = 'character-card-name';
    name.textContent = isEmpty ? 'Nouveau personnage' : (character.name || 'Sans nom');

    card.appendChild(name);
    card.appendChild(createAvatarBlock(character, isEmpty));

    const subtitleText = isEmpty ? 'Ajouter un personnage' : getCharacterSubtitle(character);
    if (subtitleText) {
        const subtitle = document.createElement('div');
        subtitle.className = 'character-card-subtitle';
        subtitle.textContent = subtitleText;
        card.appendChild(subtitle);
    }
    return card;
}

function renderGrid() {
    if (!dom.grid) return;
    dom.grid.replaceChildren();

    const displayed = userCharacters.slice(0, MAX_SLOTS);
    for (let i = 0; i < MAX_SLOTS; i += 1) {
        const character = displayed[i] || null;
        dom.grid.appendChild(createCharacterCard(character, i));
    }
}

function openCreateModal() {
    if (!dom.backdrop) return;
    if (userCharacters.length >= MAX_SLOTS) {
        setStatus('Limite de 5 personnages atteinte.');
        return;
    }
    dom.error.classList.remove('visible');
    dom.error.textContent = '';
    dom.form.reset();
    dom.backdrop.classList.add('open');
    dom.backdrop.setAttribute('aria-hidden', 'false');
    dom.nameInput.focus();
}

function closeCreateModal() {
    if (!dom.backdrop) return;
    dom.backdrop.classList.remove('open');
    dom.backdrop.setAttribute('aria-hidden', 'true');
}

function showCreateError(message) {
    dom.error.textContent = message;
    dom.error.classList.add('visible');
}

async function handleCardAction(card) {
    const action = card.dataset.action;
    if (action === 'create') {
        openCreateModal();
        return;
    }

    const characterId = card.dataset.characterId;
    if (!characterId) return;
    setStatus('Chargement du personnage...');

    const res = await setActiveCharacter(characterId);
    if (!res || !res.success) {
        setStatus('Impossible de s\u00e9lectionner ce personnage.');
        return;
    }
    window.location.href = 'profil.html';
}

async function loadCharacters() {
    try {
        userCharacters = await getUserCharacters(currentUser.id);
    } catch (error) {
        console.error('Error loading characters:', error);
        userCharacters = [];
    }
}

function updateHeader() {
    if (dom.userName) {
        dom.userName.textContent = currentUser?.username || '';
    }
    if (dom.userRole) {
        dom.userRole.textContent = (currentUser?.role || 'player').toUpperCase();
    }
}

async function init() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        await refreshSessionUser?.();
    } catch {}

    currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    activeCharacterId = getActiveCharacter()?.id || null;
    updateHeader();
    await loadCharacters();
    renderGrid();
    setStatus('');
}

if (dom.grid) {
    dom.grid.addEventListener('click', (event) => {
        const card = event.target.closest('.character-card');
        if (!card) return;
        handleCardAction(card);
    });
}

if (dom.logoutBtns.length) {
    dom.logoutBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            logout();
            window.location.href = 'login.html';
        });
    });
}

if (dom.cancelBtn) {
    dom.cancelBtn.addEventListener('click', closeCreateModal);
}

if (dom.backdrop) {
    dom.backdrop.addEventListener('click', (event) => {
        if (event.target === dom.backdrop) {
            closeCreateModal();
        }
    });
}

if (dom.form) {
    dom.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        dom.error.classList.remove('visible');
        dom.error.textContent = '';

        if (userCharacters.length >= MAX_SLOTS) {
            showCreateError('Limite de 5 personnages atteinte.');
            return;
        }

        const name = dom.nameInput.value.trim();
        const race = dom.raceInput.value.trim();
        const charClass = dom.classInput.value.trim();

        if (!name) {
            showCreateError('Le nom est requis.');
            dom.nameInput.focus();
            return;
        }

        dom.submitBtn.disabled = true;
        dom.submitBtn.textContent = 'Cr\u00e9ation...';

        try {
            const res = await createCharacter(currentUser.id, { name, race, class: charClass });
            if (!res.success) {
                showCreateError(res.error || 'Impossible de cr\u00e9er le personnage.');
                return;
            }

            await setActiveCharacter(res.character.id);
            window.location.href = 'profil.html';
        } catch (error) {
            console.error(error);
            showCreateError('Impossible de cr\u00e9er le personnage.');
        } finally {
            dom.submitBtn.disabled = false;
            dom.submitBtn.textContent = 'Cr\u00e9er';
        }
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (dom.backdrop && dom.backdrop.classList.contains('open')) {
        closeCreateModal();
    }
});

init();
