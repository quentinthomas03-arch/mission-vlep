// ===== SECTION CO-PRELEVEMENT AGENTS - VERSION PROPRE =====
// Remplace les lignes 947 à 968 de terrain.js

function renderSmartCoPrelevementAgentsModal(){
  var m=getCurrentMission();
  if(!m)return'';
  var groups=detectCompatibleAgents(m);
  var h='<div class="modal show" onclick="if(event.target===this){state.showModal=null;render();}"><div class="modal-content" style="max-height:90vh;overflow-y:auto;"><div class="modal-header"><h2>'+ICONS.zap+' Detection automatique - Co-prelevement agents</h2><button class="close-btn" onclick="state.showModal=null;render();">×</button></div>';
  h+='<div class="info-box info-box-success"><p><strong>Co-prelevement d\'agents</strong> : Plusieurs agents chimiques preleves sur le MEME support physique (meme pompe, meme reference echantillon).</p><p style="margin-top:6px;font-size:11px;">Criteres : Code support + Code pretraitement + Debit identiques</p></div>';
  if(groups.length===0){
    h+='<div class="empty-state" style="padding:20px;"><p>Aucun agent compatible detecte</p><p style="font-size:12px;margin-top:6px;">Les agents doivent avoir le meme code support, pretraitement et debit pour etre co-preleves.</p></div>';
  }else{
    h+='<p style="font-size:12px;font-weight:600;margin-bottom:8px;">'+groups.length+' groupe(s) d\'agents compatibles detecte(s) :</p>';
    groups.forEach(function(grp,idx){
      h+='<div class="card" style="padding:12px;margin-bottom:8px;border-left:4px solid #0ea5e9;"><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;"><div style="flex:1;"><div style="font-weight:700;font-size:13px;color:var(--text-dark);">'+escapeHtml(grp.gehName)+' &bull; '+grp.type+(grp.isReglementaire?' (Regl.)':' (Non-regl.)')+'</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">'+grp.info.agents.length+' agents compatibles</div></div><button class="btn btn-success btn-small" onclick="createCoPrelevementFromGroup('+idx+');">Creer</button></div>';
      h+='<div style="background:#f8fafc;padding:8px;border-radius:6px;margin-bottom:8px;"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;"><strong>Agents :</strong></div>';
      grp.info.agents.forEach(function(agentName){
        h+='<div style="font-size:12px;padding:2px 0;">&bull; '+escapeHtml(agentName)+'</div>';
      });
      h+='</div><div style="background:#f8fafc;padding:8px;border-radius:6px;font-size:11px;"><div><strong>Support :</strong> '+escapeHtml(grp.info.support||'-')+'</div><div><strong>Pretraitement :</strong> '+escapeHtml(grp.info.pretraitement||'-')+'</div><div><strong>Debit :</strong> '+escapeHtml(grp.info.debit||'-')+' L/min</div></div></div>';
    });
  }
  h+='</div></div>';
  return h;
}

// NOTE: Tous les accents ont ete retires pour eviter les problemes d'encodage
// Si tu veux les remettre, assure-toi que ton editeur est en UTF-8
