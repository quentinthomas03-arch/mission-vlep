// profil.js - Profil du technicien (sur ce téléphone)
// © 2025 Quentin THOMAS
// Nom, agence, valideur habituel et appareils de l'agence : plus à ressaisir à chaque mission. Le technicien choisit
// d'un toucher dans « Infos mission » le débitmètre et le tachymètre du jour parmi ceux qu'il a enregistrés.

var PROFIL_KEY='vlep_profil';

function profilLire(){
  var p=null;
  try{p=JSON.parse(localStorage.getItem(PROFIL_KEY)||'null');}catch(e){}
  p=p||{};
  return {nom:p.nom||'',debitmetres:p.debitmetres||[],tachymetres:p.tachymetres||[]};
}
function profilEcrire(p){saveData(PROFIL_KEY,p);}

function profilAppareils(p,genre){return p[genre].filter(function(a){return String(a.ref||'').trim();});}

// Nouvelle mission : nom du préleveur, et l'appareil quand il n'y a pas de choix à faire
function profilPreremplir(m){
  var p=profilLire(),d=profilAppareils(p,'debitmetres'),t=profilAppareils(p,'tachymetres');
  if(!m.preleveur)m.preleveur=p.nom;
  if(d.length===1){m.debitmetre=d[0].ref;if(d[0].type)m.debitmetreType=d[0].type;}
  if(t.length===1)m.tachymetre=t[0].ref;
}

// Appareils du profil sous un champ de saisie : un toucher remplit le champ (prefixe : « edit » ou « quick »)
function renderProfilChoix(genre,prefixe){
  var l=profilLire()[genre],h='';
  l.forEach(function(a,i){
    if(!String(a.ref||'').trim())return;
    var t=DEBITMETRE_TYPES.filter(function(x){return x.value===a.type;})[0];
    h+='<button type="button" class="btn btn-gray btn-small" style="width:auto;margin:0;" onclick="profilChoisir(\''+genre+'\','+i+',\''+prefixe+'\');">'+escapeHtml(a.ref)+(t?' · '+escapeHtml(t.label):'')+'</button>';
  });
  return h?'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">'+h+'</div>':'';
}
function profilChoisir(genre,i,prefixe){
  var a=profilLire()[genre][i];if(!a)return;
  var remplir=function(id,v){
    var el=document.getElementById(id);if(!el)return;
    el.value=v;
    el.dispatchEvent(new Event('change')); // saisie rapide : le champ met à jour la mission en cours
  };
  if(genre==='tachymetres'){remplir(prefixe+'-tachymetre',a.ref);return;}
  remplir(prefixe+'-debitmetre',a.ref);
  if(a.type)remplir(prefixe+'-debitmetre-type',a.type);
}

// ----- Écran « Mon profil » -----
function renderProfil(){
  var p=profilLire();
  var h='<button class="back-btn" onclick="state.view=\'home\';render();">'+ICONS.arrowLeft+' Accueil</button>';
  h+='<div class="card"><h1>'+ICONS.user+' Mon profil</h1><p class="subtitle">Gardé sur ce téléphone, repris dans chaque nouvelle mission et dans le rapport.</p>';
  h+='<div class="field"><label class="label">Nom et prénom (préleveur)</label><input type="text" class="input" value="'+escapeHtml(p.nom)+'" onchange="profilMajNom(this.value);"></div>';
  h+='<div class="field"><label class="label">Agence</label><select class="input" onchange="profilMajAgence(this.value);"><option value="">Choisir l’agence</option>';
  var ag=rapportAgenceParDefaut();
  RAPPORT_AGENCES.forEach(function(a){h+='<option value="'+a.id+'"'+(a.id===ag?' selected':'')+'>'+escapeHtml(a.nom)+'</option>';});
  h+='</select></div>';
  h+='<div class="field"><label class="label">Rapport validé par (habituellement)</label><input type="text" class="input" value="'+escapeHtml(rapportValideurParDefaut())+'" onchange="profilMajValideur(this.value);"></div></div>';

  h+='<div class="card"><h2>'+ICONS.tool+' Débitmètres</h2><p class="subtitle">Tous ceux que vous pouvez prendre à l’agence.</p>';
  p.debitmetres.forEach(function(d,i){
    h+='<div class="profil-ligne"><input type="text" class="input" placeholder="N° débitmètre" value="'+escapeHtml(d.ref)+'" onchange="profilMajAppareil(\'debitmetres\','+i+',\'ref\',this.value);">'+
      '<div>'+renderDebitmetreTypeSelect('profil-type-'+i,d.type||'','profilMajAppareil(\'debitmetres\','+i+',\'type\',this.value);')+'</div>'+
      '<button class="btn btn-danger btn-icon" aria-label="Retirer" style="margin:0;width:44px;flex:none;" onclick="profilRetirer(\'debitmetres\','+i+');">'+ICONS.trash+'</button></div>';
  });
  h+='<button class="btn btn-gray btn-small" onclick="profilAjouter(\'debitmetres\');">+ Débitmètre</button></div>';

  h+='<div class="card"><h2>'+ICONS.tool+' Tachymètres</h2>';
  p.tachymetres.forEach(function(t,i){
    h+='<div class="profil-ligne"><input type="text" class="input" placeholder="N° tachymètre" value="'+escapeHtml(t.ref)+'" onchange="profilMajAppareil(\'tachymetres\','+i+',\'ref\',this.value);">'+
      '<button class="btn btn-danger btn-icon" aria-label="Retirer" style="margin:0;width:44px;flex:none;" onclick="profilRetirer(\'tachymetres\','+i+');">'+ICONS.trash+'</button></div>';
  });
  h+='<button class="btn btn-gray btn-small" onclick="profilAjouter(\'tachymetres\');">+ Tachymètre</button></div>';

  return h;
}

function profilMajNom(v){var p=profilLire();p.nom=v.trim();profilEcrire(p);}
function profilMajAgence(v){try{localStorage.setItem(RAPPORT_AGENCE_KEY,v);}catch(e){}}
function profilMajValideur(v){try{localStorage.setItem(RAPPORT_VALIDEUR_KEY,v.trim());}catch(e){}}
function profilMajAppareil(genre,i,champ,v){
  var p=profilLire();if(!p[genre][i])return;
  p[genre][i][champ]=String(v).trim();
  profilEcrire(p);
}
function profilAjouter(genre){
  var p=profilLire();
  p[genre].push(genre==='debitmetres'?{ref:'',type:''}:{ref:''});
  profilEcrire(p);
  render();
}
function profilRetirer(genre,i){
  var p=profilLire();
  p[genre].splice(i,1);
  profilEcrire(p);
  render();
}

console.log('✓ Profil chargé');
