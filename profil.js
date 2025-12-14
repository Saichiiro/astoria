// TODO: Remove this mock when server is ready - temporary for testing without server
const MOCK_MODE = true;

// Mock auth functions for testing without server
const mockAuth = {
    getCurrentUser: () => ({ id: 1, username: 'TestUser' }),
    getUserCharacters: async () => [
        { id: 1, name: 'Personnage Test', race: 'Humain', class: 'Étudiant', profile_data: { style: 5, dico: 3, popularity: 7 } }
    ],
    getActiveCharacter: () => ({ id: 1, name: 'Personnage Test', race: 'Humain', class: 'Étudiant', profile_data: { style: 5, dico: 3, popularity: 7 } }),
    setActiveCharacter: async (id) => { console.log('Mock: setActiveCharacter', id); },
    logout: () => { console.log('Mock: logout'); },
    isAdmin: () => false
};

// Import real auth or use mock
let getCurrentUser, getUserCharacters, getActiveCharacter, setActiveCharacter, logout, isAdmin;

if (MOCK_MODE) {
    console.log('Using MOCK authentication (no server required)');
    ({ getCurrentUser, getUserCharacters, getActiveCharacter, setActiveCharacter, logout, isAdmin } = mockAuth);
} else {
    // TODO: Uncomment when server is ready
    // const auth = await import('./auth.js');
    // ({ getCurrentUser, getUserCharacters, getActiveCharacter, setActiveCharacter, logout, isAdmin } = auth);
}

console.log('profil.js loaded successfully');

const authControls = document.getElementById('authControls');
const profileContent = document.getElementById('profileContent');

let currentUser = null;
let currentCharacter = null;
let userCharacters = [];

// Initialize page
async function init() {
    console.log('init() called');
    currentUser = getCurrentUser();
    console.log('currentUser:', currentUser);

    if (!currentUser) {
        // Not logged in - show login prompt
        console.log('User not logged in');
        showNotLoggedIn();
        return;
    }

    // Logged in - render auth controls
    console.log('Rendering auth controls');
    renderAuthControls();

    // Load user's characters
    console.log('Loading characters');
    await loadCharacters();

    // Load active character or prompt to select/create one
    console.log('Loading active character');
    await loadActiveCharacter();

    // Initialize tag selector
    console.log('Initializing tag selector');
    initTagSelector();
}

function showNotLoggedIn() {
    authControls.innerHTML = `
        <a href="login.html" class="auth-button">Se connecter</a>
    `;

    profileContent.innerHTML = `
        <div class="profile-not-logged-in">
            <h2>Connexion requise</h2>
            <p>Vous devez vous connecter pour acc�der � votre profil et g�rer vos personnages.</p>
            <a href="login.html" class="auth-button">Se connecter</a>
        </div>
    `;
}

function renderAuthControls() {
    const roleBadge = isAdmin() ? 'Admin' : 'Joueur';

    authControls.innerHTML = `
        <span class="user-badge">${roleBadge}</span>
        <span style="color: var(--color-gray-700); font-weight: 600;">${currentUser.username}</span>
        <button class="auth-button secondary" id="logoutBtn">D�connexion</button>
    `;

    document.getElementById('logoutBtn').addEventListener('click', () => {
        logout();
        window.location.reload();
    });
}

async function loadCharacters() {
    try {
        userCharacters = await getUserCharacters(currentUser.id);
    } catch (error) {
        console.error('Error loading characters:', error);
        userCharacters = [];
    }
}

async function loadActiveCharacter() {
    currentCharacter = getActiveCharacter();

    // Render character selector
    renderCharacterSelector();

    if (!currentCharacter) {
        // No active character - show placeholder
        showNoCharacterSelected();
    } else {
        // Display character data
        displayCharacter(currentCharacter);
    }
}

function renderCharacterSelector() {
    const selectorHTML = document.createElement('select');
    selectorHTML.className = 'character-selector';
    selectorHTML.id = 'characterSelector';

    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'S�lectionner un personnage...';
    placeholderOption.disabled = true;
    placeholderOption.selected = !currentCharacter;
    selectorHTML.appendChild(placeholderOption);

    // Add existing characters
    userCharacters.forEach(char => {
        const option = document.createElement('option');
        option.value = char.id;
        option.textContent = char.name;
        if (currentCharacter && char.id === currentCharacter.id) {
            option.selected = true;
        }
        selectorHTML.appendChild(option);
    });

    // Add "Create new character" option if under 5 characters
    if (userCharacters.length < 5) {
        const createOption = document.createElement('option');
        createOption.value = '__create__';
        createOption.textContent = '+ Cr�er un personnage';
        selectorHTML.appendChild(createOption);
    }

    // Insert at the beginning of auth controls
    authControls.insertBefore(selectorHTML, authControls.firstChild);

    // Handle character change
    selectorHTML.addEventListener('change', async (e) => {
        const value = e.target.value;

        if (value === '__create__') {
            // TODO: Open character creation modal
            alert('Cr�ation de personnage � venir!');
            return;
        }

        // Switch to selected character
        await setActiveCharacter(value);
        window.location.reload();
    });
}

function showNoCharacterSelected() {
    document.getElementById('characterInitial').textContent = '?';
    document.getElementById('characterName').textContent = 'Aucun personnage s�lectionn�';
    document.getElementById('characterRole').textContent = 'S�lectionnez un personnage ci-dessus';
}

function displayCharacter(character) {
    // Update header with character info
    const initial = character.name ? character.name.charAt(0).toUpperCase() : '?';
    document.getElementById('characterInitial').textContent = initial;
    document.getElementById('characterName').textContent = character.name || 'Sans nom';

    // Display race and class
    const race = character.race || 'Race inconnue';
    const charClass = character.class || 'Classe inconnue';
    document.getElementById('characterRole').textContent = `${race} " ${charClass}`;

    // Display stats (from profile_data if available)
    const profileData = character.profile_data || {};
    document.getElementById('statStyle').textContent = profileData.style || 0;
    document.getElementById('statDico').textContent = profileData.dico || 0;
    document.getElementById('statPopularity').textContent = profileData.popularity || 0;

    // TODO: Populate rest of profile sections based on issue #9 requirements
    // - House, Rank, Alice types, etc.
}

// Tag Selector Functionality
function initTagSelector() {
    console.log('initTagSelector() called');
    const tagAddButton = document.getElementById('tagAddButton');
    const tagDropdown = document.getElementById('tagDropdown');
    const selectedTagsContainer = document.getElementById('selectedTags');

    console.log('tagAddButton:', tagAddButton);
    console.log('tagDropdown:', tagDropdown);
    console.log('selectedTagsContainer:', selectedTagsContainer);

    // Check if elements exist
    if (!tagAddButton || !tagDropdown || !selectedTagsContainer) {
        console.warn('Tag selector elements not found');
        return;
    }

    console.log('All tag selector elements found');

    const checkboxes = tagDropdown.querySelectorAll('input[type="checkbox"]');

    let selectedTags = loadSelectedTags();

    // Toggle dropdown
    tagAddButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Toggle button clicked');
        tagDropdown.classList.toggle('open');
        console.log('Dropdown open:', tagDropdown.classList.contains('open'));
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!tagDropdown.contains(e.target) && e.target !== tagAddButton) {
            tagDropdown.classList.remove('open');
        }
    });

    // Handle checkbox changes
    checkboxes.forEach(checkbox => {
        const tag = checkbox.dataset.tag;

        // Restore checked state
        if (selectedTags.includes(tag)) {
            checkbox.checked = true;
        }

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedTags.push(tag);
            } else {
                selectedTags = selectedTags.filter(t => t !== tag);
            }
            saveSelectedTags(selectedTags);
            renderSelectedTags();
        });
    });

    // Render initial tags
    renderSelectedTags();

    function renderSelectedTags() {
        selectedTagsContainer.innerHTML = '';

        selectedTags.forEach(tag => {
            const badge = document.createElement('span');
            badge.className = 'tag-badge';
            badge.innerHTML = `
                ${tag}
                <span class="tag-badge-remove" data-tag="${tag}">�</span>
            `;
            selectedTagsContainer.appendChild(badge);

            // Handle tag removal
            badge.querySelector('.tag-badge-remove').addEventListener('click', () => {
                selectedTags = selectedTags.filter(t => t !== tag);
                saveSelectedTags(selectedTags);

                // Uncheck the corresponding checkbox
                const checkbox = Array.from(checkboxes).find(cb => cb.dataset.tag === tag);
                if (checkbox) {
                    checkbox.checked = false;
                }

                renderSelectedTags();
            });
        });
    }

    function saveSelectedTags(tags) {
        if (currentCharacter) {
            localStorage.setItem(`profile-tags-${currentCharacter.id}`, JSON.stringify(tags));
        }
    }

    function loadSelectedTags() {
        if (currentCharacter) {
            const saved = localStorage.getItem(`profile-tags-${currentCharacter.id}`);
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    init();
});
