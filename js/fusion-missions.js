// fusion-missions.js - Travailler à plusieurs sur une même mission (même principe que l'appli Aération)
//
// Déroulé type : le technicien A prépare la mission et l'envoie (.json ou e-mail) au technicien B ; chacun
// saisit ses prélèvements ; B renvoie son fichier et A le FUSIONNE dans sa mission au lieu de l'écraser.
// Seulement pour une même mission partagée (même identifiant) : deux missions créées séparément pour le
// même site ne sont pas rapprochées.
//
// Unité de fusion : le jour de prélèvement (sous-prélèvement, même identifiant des deux côtés).
// Saisi d'un seul côté : repris. Saisi des deux côtés et différent : la saisie la plus récente est gardée
// (sb._mod, posé par daterSaisies à chaque enregistrement) et le jour est signalé dans le bilan.

// Empreinte d'un jour de prélèvement (méta-données « _ » exclues)
function fmEmpreinte(sb){
  var s=JSON.stringify(sb,function(k,v){return k.charAt(0)==='_'?undefined:v;}),h=0;
  for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;
  return s.length+':'+h;
}
// Appelé à chaque enregistrement des missions : un jour modifié depuis le dernier enregistrement reçoit
// l'heure de la modification. Premier passage (missions d'avant cette version) : empreinte seulement.
// Date du prélèvement : posée à la première vraie saisie sur le terrain (pas à la simple ouverture du prélèvement,
// ni en préparation), quelle que soit la saisie (champ, chronomètre, dictée, J-1, validation, non réalisé).
function daterSaisies(missions){
  var t=Date.now();
  (missions||[]).forEach(function(m){
    (m.prelevements||[]).forEach(function(p){
      (p.subPrelevements||[]).forEach(function(sb){
        var e=fmEmpreinte(sb);
        if(sb._sig===e)return;
        if(sb._sig&&m.status!=='prepa'&&!sb.date&&(sb.completed||sb.nonRealise||(typeof sbADesDonnees==='function'&&sbADesDonnees(sb)))){
          sb.date=getTodayDate();
          e=fmEmpreinte(sb);
        }
        if(sb._sig)sb._mod=t;
        sb._sig=e;
      });
    });
  });
}

// Jour sans aucune saisie (tel que préparé)
function fmVide(sb){
  if(!sb)return true;
  if(sb.completed||sb.nonRealise||(sb.date&&sb.date.trim&&sb.date.trim()))return false;
  return !sbADesDonnees(sb)&&!getSupportsSupp(sb).length;
}
function fmCopie(x){return JSON.parse(JSON.stringify(x));}

// Fusionne `inc` dans `cible` (modifiée en place). Renvoie le bilan.
function fusionnerMissionDans(cible,inc){
  var r={repris:0,ajoutes:0,identiques:0,conflits:[],signales:[]};
  var gehNum=function(id){var g=(cible.gehs||[]).filter(function(x){return x.id===id;})[0];return g?'GEH '+g.num:'';};
  // GEH ajoutés sur le terrain par le collègue
  (inc.gehs||[]).forEach(function(g){if(!(cible.gehs||[]).some(function(x){return x.id===g.id;})){cible.gehs.push(fmCopie(g));}});
  (inc.agents||[]).forEach(function(a){if(!(cible.agents||[]).some(function(x){return x.name===a.name;}))cible.agents.push(fmCopie(a));});
  (inc.prelevements||[]).forEach(function(pi){
    var pl=(cible.prelevements||[]).filter(function(x){return x.id===pi.id;})[0];
    var qui=function(p){return gehNum(p.gehId)+' · '+(p.agents||[]).map(function(a){return a.name;}).join(' + ')+' ('+(p.type==='CT'?'CT':'8h')+')';};
    if(!pl){
      cible.prelevements.push(fmCopie(pi));
      r.ajoutes++;
      r.signales.push(qui(pi)+' : prélèvement ajouté par le collègue');
      return;
    }
    (pi.agents||[]).forEach(function(a){
      if(pl.agents.some(function(x){return x.name===a.name;}))return;
      pl.agents.push(fmCopie(a));
      r.signales.push(qui(pl)+' : « '+a.name+' » fusionné par le collègue (l’autre prélèvement reste sur votre téléphone, à supprimer si besoin)');
    });
    (pi.subPrelevements||[]).forEach(function(si,k){
      var j=-1;
      // jour sans identifiant (mission d'une ancienne version) : rapproché par son rang, jamais par « undefined »
      if(si.id===undefined||si.id===null)j=k<pl.subPrelevements.length?k:-1;
      else pl.subPrelevements.forEach(function(x,n){if(x.id===si.id)j=n;});
      if(j===-1){pl.subPrelevements.push(fmCopie(si));r.ajoutes++;return;}
      var sl=pl.subPrelevements[j];
      if(fmEmpreinte(sl)===fmEmpreinte(si)){r.identiques++;return;}
      if(fmVide(si)){r.identiques++;return;}
      if(fmVide(sl)){pl.subPrelevements[j]=fmCopie(si);r.repris++;return;}
      // saisi des deux côtés : la plus récente
      var ml=sl._mod||0,mi=si._mod||0;
      var prendre=(ml||mi)?mi>ml:JSON.stringify(si).length>JSON.stringify(sl).length;
      r.conflits.push(qui(pl)+' · J'+(j+1)+(prendre?' : version reçue gardée':' : votre version gardée'));
      if(prendre){pl.subPrelevements[j]=fmCopie(si);r.repris++;}
    });
  });
  // blancs : réunis par référence
  if(!cible.blancs)cible.blancs=[];
  (inc.blancs||[]).forEach(function(b){
    var ref=String(b.ref||'').trim().toLowerCase();
    var bl=ref?cible.blancs.filter(function(x){return String(x.ref||'').trim().toLowerCase()===ref;})[0]:null;
    if(!bl){cible.blancs.push(fmCopie(b));r.ajoutes++;return;}
    if(JSON.stringify(bl)!==JSON.stringify(b))r.signales.push('Blanc « '+b.ref+' » saisi différemment sur les deux téléphones : votre version gardée');
  });
  // conditions ambiantes : jours absents ajoutés, valeurs différentes signalées
  if(!cible.conditionsAmbiantes)cible.conditionsAmbiantes=[];
  (inc.conditionsAmbiantes||[]).forEach(function(c){
    var cl=cible.conditionsAmbiantes.filter(function(x){return x.date===c.date;})[0];
    if(!cl){cible.conditionsAmbiantes.push(fmCopie(c));r.ajoutes++;return;}
    if(JSON.stringify(cl)!==JSON.stringify(c))r.signales.push('Conditions ambiantes du '+formatDateFR(c.date)+' différentes : votre saisie gardée');
  });
  // données de mission : celles du téléphone priment, les champs vides sont complétés
  Object.keys(inc).forEach(function(k){
    var v=inc[k];
    if(typeof v!=='object'&&(cible[k]===undefined||cible[k]===''))cible[k]=v;
  });
  if(typeof updateMissionStatus==='function')updateMissionStatus(cible);
  return r;
}

function fusionBilanTexte(r){
  var l=['Fusion terminée :','• '+r.repris+' jour(s) de prélèvement repris du fichier reçu','• '+r.ajoutes+' élément(s) ajouté(s) (prélèvements, jours, blancs, conditions)','• '+r.identiques+' inchangé(s)'];
  if(r.conflits.length){
    l.push('','À vérifier, saisis sur les deux téléphones (la saisie la plus récente est gardée, à vérifier) :');
    r.conflits.slice(0,8).forEach(function(c){l.push('- '+c);});
    if(r.conflits.length>8)l.push('- … et '+(r.conflits.length-8)+' autre(s)');
  }
  if(r.signales.length){
    l.push('','À vérifier :');
    r.signales.slice(0,8).forEach(function(c){l.push('- '+c);});
    if(r.signales.length>8)l.push('- … et '+(r.signales.length-8)+' autre(s)');
  }
  return l.join('\n');
}

// Fusion d'une mission reçue (même identifiant) dans celle du téléphone
function appliquerFusionMission(inc){
  var cible=state.missions.filter(function(x){return x.id===inc.id;})[0];
  if(!cible)return null;
  var r=fusionnerMissionDans(cible,inc);
  saveData('vlep_missions_v3',state.missions);
  if(typeof repairMissions==='function')repairMissions();
  state.currentMissionId=cible.id;
  state.showModal=null;
  render();
  alert(fusionBilanTexte(r));
  return r;
}

// Menu ⋯ de la mission : « Fusionner le fichier d'un collègue »
function declencherFusionFichier(){
  var input=document.getElementById('fusion-mission-input');
  if(!input){
    input=document.createElement('input');
    input.type='file';input.accept='.json';input.style.display='none';input.id='fusion-mission-input';
    input.onchange=function(e){
      var f=e.target.files[0];if(!f)return;
      var rd=new FileReader();
      rd.onload=function(ev){fusionnerDepuisTexte(ev.target.result);};
      rd.readAsText(f);
    };
    document.body.appendChild(input);
  }
  input.value='';
  input.click();
}
function fusionnerDepuisTexte(text){
  var m=getCurrentMission();if(!m)return;
  var inc=null;
  try{inc=missionDepuisDonnees(JSON.parse(text));}catch(e){inc=null;}
  if(!inc){alert('Format non reconnu.\n\nChoisissez un fichier de mission VLEP (.json).');return;}
  if(inc.id!==m.id){alert('Ce fichier est celui d’une autre mission (créée séparément).\n\nLa fusion ne réunit que les saisies d’une même mission partagée entre techniciens.');return;}
  appliquerFusionMission(inc);
}
