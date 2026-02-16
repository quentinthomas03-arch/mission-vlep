// missions.js - Gestion des missions et fonctions manquantes
// © 2025 Quentin THOMAS

// ===== GESTION STATUT MISSION =====
function updateMissionStatus(m) {
  if (!m || !m.prelevements) return;
  
  let total = 0;
  let completed = 0;
  
  m.prelevements.forEach(function(p) {
    p.subPrelevements.forEach(function(s) {
      total++;
      if (s.completed) completed++;
    });
  });
  
  if (total === 0) {
    m.status = 'validee';
  } else if (completed === total) {
    m.status = 'terminee';
  } else if (completed > 0) {
    m.status = 'encours';
  } else {
    m.status = 'validee';
  }
}

// ===== POMPE CIP =====
function isAgentCIP(m, agentName) {
  if (!m || !m.cipAgents) return false;
  return m.cipAgents.indexOf(agentName) !== -1;
}

function toggleCIPAgent(agentName) {
  var m = getCurrentMission();
  if (!m) return;
  
  if (!m.cipAgents) m.cipAgents = [];
  
  var idx = m.cipAgents.indexOf(agentName);
  if (idx !== -1) {
    m.cipAgents.splice(idx, 1);
  } else {
    m.cipAgents.push(agentName);
  }
  
  saveData('vlep_missions_v3', state.missions);
  render();
}

// ===== ÉDITION MISSION =====
function editMissionFromTerrain() {
  state.showModal = 'editMission';
  render();
}

function renderEditMissionModal() {
  var m = getCurrentMission();
  if (!m) return '';
  
  var h = '<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content"><div class="modal-header"><h2>Modifier la mission</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div>';
  
  h += '<div class="field"><label class="label">Client / Site</label>';
  h += '<input type="text" class="input" id="edit-client-site" value="' + escapeHtml(m.clientSite || '') + '"></div>';
  
  h += '<div class="field"><label class="label">Préleveur</label>';
  h += '<input type="text" class="input" id="edit-preleveur" value="' + escapeHtml(m.preleveur || '') + '"></div>';
  
  h += '<div class="field"><label class="label">Débitmètre</label>';
  h += '<input type="text" class="input" id="edit-debitmetre" value="' + escapeHtml(m.debitmetre || '') + '"></div>';
  
  h += '<div class="row mt-12"><button class="btn btn-gray" onclick="state.showModal=null;render();">Annuler</button>';
  h += '<button class="btn btn-primary" onclick="saveEditMission();">Enregistrer</button></div>';
  
  h += '</div></div>';
  return h;
}

function saveEditMission() {
  var m = getCurrentMission();
  if (!m) return;
  
  var clientInput = document.getElementById('edit-client-site');
  var preleveurInput = document.getElementById('edit-preleveur');
  var debitmetreInput = document.getElementById('edit-debitmetre');
  
  if (clientInput) m.clientSite = clientInput.value.trim();
  if (preleveurInput) m.preleveur = preleveurInput.value.trim();
  if (debitmetreInput) m.debitmetre = debitmetreInput.value.trim();
  
  saveData('vlep_missions_v3', state.missions);
  state.showModal = null;
  render();
}

// ===== RETOUR EN PRÉPARATION =====
function unvalidateMissionFromTerrain() {
  var m = getCurrentMission();
  if (!m) return;
  
  if (!confirm('Repasser cette mission en mode préparation ?\n\nVous pourrez modifier la structure mais perdrez la progression terrain.')) return;
  
  m.status = 'preparation';
  saveData('vlep_missions_v3', state.missions);
  state.view = 'terrain-list';
  state.currentMissionId = null;
  render();
}

// ===== SAISIE RAPIDE =====
function openQuickEntry() {
  state.showModal = 'quickEntry';
  
  // Initialiser ou réinitialiser les données de saisie rapide
  if (!state.quickMission) {
    state.quickMission = {
      id: generateId(),
      clientSite: '',
      preleveur: '',
      debitmetre: '',
      status: 'validee',
      gehs: [],
      prelevements: [],
      agents: [],
      conditions: {
        temperature: '',
        humidite: '',
        pression: '',
        meteo: '',
        autres: ''
      },
      cipAgents: []
    };
  }
  
  state.quickPrelType = '8h';
  state.quickPrelReg = true;
  state.quickAgentSearch = '';
  state.quickGehId = null;
  
  render();
}

function renderQuickEntryModal() {
  var h = '<div class="modal show" onclick="if(event.target===this){closeQuickEntry();}"><div class="modal-content" style="max-height:90vh;overflow-y:auto;"><div class="modal-header"><h2>' + ICONS.zap + ' Saisie rapide</h2><button class="close-btn" onclick="closeQuickEntry();">×</button></div>';
  
  h += '<div class="info-box info-box-info mb-12"><p><strong>Mode saisie rapide</strong></p><p>Créez une mission minimaliste prête pour le terrain</p></div>';
  
  // Infos de base
  h += '<div class="field"><label class="label">Client / Site *</label>';
  h += '<input type="text" class="input" id="quick-client" placeholder="Nom du site" value="' + escapeHtml(state.quickMission.clientSite || '') + '"></div>';
  
  h += '<div class="row">';
  h += '<div class="field" style="flex:1;"><label class="label">Préleveur</label>';
  h += '<input type="text" class="input" id="quick-preleveur" placeholder="Nom" value="' + escapeHtml(state.quickMission.preleveur || '') + '"></div>';
  h += '<div class="field" style="flex:1;"><label class="label">Débitmètre</label>';
  h += '<input type="text" class="input" id="quick-debitmetre" placeholder="N°" value="' + escapeHtml(state.quickMission.debitmetre || '') + '"></div>';
  h += '</div>';
  
  // Nombre de GEH
  h += '<div class="field"><label class="label">Nombre de GEH</label>';
  h += '<input type="number" class="input" id="quick-geh-count" value="' + DEFAULT_GEH_COUNT + '" min="1" max="20"></div>';
  
  h += '<div class="row mt-12"><button class="btn btn-gray" onclick="closeQuickEntry();">Annuler</button>';
  h += '<button class="btn btn-success" onclick="createQuickMission();">Créer mission</button></div>';
  
  h += '</div></div>';
  return h;
}

function closeQuickEntry() {
  state.showModal = null;
  state.quickMission = null;
  render();
}

function createQuickMission() {
  var clientInput = document.getElementById('quick-client');
  var preleveurInput = document.getElementById('quick-preleveur');
  var debitmetreInput = document.getElementById('quick-debitmetre');
  var gehCountInput = document.getElementById('quick-geh-count');
  
  if (!clientInput || !clientInput.value.trim()) {
    alert('Saisissez un nom de client/site');
    return;
  }
  
  var gehCount = gehCountInput ? parseInt(gehCountInput.value) : DEFAULT_GEH_COUNT;
  if (gehCount < 1) gehCount = 1;
  if (gehCount > 20) gehCount = 20;
  
  // Créer la mission
  var newMission = {
    id: generateId(),
    clientSite: clientInput.value.trim(),
    preleveur: preleveurInput ? preleveurInput.value.trim() : '',
    debitmetre: debitmetreInput ? debitmetreInput.value.trim() : '',
    status: 'validee',
    gehs: [],
    prelevements: [],
    agents: [],
    conditions: {
      temperature: '',
      humidite: '',
      pression: '',
      meteo: '',
      autres: ''
    },
    cipAgents: []
  };
  
  // Créer les GEH
  for (var i = 0; i < gehCount; i++) {
    newMission.gehs.push({
      id: generateId(),
      num: i + 1,
      name: 'GEH ' + (i + 1)
    });
  }
  
  // Ajouter à la liste
  state.missions.push(newMission);
  saveData('vlep_missions_v3', state.missions);
  
  // Fermer le modal et ouvrir la mission
  state.showModal = null;
  state.quickMission = null;
  state.currentMissionId = newMission.id;
  state.view = 'terrain';
  
  render();
}

console.log('✓ Missions chargé');
