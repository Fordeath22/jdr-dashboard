// --- Activation du Service Worker (PWA) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('Service Worker enregistré.'))
      .catch(err => console.log('Erreur Service Worker: ', err));
  });
}

// --- Logique de l'application ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONSTANTES & VARIABLES GLOBALES ---
    const DB_KEY = 'jdrCompagnonDB_v4_tabs'; 
    let currentCharacterId = null;

    // --- 2. FONCTIONS UTILITAIRES ---
    function generateUUID() {
        return `char-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    function getDatabase() {
        const db = localStorage.getItem(DB_KEY);
        return db ? JSON.parse(db) : {};
    }
    function saveDatabase(db) {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }
    function calculateBonus(statValue) {
        const bonus = Math.floor((statValue - 10) / 2);
        return (bonus >= 0) ? `+${bonus}` : `${bonus}`;
    }
    function createItemRow(name, bonus, dmg, listElement) {
        if (!name) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${name}</td>
            <td>${bonus}</td>
            <td>${dmg}</td>
            <td class="edit-only"><button class="delete-btn">X</button></td>
        `; 
        tr.querySelector('.delete-btn').addEventListener('click', () => {
            tr.remove();
        });
        listElement.appendChild(tr);
    }
    
    function updateAllBonuses() {
        statInputs.forEach(input => {
            const bonusSpan = document.getElementById(input.id.replace('stat-', 'bonus-'));
            if (bonusSpan) {
                bonusSpan.textContent = calculateBonus(input.value);
            }
        });
        const dexBonus = calculateBonus(document.getElementById('stat-dex').value);
        document.getElementById('initiative-bonus').textContent = dexBonus; 
    }

    function clearForm() {
        document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
            if (input.classList.contains('stat-score-small')) { 
                input.value = '10';
            } else if (input.id === 'bonus-maitrise') {
                input.value = '+2';
            } else if (input.id === 'ca') {
                input.value = '10';
            } else if (input.id === 'pv-max' || input.id === 'pv-current') {
                input.value = '10';
            } else {
                input.value = '';
            }
        });
        document.querySelectorAll('input[type="checkbox"]').forEach(check => {
            check.checked = false;
        });
        attackList.innerHTML = '';
        spellList.innerHTML = '';
        portraitImg.src = '';
        portraitLabel.style.display = 'block';
        
        document.querySelectorAll('.stat-box.expanded').forEach(box => {
            box.classList.remove('expanded');
        });
        
        updateAllBonuses();
    }

    // --- 3. SÉLECTION DES ÉLÉMENTS ---

    const sheetContainer = document.querySelector('.sheet');
    const charSelect = document.getElementById('char-select');
    const newCharBtn = document.getElementById('btn-new');
    const deleteCharBtn = document.getElementById('btn-delete');
    const exportBtn = document.getElementById('btn-export');
    const importBtn = document.getElementById('btn-import');
    const importFileInput = document.getElementById('import-file');
    const charName = document.getElementById('char-name');
    const charClass = document.getElementById('char-class');
    const charNotes = document.getElementById('char-notes');
    const portraitContainer = document.getElementById('portrait-container');
    const portraitUpload = document.getElementById('portrait-upload');
    const portraitImg = document.getElementById('char-portrait-img');
    const portraitLabel = document.getElementById('portrait-label');
    const statInputs = document.querySelectorAll('.stat-score-small');
    const bonusMaitrise = document.getElementById('bonus-maitrise');
    const ca = document.getElementById('ca');
    const initiative = document.getElementById('initiative-bonus');
    const pvMax = document.getElementById('pv-max');
    const pvCurrent = document.getElementById('pv-current');
    const desVie = document.getElementById('des-vie');
    const seuilBlessure = document.getElementById('seuil-blessure');
    const fatigue = document.getElementById('fatigue');
    const deathSaves = document.querySelectorAll('input[id^="death-"]');
    const jsChecks = document.querySelectorAll('.js-check');
    const maitriseChecks = document.querySelectorAll('.maitrise-check');
    const expertiseChecks = document.querySelectorAll('.expertise-check');
    const resistancesInput = document.getElementById('resistances');
    const spellSlots = document.querySelectorAll('.spell-slot-input');
    const inventoryNotes = document.getElementById('inventory-notes');
    const charActionsText = document.getElementById('char-actions-text');
    const newAttackName = document.getElementById('new-attack-name');
    const newAttackBonus = document.getElementById('new-attack-bonus');
    const newAttackDmg = document.getElementById('new-attack-dmg');
    const addAttackBtn = document.getElementById('btn-add-attack');
    const attackList = document.getElementById('attack-list'); 
    const newSpellName = document.getElementById('new-spell-name');
    const newSpellBonus = document.getElementById('new-spell-bonus');
    const newSpellDmg = document.getElementById('new-spell-dmg');
    const addSpellBtn = document.getElementById('btn-add-spell');
    const spellList = document.getElementById('spell-list'); 
    const saveButton = document.getElementById('btn-save');
    const viewToggleButton = document.getElementById('btn-toggle-view');

    const statBoxHeaders = document.querySelectorAll('.stat-header');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const fieldsToLock = document.querySelectorAll(
        '#char-name, #char-class, #bonus-maitrise, #ca, #pv-max, #des-vie, #seuil-blessure, #fatigue, #resistances, ' +
        // Ajout des actions
        '#char-actions-text, ' +
        '.stat-score-small, .spell-slot-input[id$="-max"]'
    );
    const checksToLock = document.querySelectorAll(
        '.js-check, .maitrise-check, .expertise-check'
    );
    
    // --- 4. LOGIQUE PRINCIPALE ---

    function loadCharacterList() {
        const db = getDatabase();
        const charIds = Object.keys(db);
        charSelect.innerHTML = '';
        if (charIds.length === 0) {
            currentCharacterId = null;
            return null; 
        }
        charIds.forEach(id => {
            const char = db[id];
            const option = document.createElement('option');
            option.value = id;
            option.textContent = char.name || 'Personnage sans nom';
            charSelect.appendChild(option);
        });
        if (currentCharacterId && db[currentCharacterId]) {
            charSelect.value = currentCharacterId;
        } else {
            currentCharacterId = charIds[0];
            charSelect.value = currentCharacterId;
        }
        return currentCharacterId;
    }

    function loadCharacter(id) {
        const db = getDatabase();
        const character = db[id];

        if (!character) {
            clearForm();
            currentCharacterId = null;
            return;
        }
        
        currentCharacterId = id; 

        charName.value = character.name || '';
        charClass.value = character.class || '';
        charNotes.value = character.notes || '';
        bonusMaitrise.value = character.bonusMaitrise || '+2';
        ca.value = character.ca || '10';
        pvMax.value = character.pvMax || '10';
        pvCurrent.value = character.pvCurrent || '10';
        desVie.value = character.desVie || '';
        seuilBlessure.value = character.seuilBlessure || '5';
        fatigue.value = character.fatigue || '0';
        resistancesInput.value = character.resistances || '';
        inventoryNotes.value = character.inventory || ''; 
        charActionsText.value = character.actions || '';

        statInputs.forEach(input => {
            input.value = (character.stats && character.stats[input.id]) || '10';
        });
        
        jsChecks.forEach(check => { check.checked = (character.js_maitrises && character.js_maitrises[check.id]) || false; });
        maitriseChecks.forEach(check => { check.checked = (character.maitrises && character.maitrises[check.id]) || false; });
        expertiseChecks.forEach(check => { check.checked = (character.expertises && character.expertises[check.id]) || false; });
        deathSaves.forEach(check => { check.checked = (character.deathSaves && character.deathSaves[check.id]) || false; });
        
        spellSlots.forEach(input => {
            input.value = (character.spellSlots && character.spellSlots[input.id]) || '';
        });

        attackList.innerHTML = '';
        spellList.innerHTML = '';
        if (character.attacks) {
            character.attacks.forEach(item => createItemRow(item.name, item.bonus, item.dmg, attackList));
        }
        if (character.spells) {
            character.spells.forEach(item => createItemRow(item.name, item.bonus, item.dmg, spellList));
        }
        
        if (character.portraitData) {
            portraitImg.src = character.portraitData;
            portraitLabel.style.display = 'none';
        } else {
            portraitImg.src = '';
            portraitLabel.style.display = 'block';
        }
        
        document.querySelectorAll('.stat-box.expanded').forEach(box => {
            box.classList.remove('expanded');
        });
        
        updateAllBonuses(); 
    }
    
    function saveCharacter() {
        if (!currentCharacterId) {
            alert('Aucun personnage sélectionné. Créez-en un nouveau d\'abord.');
            return;
        }
        const db = getDatabase();
        
        const character = {
            name: charName.value,
            class: charClass.value,
            notes: charNotes.value,
            bonusMaitrise: bonusMaitrise.value,
            ca: ca.value,
            pvMax: pvMax.value,
            pvCurrent: pvCurrent.value,
            desVie: desVie.value,
            seuilBlessure: seuilBlessure.value,
            fatigue: fatigue.value,
            resistances: resistancesInput.value,
            inventory: inventoryNotes.value,
            actions: charActionsText.value,
            portraitData: portraitImg.src, 
            stats: {},
            js_maitrises: {},
            maitrises: {},
            expertises: {},
            deathSaves: {},
            attacks: [],
            spells: [],
            spellSlots: {}
        };

        statInputs.forEach(input => { character.stats[input.id] = input.value; });
        jsChecks.forEach(check => { character.js_maitrises[check.id] = check.checked; });
        maitriseChecks.forEach(check => { character.maitrises[check.id] = check.checked; });
        expertiseChecks.forEach(check => { character.expertises[check.id] = check.checked; });
        deathSaves.forEach(check => { character.deathSaves[check.id] = check.checked; });
        spellSlots.forEach(input => { character.spellSlots[input.id] = input.value; });

        attackList.querySelectorAll('tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            character.attacks.push({ name: cells[0].textContent, bonus: cells[1].textContent, dmg: cells[2].textContent });
        });
        spellList.querySelectorAll('tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            character.spells.push({ name: cells[0].textContent, bonus: cells[1].textContent, dmg: cells[2].textContent });
        });
        
        db[currentCharacterId] = character;
        saveDatabase(db);
        loadCharacterList(); 
        alert('Personnage sauvegardé !');
    }

    function createNewCharacter() {
        const name = prompt("Nom du nouveau personnage :", "Nouveau Personnage");
        if (!name) return; 
        const newId = generateUUID();
        
        const newChar = {
            name: name,
            stats: { 
                'stat-str': '10', 'stat-dex': '10', 'stat-con': '10', 
                'stat-int': '10', 'stat-wis': '10', 'stat-cha': '10' 
            },
            pvMax: '10',
            pvCurrent: '10',
            ca: '10',
            bonusMaitrise: '+2'
        }; 

        const db = getDatabase();
        db[newId] = newChar;
        saveDatabase(db);

        currentCharacterId = newId;
        loadCharacterList(); 
        loadCharacter(newId); 
    }

    function deleteCurrentCharacter() {
        if (!currentCharacterId) {
            alert('Aucun personnage sélectionné.');
            return;
        }
        const db = getDatabase();
        const charName = db[currentCharacterId].name || "ce personnage";
        if (!confirm(`Voulez-vous vraiment supprimer ${charName} ? Cette action est irréversible.`)) {
            return;
        }
        delete db[currentCharacterId];
        saveDatabase(db);
        const firstCharId = loadCharacterList();
        loadCharacter(firstCharId);
    }

    function exportCharacter() {
        if (!currentCharacterId) {
            alert('Veuillez d\'abord charger un personnage à exporter.');
            return;
        }
        const db = getDatabase();
        const characterData = db[currentCharacterId];
        const jsonString = JSON.stringify(characterData, null, 2); 
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = (characterData.name || 'personnage').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importCharacter(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target.result;
                const importedData = JSON.parse(jsonString);
                
                if (!importedData || !importedData.name) {
                    alert('Erreur : Fichier non valide ou nom de personnage manquant.');
                    return;
                }
                const newId = generateUUID();
                importedData.name = `${importedData.name} (Importé)`; 
                const db = getDatabase();
                db[newId] = importedData;
                saveDatabase(db);
                currentCharacterId = newId;
                loadCharacterList();
                loadCharacter(newId);
                alert('Personnage importé avec succès !');

            } catch (error) {
                alert('Erreur lors de la lecture du fichier : ' + error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = null;
    }


    // --- 5. ÉVÉNEMENTS (EVENT LISTENERS) ---

    // A) Mise à jour auto des bonus
    statInputs.forEach(input => {
        input.addEventListener('input', updateAllBonuses);
    });

    // B) Logique d'accordéon pour les stats
    statBoxHeaders.forEach(header => {
        header.addEventListener('click', (event) => {
            if (event.target.tagName === 'INPUT') {
                return; // Ne pas basculer si on clique sur l'input
            }
            const statBox = header.closest('.stat-box');
            statBox.classList.toggle('expanded');
        });
    });

    // C) Logique d'upload de portrait
    portraitContainer.addEventListener('click', () => {
        if (!sheetContainer.classList.contains('view-mode')) {
            portraitUpload.click(); 
        }
    });
    portraitUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            portraitImg.src = e.target.result; 
            portraitLabel.style.display = 'none'; 
        };
        reader.readAsDataURL(file);
    });

    // D) Ajout d'une attaque / sort
    addAttackBtn.addEventListener('click', () => {
        createItemRow(newAttackName.value, newAttackBonus.value, newAttackDmg.value, attackList);
        newAttackName.value = ''; newAttackBonus.value = ''; newAttackDmg.value = '';
    });
    addSpellBtn.addEventListener('click', () => {
        createItemRow(newSpellName.value, newSpellBonus.value, newSpellDmg.value, spellList);
        newSpellName.value = ''; newSpellBonus.value = ''; newSpellDmg.value = '';
    });

    // E) Logique du "Mode Jeu" (Verrouillage sélectif)
    viewToggleButton.addEventListener('click', () => {
        sheetContainer.classList.toggle('view-mode');
        const isViewMode = sheetContainer.classList.contains('view-mode');
        
        if (isViewMode) {
            viewToggleButton.textContent = '🔓';
            viewToggleButton.title = 'Déverrouiller (Mode Édition)';
            fieldsToLock.forEach(field => { field.readOnly = true; });
        } else {
            viewToggleButton.textContent = '🔒';
            viewToggleButton.title = 'Verrouiller (Mode Jeu)';
            fieldsToLock.forEach(field => { field.readOnly = false; });
        }
    });

    // F) Événements de gestion de personnages
    charSelect.addEventListener('change', () => {
        loadCharacter(charSelect.value);
    });
    
    saveButton.addEventListener('click', saveCharacter);
    newCharBtn.addEventListener('click', createNewCharacter);
    deleteCharBtn.addEventListener('click', deleteCurrentCharacter);
    exportBtn.addEventListener('click', exportCharacter);
    importBtn.addEventListener('click', () => importFileInput.click()); 
    importFileInput.addEventListener('change', importCharacter);

    // G) Logique des onglets
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // --- 6. DÉMARRAGE INITIAL ---
    const firstCharId = loadCharacterList();
    if (firstCharId) {
        loadCharacter(firstCharId);
    } else {
        createNewCharacter();
    }
});
