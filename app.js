const FARINES=[
  {key:'FIRST CHOICE',label:'FARINE FIRST CHOICE',color:'var(--fc)',badge:'fc-badge'},
  {key:'TERANGA',label:'FARINE TERANGA',color:'var(--ft)',badge:'ft-badge'},
  {key:'PATISSIERE',label:'FARINE PÂTISSIÈRE',color:'var(--fp)',badge:'fp-badge'},
  {key:'BEIGNET',label:'FARINE BEIGNET',color:'var(--fb)',badge:'fb-badge'},
];
const ALL_CATS=['CHARGEMENT','DECHARGEMENT','TRANSPORT','MAIRIE','WOYOFAL','GARDIENNAGE','NETTOYAGE','REPAS','ELECTRICITE','AUTRE'];
const CAT_ICONS={CHARGEMENT:'🏗️',DECHARGEMENT:'📥',TRANSPORT:'🚛',MAIRIE:'🏛️',WOYOFAL:'💡',GARDIENNAGE:'🔐',NETTOYAGE:'🧹',REPAS:'🍽️',ELECTRICITE:'⚡',AUTRE:'📌'};
const CAT_COLORS={CHARGEMENT:'var(--accent2)',DECHARGEMENT:'var(--fp)',TRANSPORT:'var(--fc)',MAIRIE:'#a5d6a7',WOYOFAL:'#ffcc80',GARDIENNAGE:'#80cbc4',NETTOYAGE:'#b39ddb',REPAS:'#f48fb1',ELECTRICITE:'#ffe082',AUTRE:'var(--fb)'};

let data=JSON.parse(localStorage.getItem('depot_farine_v3')||JSON.stringify({
  appros:[],sorties:[],depenses:[],virements:[],
  seuils:{'FIRST CHOICE':20,'TERANGA':20,'PATISSIERE':20,'BEIGNET':20}
}));
if(!data.virements) data.virements=[];
function save(){localStorage.setItem('depot_farine_v3',JSON.stringify(data))}

function getStock(k){
  return data.appros.filter(a=>a.farine===k).reduce((s,a)=>s+a.qty,0)
       - data.sorties.filter(a=>a.farine===k).reduce((s,a)=>s+a.qty,0);
}
function today(){return new Date().toISOString().split('T')[0]}
function curMonth(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function fmtD(d){if(!d)return'—';const[y,m,j]=d.split('-');return j+'/'+m+'/'+y}
function fmtM(v){return Number(v).toLocaleString('fr-FR')+' F'}

// ===== PAGE NAV =====
function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(btn)btn.classList.add('active');
  document.querySelector('.scroll-area').scrollTop=0;
  refresh();
}

// ===== TAB SWITCHES =====
function switchDepTab(tab,btn){
  ['apercu','virement','charges','mensuel'].forEach(t=>document.getElementById('dep-tab-'+t).style.display='none');
  document.getElementById('dep-tab-'+tab).style.display='block';
  document.querySelectorAll('#page-depenses .tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(tab==='mensuel')refreshMensuel();
  if(tab==='apercu')refreshDepApercu();
  if(tab==='virement')renderVirementTable();
  if(tab==='charges')renderDepTable('all');
}
function switchSortieTab(tab,btn){
  ['liste','client','farine'].forEach(t=>document.getElementById('sortie-tab-'+t).style.display='none');
  document.getElementById('sortie-tab-'+tab).style.display='block';
  document.querySelectorAll('#page-sorties .tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(tab==='client')refreshClientBlocks();
  if(tab==='farine')refreshFarineBlocks();
}

// ===== REFRESH =====
function refresh(){
  const stocks={};let mx=1;
  FARINES.forEach(f=>{stocks[f.key]=getStock(f.key);if(stocks[f.key]>mx)mx=stocks[f.key]});
  ['FIRST CHOICE','TERANGA','PATISSIERE','BEIGNET'].forEach((k,i)=>{
    const ids=['d-fc','d-ft','d-fp','d-fb'];const pids=['p-fc','p-ft','p-fp','p-fb'];
    const el=document.getElementById(ids[i]);const pel=document.getElementById(pids[i]);
    if(el){el.textContent=stocks[k];pel.style.width=Math.min(100,stocks[k]/mx*100)+'%'}
  });

  // alertes
  const ael=document.getElementById('alertes-stock');
  if(ael){let h='';FARINES.forEach(f=>{if(stocks[f.key]<=data.seuils[f.key])h+=`<div class="alert alert-warn">⚠️ ${f.label} : ${stocks[f.key]} sacs (min ${data.seuils[f.key]})</div>`;});ael.innerHTML=h||'<div class="alert alert-ok">✓ Tous les stocks sont suffisants</div>';}

  // dashboard solde
  const cm=curMonth();
  const virMois=data.virements.filter(v=>v.date.startsWith(cm)).reduce((s,v)=>s+v.montant,0);
  const depMois=data.depenses.filter(d=>d.date.startsWith(cm)).reduce((s,d)=>s+d.montant,0);
  if(document.getElementById('d-virement-mois'))document.getElementById('d-virement-mois').textContent=fmtM(virMois);
  if(document.getElementById('d-dep-mois'))document.getElementById('d-dep-mois').textContent=fmtM(depMois);
  if(document.getElementById('d-solde-mois')){const s=virMois-depMois;document.getElementById('d-solde-mois').textContent=fmtM(s);document.getElementById('d-solde-mois').style.color=s>=0?'var(--accent3)':'var(--accent4)';}

  // recent moves
  const rEl=document.getElementById('recent-moves');
  if(rEl){
    const moves=[...data.appros.map(a=>({date:a.date,type:'Entrée',farine:a.farine,qty:'+'+a.qty})),...data.sorties.map(s=>({date:s.date,type:'Sortie',farine:s.farine,qty:'-'+s.qty}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
    rEl.innerHTML=moves.length?moves.map(m=>`<tr><td style="font-size:10px;font-family:'JetBrains Mono',monospace">${fmtD(m.date)}</td><td><span class="badge ${m.type==='Entrée'?'badge-in':'badge-out'}">${m.type}</span></td><td style="font-size:10px">${m.farine}</td><td style="font-family:'JetBrains Mono',monospace;color:${m.type==='Entrée'?'var(--accent3)':'var(--accent4)'}">${m.qty}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">Aucun mouvement</td></tr>';
  }

  // stock page
  const sb=document.getElementById('stock-blocks');
  if(sb){sb.innerHTML=FARINES.map(f=>{const s=stocks[f.key];const e=data.appros.filter(a=>a.farine===f.key).reduce((x,a)=>x+a.qty,0);const o=data.sorties.filter(a=>a.farine===f.key).reduce((x,a)=>x+a.qty,0);const warn=s<=data.seuils[f.key];return`<div class="farine-block" style="border-color:${warn?'rgba(229,115,115,0.3)':''}"><div style="margin-bottom:6px"><span class="badge ${f.badge}">${f.label}</span></div><div class="farine-num" style="color:${warn?'var(--accent4)':f.color}">${s} sacs ${warn?'⚠️':''}</div><div class="farine-stats"><span>📥 Entré: ${e}</span><span>📤 Sorti: ${o}</span><span>Seuil: ${data.seuils[f.key]}</span></div></div>`;}).join('');}

  const seuilEl=document.getElementById('seuil-blocks');
  if(seuilEl){seuilEl.innerHTML=FARINES.map(f=>`<div class="dep-row"><span style="font-size:11px">${f.label}</span><div style="display:flex;align-items:center;gap:6px"><input type="number" value="${data.seuils[f.key]}" min="0" style="width:72px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text);font-size:12px;text-align:center" onchange="updateSeuil('${f.key}',this.value)" inputmode="numeric"><span style="font-size:10px;color:var(--text2)">sacs</span></div></div>`).join('');}

  renderApproTable(window._approFilter||'all');
  renderSortieTable(window._sortieFilter||'all');
  renderDepTable(window._depFilter||'all');
  renderVirementTable();
  refreshDepApercu();
}

// ===== APPRO TABLE =====
function renderApproTable(f){
  window._approFilter=f;
  const el=document.getElementById('appro-table');if(!el)return;
  const rows=[...data.appros].filter(a=>f==='all'||a.farine===f).sort((a,b)=>b.date.localeCompare(a.date));
  el.innerHTML=rows.length?rows.map(a=>`<tr><td style="font-size:10px;font-family:'JetBrains Mono',monospace">${fmtD(a.date)}</td><td><span class="badge ${FARINES.find(x=>x.key===a.farine)?.badge||''}">${a.farine}</span></td><td style="font-weight:600">${a.qty}</td><td style="font-size:10px">${a.prix?fmtM(a.prix):'—'}</td><td style="color:var(--accent3);font-size:10px">${a.prix?fmtM(a.qty*a.prix):'—'}</td><td style="color:var(--text2);font-size:10px">${a.fournisseur||'—'}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Aucun approvisionnement</td></tr>';
}

// ===== SORTIE TABLE =====
function renderSortieTable(f){
  window._sortieFilter=f;
  const el=document.getElementById('sortie-table');if(!el)return;
  const rows=[...data.sorties].filter(a=>f==='all'||a.farine===f).sort((a,b)=>b.date.localeCompare(a.date));
  el.innerHTML=rows.length?rows.map(a=>`<tr><td style="font-size:10px;font-family:'JetBrains Mono',monospace">${fmtD(a.date)}</td><td><span class="badge ${FARINES.find(x=>x.key===a.farine)?.badge||''}">${a.farine}</span></td><td style="color:var(--accent4);font-weight:600">${a.qty}</td><td style="font-size:11px">${a.client||'—'}</td><td style="color:var(--text2);font-size:10px">${a.note||'—'}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Aucune sortie</td></tr>';
}

// ===== CLIENT BLOCKS =====
function refreshClientBlocks(){
  const month=document.getElementById('client-month')?.value||curMonth();
  const el=document.getElementById('client-blocks');if(!el)return;
  const sorties=data.sorties.filter(s=>s.date.startsWith(month));
  const clients={};
  sorties.forEach(s=>{
    const c=s.client||'Anonyme';
    if(!clients[c])clients[c]={total:0,farines:{}};
    clients[c].total+=s.qty;
    clients[c].farines[s.farine]=(clients[c].farines[s.farine]||0)+s.qty;
  });
  if(!Object.keys(clients).length){el.innerHTML='<div class="card"><div class="empty">Aucune sortie ce mois</div></div>';return;}
  el.innerHTML=Object.entries(clients).sort((a,b)=>b[1].total-a[1].total).map(([c,v])=>`
    <div class="card" style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-weight:600;font-size:13px">👤 ${c}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--accent4)">${v.total} sacs</div>
      </div>
      ${Object.entries(v.farines).map(([f,q])=>`<div class="dep-row"><span class="badge ${FARINES.find(x=>x.key===f)?.badge||''}" style="font-size:9px">${f}</span><span style="font-family:'JetBrains Mono',monospace;font-size:12px">${q} sacs</span></div>`).join('')}
      <div style="text-align:right;margin-top:6px"><button class="btn btn-info btn-sm" onclick="genRapportClient('${c}','${month}')">📄 Fiche client</button></div>
    </div>`).join('');
}

// ===== FARINE BLOCKS =====
function refreshFarineBlocks(){
  const month=document.getElementById('farine-month')?.value||curMonth();
  const el=document.getElementById('farine-blocks');if(!el)return;
  const sorties=data.sorties.filter(s=>s.date.startsWith(month));
  el.innerHTML=FARINES.map(f=>{
    const rows=sorties.filter(s=>s.farine===f.key);
    const total=rows.reduce((s,r)=>s+r.qty,0);
    return`<div class="card" style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="badge ${f.badge}">${f.label}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:${f.color}">${total} sacs</span>
      </div>
      ${rows.length?rows.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<div class="dep-row"><span style="font-size:10px;color:var(--text2)">${fmtD(r.date)}</span><span style="font-size:11px">${r.client||'—'}</span><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent4)">${r.qty}</span></div>`).join(''):'<div class="empty" style="padding:10px">Aucune sortie</div>'}
    </div>`;
  }).join('');
}

// ===== DEP APERCU =====
function refreshDepApercu(){
  const month=document.getElementById('dep-month-filter')?.value||curMonth();
  const vir=data.virements.filter(v=>v.date.startsWith(month)).reduce((s,v)=>s+v.montant,0);
  const deps=data.depenses.filter(d=>d.date.startsWith(month));
  const total=deps.reduce((s,d)=>s+d.montant,0);
  const solde=vir-total;
  if(document.getElementById('ap-virement'))document.getElementById('ap-virement').textContent=fmtM(vir);
  if(document.getElementById('ap-total'))document.getElementById('ap-total').textContent=fmtM(total);
  if(document.getElementById('ap-solde')){document.getElementById('ap-solde').textContent=fmtM(solde);document.getElementById('ap-solde').style.color=solde>=0?'var(--accent3)':'var(--accent4)';}
  const bd=document.getElementById('ap-cat-breakdown');
  if(bd){
    const cats={};ALL_CATS.forEach(c=>cats[c]=0);
    deps.forEach(d=>cats[d.cat]=(cats[d.cat]||0)+d.montant);
    bd.innerHTML='<div class="card-title">Détail par catégorie</div>'+ALL_CATS.filter(c=>cats[c]>0).map(c=>`<div class="dep-row"><span style="font-size:11px">${CAT_ICONS[c]||'•'} ${c}</span><span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${CAT_COLORS[c]}">${fmtM(cats[c])}</span></div>`).join('')+(ALL_CATS.every(c=>!cats[c])?'<div class="empty">Aucune dépense</div>':'');
  }
}

// ===== MENSUEL =====
function refreshMensuel(){
  const month=document.getElementById('dep-mensuel-month')?.value||curMonth();
  const el=document.getElementById('mensuel-blocks');if(!el)return;
  const deps=data.depenses.filter(d=>d.date.startsWith(month));
  const vir=data.virements.filter(v=>v.date.startsWith(month)).reduce((s,v)=>s+v.montant,0);
  const cats={};ALL_CATS.forEach(c=>cats[c]=0);
  deps.forEach(d=>cats[d.cat]=(cats[d.cat]||0)+d.montant);
  const total=deps.reduce((s,d)=>s+d.montant,0);
  const [y,m]=month.split('-');
  const moisLabel=new Date(y,m-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  el.innerHTML=`
    <div class="virement-card"><div style="font-size:10px;color:var(--accent2);margin-bottom:4px;text-transform:uppercase">Virement ${moisLabel}</div><div style="font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--accent2)">${fmtM(vir)}</div></div>
    ${ALL_CATS.map(c=>cats[c]>0?`<div class="dep-row"><span style="font-size:12px">${CAT_ICONS[c]} ${c}</span><span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:${CAT_COLORS[c]}">${fmtM(cats[c])}</span></div>`:'').join('')}
    <div class="dep-row" style="border-top:2px solid var(--border);margin-top:6px"><span style="font-size:13px;font-weight:700">TOTAL DÉPENSES</span><span style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:var(--accent4)">${fmtM(total)}</span></div>
    <div class="dep-row"><span style="font-size:13px;font-weight:700">SOLDE RESTANT</span><span style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:${(vir-total)>=0?'var(--accent3)':'var(--accent4)'}">${fmtM(vir-total)}</span></div>
  `;
}

// ===== VIREMENT TABLE =====
function renderVirementTable(){
  const el=document.getElementById('virement-table');if(!el)return;
  const rows=[...data.virements].sort((a,b)=>b.date.localeCompare(a.date));
  el.innerHTML=rows.length?rows.map((v,i)=>`<tr><td style="font-size:10px;font-family:'JetBrains Mono',monospace">${fmtD(v.date)}</td><td style="font-family:'JetBrains Mono',monospace;color:var(--accent2);font-weight:600">${fmtM(v.montant)}</td><td style="color:var(--text2);font-size:10px">${v.note||'—'}</td><td><button class="btn btn-danger btn-sm" onclick="delVirement(${i})">✕</button></td></tr>`).join(''):'<tr><td colspan="4" class="empty">Aucun virement</td></tr>';
}

// ===== DEP TABLE =====
function renderDepTable(f){
  window._depFilter=f;
  const el=document.getElementById('depense-table');if(!el)return;
  const rows=[...data.depenses].filter(d=>f==='all'||d.cat===f).sort((a,b)=>b.date.localeCompare(a.date));
  el.innerHTML=rows.length?rows.map((d,i)=>`<tr><td style="font-size:10px;font-family:'JetBrains Mono',monospace">${fmtD(d.date)}</td><td style="color:${CAT_COLORS[d.cat]};font-size:10px;font-weight:600">${CAT_ICONS[d.cat]||''} ${d.cat}</td><td style="color:var(--accent4);font-family:'JetBrains Mono',monospace;font-size:11px">${fmtM(d.montant)}</td><td style="color:var(--text2);font-size:10px">${d.desc||'—'}</td><td><button class="btn btn-danger btn-sm" onclick="delDep(${i})">✕</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">Aucune dépense</td></tr>';
}
function filterDep(f,btn){
  document.querySelectorAll('#dep-tab-charges .filter-scroll .chip').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');renderDepTable(f);
}

// ===== HIST TABLE =====
function renderHistTable(){
  const el=document.getElementById('hist-table');if(!el)return;
  const filter=document.getElementById('hist-month')?.value||'';
  const moves=[
    ...data.appros.map(a=>({date:a.date,type:'ENTRÉE',farine:a.farine,qty:'+'+a.qty,montant:a.prix?fmtM(a.qty*a.prix):'—'})),
    ...data.sorties.map(s=>({date:s.date,type:'SORTIE',farine:s.farine,qty:'-'+s.qty,montant:'—'})),
    ...data.depenses.map(d=>({date:d.date,type:d.cat,farine:'—',qty:'—',montant:fmtM(d.montant)})),
    ...data.virements.map(v=>({date:v.date,type:'VIREMENT',farine:'—',qty:'—',montant:fmtM(v.montant)}))
  ].filter(m=>!filter||m.date.startsWith(filter)).sort((a,b)=>b.date.localeCompare(a.date));
  el.innerHTML=moves.length?moves.map(m=>{
    let bc='',bc2='';
    if(m.type==='ENTRÉE'){bc='badge-in';}
    else if(m.type==='SORTIE'){bc='badge-out';}
    else if(m.type==='VIREMENT'){bc2='background:rgba(79,195,247,0.15);color:var(--accent2)';}
    else{bc2=`background:rgba(245,166,35,0.1);color:var(--accent)`;}
    return`<tr><td style="font-size:10px;font-family:'JetBrains Mono',monospace">${fmtD(m.date)}</td><td><span class="badge ${bc}" style="${bc2};font-size:9px">${m.type}</span></td><td style="font-size:10px">${m.farine}</td><td style="font-family:'JetBrains Mono',monospace;font-size:10px">${m.qty}</td><td style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--accent)">${m.montant}</td></tr>`;
  }).join(''):'<tr><td colspan="5" class="empty">Aucune opération</td></tr>';
}

// ===== RAPPORT DEPENSES =====
let _rapportData={};
function genRapportDepenses(){
  const month=document.getElementById('dep-mensuel-month')?.value||curMonth();
  const[y,m]=month.split('-');
  const moisLabel=new Date(y,m-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const deps=data.depenses.filter(d=>d.date.startsWith(month));
  const vir=data.virements.filter(v=>v.date.startsWith(month)).reduce((s,v)=>s+v.montant,0);
  const cats={};ALL_CATS.forEach(c=>cats[c]=0);deps.forEach(d=>cats[d.cat]=(cats[d.cat]||0)+d.montant);
  const total=deps.reduce((s,d)=>s+d.montant,0);
  _rapportData={type:'depenses',month,moisLabel,cats,total,vir};
  document.getElementById('rapport-title').textContent='📄 Rapport Dépenses — '+moisLabel;
  document.getElementById('rapport-body').innerHTML=`
    <div class="rapport-section">
      <div class="rapport-section-title">Financement</div>
      <div class="rapport-row"><span style="color:var(--text2)">Virement reçu</span><span style="color:var(--accent2);font-family:'JetBrains Mono',monospace;font-weight:600">${fmtM(vir)}</span></div>
    </div>
    <div class="rapport-section">
      <div class="rapport-section-title">Détail des charges</div>
      ${ALL_CATS.map(c=>cats[c]>0?`<div class="rapport-row"><span>${CAT_ICONS[c]} ${c}</span><span style="font-family:'JetBrains Mono',monospace">${fmtM(cats[c])}</span></div>`:'').join('')}
      <div class="rapport-total"><span>Total dépenses</span><span style="color:var(--accent4)">${fmtM(total)}</span></div>
      <div class="rapport-total"><span>Solde restant</span><span style="color:${(vir-total)>=0?'var(--accent3)':'var(--accent4)'}">${fmtM(vir-total)}</span></div>
    </div>`;
  openModal('rapport-modal');
}

// ===== RAPPORT CLIENT =====
function genRapportClient(client,month){
  const[y,m]=month.split('-');
  const moisLabel=new Date(y,m-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const sorties=data.sorties.filter(s=>s.date.startsWith(month)&&s.client===client);
  const farines={};FARINES.forEach(f=>farines[f.key]=0);
  sorties.forEach(s=>farines[s.farine]=(farines[s.farine]||0)+s.qty);
  const total=sorties.reduce((s,r)=>s+r.qty,0);
  _rapportData={type:'client',client,month,moisLabel,sorties,farines,total};
  document.getElementById('rapport-title').textContent='📄 Fiche Client — '+client;
  document.getElementById('rapport-body').innerHTML=`
    <div class="rapport-section">
      <div class="rapport-section-title">Client : ${client} | ${moisLabel}</div>
      ${FARINES.filter(f=>farines[f.key]>0).map(f=>`<div class="rapport-row"><span class="badge ${f.badge}" style="font-size:10px">${f.label}</span><span style="font-family:'JetBrains Mono',monospace;font-weight:600">${farines[f.key]} sacs</span></div>`).join('')}
      <div class="rapport-total"><span>Total enlevé</span><span>${total} sacs</span></div>
    </div>
    <div class="rapport-section">
      <div class="rapport-section-title">Détail des sorties</div>
      ${sorties.sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`<div class="rapport-row"><span style="color:var(--text2);font-size:11px">${fmtD(s.date)}</span><span style="font-size:11px">${s.farine}</span><span style="font-family:'JetBrains Mono',monospace">${s.qty} sacs</span></div>`).join('')}
    </div>`;
  openModal('rapport-modal');
}

// ===== RAPPORT COMPLET =====
function genRapportComplet(){
  const month=document.getElementById('hist-month')?.value||curMonth();
  const[y,m]=month.split('-');
  const moisLabel=new Date(y,m-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const deps=data.depenses.filter(d=>d.date.startsWith(month));
  const vir=data.virements.filter(v=>v.date.startsWith(month)).reduce((s,v)=>s+v.montant,0);
  const cats={};ALL_CATS.forEach(c=>cats[c]=0);deps.forEach(d=>cats[d.cat]=(cats[d.cat]||0)+d.montant);
  const totalDep=deps.reduce((s,d)=>s+d.montant,0);
  const sorties=data.sorties.filter(s=>s.date.startsWith(month));
  const clients={};
  sorties.forEach(s=>{const c=s.client||'Anonyme';if(!clients[c])clients[c]={total:0,farines:{}};clients[c].total+=s.qty;clients[c].farines[s.farine]=(clients[c].farines[s.farine]||0)+s.qty;});
  const appros=data.appros.filter(a=>a.date.startsWith(month));
  const totalEntree=appros.reduce((s,a)=>s+a.qty,0);
  const totalSortie=sorties.reduce((s,a)=>s+a.qty,0);
  _rapportData={type:'complet',month,moisLabel};
  document.getElementById('rapport-title').textContent='📄 Rapport Complet — '+moisLabel;
  document.getElementById('rapport-body').innerHTML=`
    <div class="rapport-section">
      <div class="rapport-section-title">📦 Mouvements de stock</div>
      <div class="rapport-row"><span style="color:var(--text2)">Total entré (sacs)</span><span style="color:var(--accent3);font-family:'JetBrains Mono',monospace">${totalEntree}</span></div>
      <div class="rapport-row"><span style="color:var(--text2)">Total sorti (sacs)</span><span style="color:var(--accent4);font-family:'JetBrains Mono',monospace">${totalSortie}</span></div>
    </div>
    <div class="rapport-section">
      <div class="rapport-section-title">👤 Enlèvements par client</div>
      ${Object.keys(clients).length?Object.entries(clients).sort((a,b)=>b[1].total-a[1].total).map(([c,v])=>`<div class="rapport-row"><span style="font-size:11px">${c}</span><span style="font-family:'JetBrains Mono',monospace">${v.total} sacs</span></div>`).join(''):'<div style="font-size:12px;color:var(--text3);padding:6px 0">Aucune sortie ce mois</div>'}
    </div>
    <div class="rapport-section">
      <div class="rapport-section-title">💸 Dépenses</div>
      <div class="rapport-row"><span style="color:var(--accent2)">Virement reçu</span><span style="color:var(--accent2);font-family:'JetBrains Mono',monospace">${fmtM(vir)}</span></div>
      ${ALL_CATS.map(c=>cats[c]>0?`<div class="rapport-row"><span>${CAT_ICONS[c]} ${c}</span><span style="font-family:'JetBrains Mono',monospace">${fmtM(cats[c])}</span></div>`:'').join('')}
      <div class="rapport-total"><span>Total dépenses</span><span style="color:var(--accent4)">${fmtM(totalDep)}</span></div>
      <div class="rapport-total"><span>Solde</span><span style="color:${(vir-totalDep)>=0?'var(--accent3)':'var(--accent4)'}">${fmtM(vir-totalDep)}</span></div>
    </div>`;
  openModal('rapport-modal');
}

// ===== PRINT =====
function printRapport(){
  const title=document.getElementById('rapport-title').textContent;
  const body=document.getElementById('rapport-body').innerHTML;
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#111;font-size:13px;max-width:600px;margin:0 auto}
    h1{font-size:18px;margin-bottom:20px;padding-bottom:8px;border-bottom:2px solid #111}
    .rapport-section{margin-bottom:20px}
    .rapport-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #ddd}
    .rapport-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px}
    .rapport-total{display:flex;justify-content:space-between;padding:8px 0;font-weight:700;font-size:13px;border-top:2px solid #111;margin-top:4px}
    .badge{font-size:10px;padding:2px 8px;border-radius:20px;background:#eee;font-weight:600}
    @media print{button{display:none}}
  </style></head><body>
  <h1>${title}</h1>
  <div style="font-size:11px;color:#888;margin-bottom:16px">Généré le ${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>
  ${body}
  
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(r => console.log('SW registered'))
      .catch(e => console.log('SW error', e));
  });
}