// agents-perso.js - Agents ajoutés par le technicien, absents de la base de l'appli
// © 2025 Quentin THOMAS
// Un agent qui vient d'entrer dans la base Excel, ou qu'elle n'a pas encore : ligne de la base collée telle quelle, ou
// saisie champ par champ, toujours relue dans le même formulaire. Gardé à part de la base (une mise à jour de l'appli ne
// l'efface pas) ; dès que la base de l'appli a le même agent, c'est sa fiche qui compte. Il voyage avec la mission
// (fichier .json, e-mail) pour que le collègue qui l'importe ait la même fiche.

var AGENTS_PERSO_KEY='vlep_agents_perso';

// Colonnes de l'onglet « Base de données » (Version 86), de la colonne A à la colonne des techniques d'analyse. null :
// colonne que l'appli n'utilise pas (sélection, volumes, coûts). Une ligne collée avec ses en-têtes est lue par en-têtes.
var AGENT_COLONNES=['Agent chimique','N° CAS',null,'CMR (règlement CLP)','VLEP 8h (mg/m3)','VLEP CT (mg/m3)','Accréditation prélèvement','Accréditation analyse','Méthode','Principe du prélèvement','Support de prélèvement','positionnement du support','Laboratoire sous-traitant','LQ (µg/support)','débit min CT (L/min)','débit max CT (L/min)','débit min  8h (L/min)','débit max  8h (L/min)',"plage d'utilisation de la cartouche (débit et durée) après validation  0,1 et 2x VLEP",'commentaire (interférent, impact des conditions ambiantes)','stockage avant prélèvement','conditionnement','conservation après prélèvement (t°/durée max)','transport',null,null,null,null,'Domaine de validation','Réf. support','Code support','Code prétraitement','Code analyse','Prétraitement',"Méthode d'analyse",null,null,null,null,'VLEP Reglementaire contraignante','VLEP Reglementaire Indicative','VLEP Admise','particulaire','gazeux','Code SCOLA',"Techniques d'analyse"];
var AGENT_NUMERIQUES=['VLEP 8h (mg/m3)','VLEP CT (mg/m3)','LQ (µg/support)','débit min CT (L/min)','débit max CT (L/min)','débit min  8h (L/min)','débit max  8h (L/min)'];

// Formulaire : ce dont l'appli, la feuille et le rapport ont besoin (le reste d'une ligne collée est gardé tel quel)
// long : zone de texte, les cellules de la base ont plusieurs lignes (un champ d'une ligne les colle bout à bout)
var AGENT_CHAMPS=[
  {k:'Agent chimique',l:'Nom de l’agent *'},
  {k:'N° CAS',l:'N° CAS'},
  {k:'VLEP 8h (mg/m3)',l:'VLEP 8h (mg/m³)',num:true},
  {k:'VLEP CT (mg/m3)',l:'VLEP CT (mg/m³)',num:true},
  {k:'Support de prélèvement',l:'Support de prélèvement *',liste:true},
  {k:'Principe du prélèvement',l:'Principe du prélèvement',liste:true},
  {k:'Méthode',l:'Méthode',long:true},
  {k:'positionnement du support',l:'Positionnement du support',liste:true},
  {k:'Laboratoire sous-traitant',l:'Laboratoire sous-traitant',liste:true},
  {k:'débit min  8h (L/min)',l:'Débit min 8h (L/min)',num:true},
  {k:'débit max  8h (L/min)',l:'Débit max 8h (L/min)',num:true},
  {k:'débit min CT (L/min)',l:'Débit min CT (L/min)',num:true},
  {k:'débit max CT (L/min)',l:'Débit max CT (L/min)',num:true},
  {k:'conservation après prélèvement (t°/durée max)',l:'Conservation après prélèvement',long:true},
  {k:'transport',l:'Transport',long:true},
  {k:'Code support',l:'Code support'},
  {k:'Code analyse',l:'Code analyse'},
  {k:'commentaire (interférent, impact des conditions ambiantes)',l:'Commentaire',long:true}
];
var AGENT_STATUTS=[
  {k:'VLEP Reglementaire contraignante',l:'VLEP réglementaire contraignante'},
  {k:'VLEP Reglementaire Indicative',l:'VLEP réglementaire indicative'},
  {k:'VLEP Admise',l:'VLEP admise'}
];

function agentsPersoLire(){
  try{return JSON.parse(localStorage.getItem(AGENTS_PERSO_KEY)||'[]');}catch(e){return [];}
}
function agentsPersoEcrire(l){saveData(AGENTS_PERSO_KEY,l);}

// Agents ajoutés repris dans la base en mémoire, sauf ceux que la base de l'appli a maintenant (aux accents près)
function agentsPersoIntegrer(){
  state.agentsDB=state.agentsDB.filter(function(a){return !a._perso;});
  agentsPersoLire().forEach(function(a){
    var n=a['Agent chimique'];
    if(n&&!getAgentFromDB(n)&&!agentBaseProche(n))state.agentsDB.push(a);
  });
}

// ----- Ligne collée depuis Excel -----
// Texte copié d'Excel : colonnes séparées par des tabulations, cellule à plusieurs lignes entre guillemets
function agentLignesCollees(txt){
  var lignes=[],l=[],c='',q=false;
  for(var i=0;i<txt.length;i++){
    var x=txt.charAt(i);
    if(q){
      if(x==='"'){if(txt.charAt(i+1)==='"'){c+='"';i++;}else q=false;}
      else c+=x;
    }else if(x==='"'&&c==='')q=true;
    else if(x==='\t'){l.push(c);c='';}
    else if(x==='\n'){l.push(c);c='';lignes.push(l);l=[];}
    else if(x!=='\r')c+=x;
  }
  l.push(c);
  if(l.join('').trim())lignes.push(l);
  return lignes;
}
function agentNormEntete(h){return String(h||'').replace(/\s+/g,' ').trim().toLowerCase();}

// Fiche d'après la ligne collée ; null si elle ne ressemble pas à une ligne de la base
function agentDepuisLigne(txt){
  var lignes=agentLignesCollees(String(txt||'').replace(/\s+$/,''));
  if(!lignes.length)return null;
  var cols=AGENT_COLONNES,val=lignes[lignes.length-1];
  if(lignes.length>1&&agentNormEntete(lignes[0][0])==='agent chimique'){
    var parEntete={};
    AGENT_COLONNES.forEach(function(k){if(k)parEntete[agentNormEntete(k)]=k;});
    cols=lignes[0].map(function(h){return parEntete[agentNormEntete(h)]||null;});
  }
  var a={};
  cols.forEach(function(k,i){
    var v=String(val[i]===undefined?'':val[i]).trim();
    if(!k||!v)return;
    if(AGENT_NUMERIQUES.indexOf(k)!==-1&&/^\d+([.,]\d+)?$/.test(v))v=parseFloat(v.replace(',','.'));
    a[k]=v;
  });
  // colonnes décalées (copie partielle) : le n° CAS et le support ne sont pas à leur place
  if(!a['Agent chimique']||!a['Support de prélèvement'])return null;
  if(a['N° CAS']&&!/^(\d{2,7}-\d{2}-\d|-|nd)$/i.test(String(a['N° CAS']).split(/[\s\/;]/)[0]))return null;
  return a;
}

function agentPersoColler(){
  var t=document.getElementById('agent-perso-colle');
  var a=agentDepuisLigne(t?t.value:'');
  if(!a){alert('Ligne non reconnue.\n\nDans la base Excel, sélectionnez la ligne entière de l’agent (clic sur le numéro de ligne), copiez, puis collez ici.');return;}
  state.agentPersoFiche=a;
  render();
}

// ----- Formulaire -----
function agentPersoOuvrir(nom){
  var a=nom?agentsPersoLire().filter(function(x){return x['Agent chimique']===nom;})[0]:null;
  state.agentPersoFiche=a?JSON.parse(JSON.stringify(a)):{};
  state.agentPersoNom=nom||null;
  state.showModal='agentPerso';
  render();
}
function agentPersoFermer(){
  state.showModal=null;state.agentPersoFiche=null;state.agentPersoNom=null;
  render();
}

function renderAgentPersoModal(){
  var a=state.agentPersoFiche||{};
  var h='<div class="modal show"><div class="modal-content"><div class="modal-header"><h2>'+(state.agentPersoNom?'Modifier l’agent':'Ajouter à la base')+'</h2><button class="close-btn" onclick="agentPersoFermer();">×</button></div>';
  if(!state.agentPersoNom){
    h+='<div class="field"><label class="label">Ligne de la base Excel</label><textarea class="input" id="agent-perso-colle" rows="2" placeholder="Copier la ligne entière dans la base, la coller ici"></textarea><button type="button" class="btn btn-gray btn-small mt-8" onclick="agentPersoColler();">Remplir avec cette ligne</button></div>';
    h+='<p class="subtitle">Ou saisissez les champs ci-dessous. Dans les deux cas, relisez avant d’enregistrer.</p>';
  }
  AGENT_CHAMPS.forEach(function(c,i){
    var v=a[c.k]===undefined||a[c.k]===null?'':String(a[c.k]);
    if(c.long){h+='<div class="field"><label class="label">'+escapeHtml(c.l)+'</label><textarea class="input" rows="2" id="agent-perso-'+i+'">'+escapeHtml(v)+'</textarea></div>';return;}
    h+='<div class="field"><label class="label">'+escapeHtml(c.l)+'</label><input type="text" class="input" id="agent-perso-'+i+'"'+(c.num?' inputmode="decimal"':'')+(c.liste?' list="agent-liste-'+i+'" autocomplete="off"':'')+' value="'+escapeHtml(v)+'"></div>';
    if(c.liste){
      var vus={};
      h+='<datalist id="agent-liste-'+i+'">';
      state.agentsDB.forEach(function(x){var o=String(x[c.k]||'').trim();if(o&&!vus[o]){vus[o]=true;h+='<option value="'+escapeHtml(o)+'"></option>';}});
      h+='</datalist>';
    }
  });
  var st=AGENT_STATUTS.filter(function(s){return a[s.k]==='X';})[0];
  h+='<div class="field"><label class="label">Statut de la VLEP</label><select class="input" id="agent-perso-statut"><option value="">Aucune VLEP réglementaire</option>';
  AGENT_STATUTS.forEach(function(s){h+='<option value="'+escapeHtml(s.k)+'"'+(st&&st.k===s.k?' selected':'')+'>'+escapeHtml(s.l)+'</option>';});
  h+='</select></div>';
  h+='<div class="row"><button class="btn btn-gray" onclick="agentPersoFermer();">Annuler</button><button class="btn btn-primary" onclick="agentPersoEnregistrer();">Enregistrer</button></div></div></div>';
  return h;
}

// Champ d'une ligne : le navigateur y retire les retours à la ligne d'une cellule collée ; si le technicien n'a rien
// changé, la valeur d'origine est gardée (nom ou support sur deux lignes, identiques à la base)
function agentChampSaisi(ancien,saisi){
  var v=String(saisi).trim();
  return typeof ancien==='string'&&ancien.indexOf('\n')!==-1&&ancien.replace(/[\r\n]/g,'').trim()===v?ancien:v;
}

// Enregistre la fiche ; renvoie un message d'erreur, ou null
function agentPersoGarder(a,ancienNom){
  var n=String(a['Agent chimique']||'').trim();
  if(!n)return 'Saisissez le nom de l’agent.';
  if(!String(a['Support de prélèvement']||'').trim())return 'Saisissez le support de prélèvement : il décide du type d’onglet dans la feuille de calcul et de l’usage de la pompe ou du CIP10.';
  var fiche=getAgentFromDB(n);
  if((fiche&&!fiche._perso)||agentBaseProche(n))return '« '+n+' » existe déjà dans la base de l’appli : utilisez sa fiche.';
  var autres=agentsPersoLire().filter(function(x){return x['Agent chimique']!==n&&x['Agent chimique']!==ancienNom;});
  a['Agent chimique']=n;
  a._perso=true;
  autres.push(a);
  agentsPersoEcrire(autres);
  agentsPersoIntegrer();
  return null;
}

function agentPersoEnregistrer(){
  var a=state.agentPersoFiche||{};
  AGENT_CHAMPS.forEach(function(c,i){
    var el=document.getElementById('agent-perso-'+i);if(!el)return;
    var v=agentChampSaisi(a[c.k],el.value);
    if(c.num&&/^\d+([.,]\d+)?$/.test(v))v=parseFloat(v.replace(',','.'));
    if(v==='')delete a[c.k];else a[c.k]=v;
  });
  var st=document.getElementById('agent-perso-statut');
  AGENT_STATUTS.forEach(function(s){delete a[s.k];});
  if(st&&st.value)a[st.value]='X';
  var ancien=state.agentPersoNom,err=agentPersoGarder(a,ancien);
  if(err){alert(err);return;}
  var n=a['Agent chimique'];
  if(typeof fcFamille==='function'&&!fcFamille(n))alert('Support « '+a['Support de prélèvement']+' » non reconnu : l’agent ne pourra pas partir dans la feuille de calcul. Choisissez un support de la liste.');
  state.showModal=null;state.agentPersoFiche=null;state.agentPersoNom=null;
  // ajouté depuis une mission : il y entre directement
  if(state.view==='prepa-agents'&&!ancien){addAgent(n);return;}
  if(state.view==='quick-entry'&&!ancien&&state.quickMission&&!state.quickMission.agents.some(function(x){return x.name===n;})){
    state.quickMission.agents.push({name:n,is8h:hasVLEP8h(n)||!hasVLEPCT(n),isCT:hasVLEPCT(n),isReg:agentEstReglementaire(n),gehs:{}});
  }
  render();
}

function agentPersoSupprimer(nom){
  if(!confirm('Retirer « '+nom+' » de vos agents ?\n\nLes missions qui l’utilisent gardent le nom, mais plus sa fiche (support, débits, VLEP).'))return;
  agentsPersoEcrire(agentsPersoLire().filter(function(x){return x['Agent chimique']!==nom;}));
  agentsPersoIntegrer();
  render();
}

function renderMesAgents(){
  var l=agentsPersoLire();
  var h='<div class="card"><h2>'+ICONS.beaker+' Agents ajoutés à la base</h2>';
  if(!l.length)h+='<p class="subtitle">Aucun. Un agent absent de la base peut s’ajouter ici ou à la préparation.</p>';
  l.forEach(function(a){
    var n=a['Agent chimique'],doublon=!getAgentFromDB(n)||!getAgentFromDB(n)._perso;
    h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;"><div style="flex:1;font-size:14px;">'+escapeHtml(n)+(doublon?' <small style="color:var(--text-muted);">maintenant dans la base de l’appli</small>':'')+'</div>'+
      '<button class="btn btn-gray btn-small" aria-label="Modifier" style="width:44px;flex:none;margin:0;" onclick="agentPersoOuvrir(\''+escapeJs(n)+'\');">'+ICONS.edit+'</button>'+
      '<button class="btn btn-danger btn-icon" aria-label="Retirer" style="margin:0;width:44px;flex:none;" onclick="agentPersoSupprimer(\''+escapeJs(n)+'\');">'+ICONS.trash+'</button></div>';
  });
  return h+'<button class="btn btn-gray btn-small" onclick="agentPersoOuvrir();">+ Ajouter un agent</button></div>';
}

// ----- Voyage avec la mission -----
function agentsPersoDeLaMission(m){
  return (m.agents||[]).map(function(a){return getAgentFromDB(a.name);}).filter(function(f){return f&&f._perso;});
}
function agentsPersoImporter(mission){
  (mission.agentsPerso||[]).forEach(function(a){
    var n=a['Agent chimique'];
    if(n&&!getAgentFromDB(n))agentPersoGarder(a,null);
  });
}

console.log('✓ Agents ajoutés chargés');
