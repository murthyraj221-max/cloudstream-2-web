(() => {
"use strict";

/* CS 2.0 Web v0.2
   Privacy-first architecture:
   - no analytics / remote history
   - extension manifests only; arbitrary remote JS is never eval'd
   - local persistence via localStorage for portability
   - SHA-256 PIN verifier via Web Crypto
*/

const catalog=[
 {id:"void",title:"VOID SIGNAL",type:"Movie",year:2026,genre:"Sci-Fi",provider:"Local Catalog",c1:"#3a3a46",c2:"#101014",desc:"A private-demo science-fiction title."},
 {id:"night",title:"NIGHT SHIFT",type:"TV",year:2025,genre:"Thriller",provider:"Local Catalog",c1:"#403531",c2:"#111013",desc:"A late-night mystery series."},
 {id:"orbit",title:"ORBIT ZERO",type:"Movie",year:2024,genre:"Sci-Fi",provider:"Local Catalog",c1:"#2a404e",c2:"#101316",desc:"A deep-space survival story."},
 {id:"motel",title:"THE LAST MOTEL",type:"TV",year:2023,genre:"Mystery",provider:"Local Catalog",c1:"#4a3a38",c2:"#131012",desc:"A motel where every room hides a clue."},
 {id:"paper",title:"PAPER MOON",type:"Movie",year:2022,genre:"Drama",provider:"Local Catalog",c1:"#4c4a55",c2:"#17151a",desc:"A quiet character drama."},
 {id:"dead",title:"DEAD AIR",type:"Documentary",year:2021,genre:"Documentary",provider:"Local Catalog",c1:"#3a4144",c2:"#0e1113",desc:"A documentary about radio silence."},
 {id:"neon",title:"NEON RUN",type:"Anime",year:2025,genre:"Anime",provider:"Local Catalog",c1:"#4d3d50",c2:"#171017",desc:"Fast, stylized demo anime."},
 {id:"deep",title:"DEEP BLUE",type:"Movie",year:2020,genre:"Adventure",provider:"Local Catalog",c1:"#253b49",c2:"#0e1215",desc:"A submerged expedition."},
 {id:"echo",title:"ECHO ROOM",type:"TV",year:2024,genre:"Horror",provider:"Local Catalog",c1:"#4b373a",c2:"#120e11",desc:"A room that remembers."},
 {id:"atlas",title:"ATLAS FALL",type:"Movie",year:2025,genre:"Action",provider:"Local Catalog",c1:"#41413c",c2:"#151512",desc:"A global action demo."},
 {id:"archive",title:"ARCHIVE NINE",type:"Movie",year:2019,genre:"Mystery",provider:"Public Domain Demo",c1:"#363b45",c2:"#111318",desc:"A placeholder for an authorized public-domain source."},
 {id:"openbook",title:"OPEN BOOK",type:"Documentary",year:2018,genre:"Documentary",provider:"Public Domain Demo",c1:"#45433f",c2:"#151411",desc:"A placeholder for an authorized open archive."}
];

const defaultExt=[
 {id:"public-demo",name:"Public Demo Provider",version:"1.0.0",enabled:true,verified:true,description:"Built-in manifest-only provider for testing the extension UI.",cap:["metadata","search"],origin:"self"},
 {id:"internet-archive",name:"Internet Archive Adapter",version:"0.1.0",enabled:false,verified:true,description:"Adapter slot for public-domain / openly licensed media. Requires a packaged adapter.",cap:["metadata","search","play"],origin:"archive.org"}
];

const state={
 bookmarks:read("cs2.bookmarks",[]),
 history:read("cs2.history",[]),
 progress:read("cs2.progress",{}),
 collections:read("cs2.collections",{}),
 downloads:read("cs2.downloads",[]),
 extensions:read("cs2.extensions",defaultExt),
 pinHash:localStorage.getItem("cs2.pinHash")||"",
 query:"",
 filter:"All"
};

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function read(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
function save(){localStorage.setItem("cs2.bookmarks",JSON.stringify(state.bookmarks));localStorage.setItem("cs2.history",JSON.stringify(state.history));localStorage.setItem("cs2.progress",JSON.stringify(state.progress));localStorage.setItem("cs2.collections",JSON.stringify(state.collections));localStorage.setItem("cs2.downloads",JSON.stringify(state.downloads));localStorage.setItem("cs2.extensions",JSON.stringify(state.extensions))}
const item=id=>catalog.find(x=>x.id===id);
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const art=x=>`style="--c1:${x.c1};--c2:${x.c2}"`;
function card(x){
 const p=state.progress[x.id]||0;
 return `<article class="poster" data-id="${esc(x.id)}"><div class="poster-art" ${art(x)}><div class="poster-title">${esc(x.title)}</div></div><div class="poster-meta"><span>${x.year} • ${esc(x.type)}</span><span>${p?Math.round(p)+"%":"☆"}</span></div></article>`;
}
function show(screen){
 $$(".screen").forEach(s=>s.classList.toggle("active",s.id===screen));
 $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.screen===screen));
}
function wireCards(){$$(".poster").forEach(e=>e.onclick=()=>openDetail(e.dataset.id))}
function renderHome(){
 const watch=state.history.map(item).filter(Boolean);
 $("#continueRow").innerHTML=(watch.length?watch.slice(0,5):catalog.slice(0,5)).map(card).join("");
 $("#discoverGrid").innerHTML=catalog.slice(0,10).map(card).join("");
 $("#privacyCards").innerHTML=[
  ["Telemetry","No analytics SDK is bundled."],
  ["Accounts","No login layer exists."],
  ["Storage","Bookmarks and history stay local."],
  ["Extensions","Remote JavaScript is never executed."]
 ].map(x=>`<div class="privacy-card"><strong>✓ ${x[0]}</strong><span>${x[1]}</span></div>`).join("");
 wireCards();
}
function renderSearch(q=state.query){
 const filters=[...new Set(["All","Movie","TV","Anime","Documentary","Sci-Fi","Thriller"])];
 $("#filterChips").innerHTML=filters.map(f=>`<button class="chip ${state.filter===f?"selected":""}" data-filter="${f}">${f==="All"?"All":f}</button>`).join("");
 $$(".chip").forEach(c=>c.onclick=()=>{state.filter=c.dataset.filter;renderSearch()});
 const qq=q.trim().toLowerCase();
 let arr=catalog.filter(x=>!qq||`${x.title} ${x.genre} ${x.type} ${x.year} ${x.provider}`.toLowerCase().includes(qq));
 if(state.filter!=="All")arr=arr.filter(x=>x.type===state.filter||x.genre===state.filter);
 const grouped=Object.groupBy?Object.groupBy(arr,x=>x.provider):arr.reduce((a,x)=>(a[x.provider]??=[]).push(x)&&a,{});
 $("#searchStatus").textContent=`${arr.length} result${arr.length===1?"":"s"}${qq?` for “${q}”`:""}`;
 $("#searchResults").innerHTML=Object.entries(grouped).map(([p,items])=>`<div class="provider-block"><h3>${esc(p)} <span class="provider-label">• ${items.length}</span></h3><div class="poster-grid">${items.map(card).join("")}</div></div>`).join("")||`<div class="empty-card"><h3>Nothing found</h3><p>Try another title or filter.</p></div>`;
 wireCards();
}
function renderLibrary(mode="bookmarks"){
 let ids=state.bookmarks;
 if(mode==="collections")ids=Object.values(state.collections).flat();
 ids=[...new Set(ids)];
 const arr=ids.map(item).filter(Boolean);
 $("#libraryGrid").innerHTML=arr.length?arr.map(card).join(""):`<div class="empty-card"><h3>Nothing here yet</h3><p>Open a title and save it to your local library.</p></div>`;
 wireCards();
}
function renderHistory(){
 const arr=state.history.map(item).filter(Boolean);
 $("#historyCount").textContent=`${arr.length} item${arr.length===1?"":"s"}`;
 $("#historyList").innerHTML=arr.length?arr.map(x=>row(x,state.progress[x.id]||0,true)).join(""):`<div class="empty-card"><h3>No history</h3><p>Play something and your local progress will appear here.</p></div>`;
 bindListRows();
}
function row(x,p,withDelete=false){return `<div class="list-row" data-id="${x.id}"><div class="mini-art" ${art(x)}></div><div class="list-main"><strong>${esc(x.title)}</strong><span>${x.year} • ${x.type} • ${x.genre}</span><div class="progress"><i style="width:${p}%"></i></div></div><button class="secondary small play-row">Play</button>${withDelete?`<button class="danger small del-row">Delete</button>`:""}</div>`}
function bindListRows(){$$(".play-row").forEach(b=>b.onclick=()=>openDetail(b.closest(".list-row").dataset.id));$$(".del-row").forEach(b=>b.onclick=()=>{const id=b.closest(".list-row").dataset.id;state.history=state.history.filter(x=>x!==id);delete state.progress[id];save();renderHistory();renderHome()})}
function renderDownloads(){
 $("#downloadCount").textContent=`${state.downloads.length} queued`;
 $("#downloadsList").innerHTML=state.downloads.length?state.downloads.map(d=>`<div class="list-row"><div class="mini-art" ${art(d)}></div><div class="list-main"><strong>${esc(d.title)}</strong><span>${esc(d.status)}</span><div class="progress"><i style="width:${d.progress||0}%"></i></div></div><button class="danger small" data-dl="${d.id}">Remove</button></div>`).join(""):`<div class="empty-card"><h3>No downloads</h3><p>Only explicit, source-authorized downloads should be added here.</p></div>`;
 $$("[data-dl]").forEach(b=>b.onclick=()=>{state.downloads=state.downloads.filter(x=>x.id!==b.dataset.dl);save();renderDownloads()});
}
function renderExtensions(){
 $("#extensionsList").innerHTML=state.extensions.map(x=>`<article class="ext-card"><div class="ext-head"><div><div class="ext-name">${esc(x.name)}</div><div class="ext-version">v${esc(x.version)} • ${x.verified?"verified manifest":"unverified"}</div></div><button class="${x.enabled?"primary":"secondary"} small" data-ext="${esc(x.id)}">${x.enabled?"Enabled":"Disabled"}</button></div><div class="ext-desc">${esc(x.description)}</div><div class="cap-row">${x.cap.map(c=>`<span class="cap">${esc(c)}</span>`).join("")}</div><div class="subtle" style="margin-top:10px">Origin: ${esc(x.origin)}</div></article>`).join("");
 $$("[data-ext]").forEach(b=>b.onclick=()=>{const x=state.extensions.find(e=>e.id===b.dataset.ext);x.enabled=!x.enabled;save();renderExtensions()});
}
function openDetail(id){
 const x=item(id);if(!x)return;
 const saved=state.bookmarks.includes(id);
 $("#modalBody").innerHTML=`<div class="detail-art" ${art(x)}><strong>${esc(x.title)}</strong></div><span class="eyebrow" style="display:block;margin-top:17px">${esc(x.type).toUpperCase()}</span><h2 style="margin:6px 0">${esc(x.title)}</h2><p class="subtle">${x.year} • ${esc(x.genre)} • ${esc(x.provider)}</p><p style="color:#999;line-height:1.6">${esc(x.desc)}</p><div class="detail-row"><span class="detail-chip">Subtitle selection</span><span class="detail-chip">Episode selector</span><span class="detail-chip">Quality selector</span><span class="detail-chip">Local progress</span></div><div class="actions" style="margin-top:17px"><button id="detailPlay" class="primary">▶ Play</button><button id="detailSave" class="secondary">${saved?"✓ Saved":"＋ Library"}</button><button id="detailDownload" class="secondary">⇩ Queue download</button></div>`;
 $("#modal").hidden=false;
 $("#detailPlay").onclick=()=>play(x);
 $("#detailSave").onclick=()=>{state.bookmarks=saved?state.bookmarks.filter(v=>v!==id):[...state.bookmarks,id];save();$("#modal").hidden=true;renderHome();renderLibrary()};
 $("#detailDownload").onclick=()=>{if(!state.downloads.some(d=>d.id===id))state.downloads.push({id,title:x.title,year:x.year,c1:x.c1,c2:x.c2,status:"Queued",progress:0});save();$("#modal").hidden=true;renderDownloads()};
}
function play(x){
 $("#modal").hidden=true;$("#player").hidden=false;
 $("#playerTitle").textContent=x.title;$("#playerType").textContent=x.type;$("#playerMeta").textContent=`${x.year} • ${x.genre} • ${x.provider}`;
 $("#playerScreen").innerHTML=`<div style="text-align:center"><div style="font-size:55px">▶</div><p>Player shell ready</p><small>Connect an authorized media URL through a packaged provider adapter.</small></div>`;
 const episodes=x.type==="TV"||x.type==="Anime"?Array.from({length:8},(_,i)=>i+1):[];
 $("#episodeRow").innerHTML=episodes.length?episodes.map((n,i)=>`<button class="episode ${i===0?"active":""}">E${n}</button>`).join(""):"";
 $("#sourceRow").innerHTML=state.extensions.filter(e=>e.enabled&&e.cap.includes("play")).map((e,i)=>`<button class="source ${i===0?"active":""}">${esc(e.name)}</button>`).join("")||`<span class="subtle">No playback adapter enabled.</span>`;
 state.history=[x.id,...state.history.filter(v=>v!==x.id)].slice(0,100);
 state.progress[x.id]=Math.min(98,(state.progress[x.id]||0)+7);
 save();renderHome();renderHistory();
}
async function hashPin(pin){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(pin));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function pinModal(){
 $("#modalBody").innerHTML=`<h2>${state.pinHash?"Change PIN":"Set PIN"}</h2><p class="subtle">PIN verification happens locally. It is not sent to a server.</p><input id="pin" class="pin-input" maxlength="8" inputmode="numeric" type="password" placeholder="••••"><div class="actions" style="margin-top:13px"><button id="savePin" class="primary">Save</button></div>`;
 $("#modal").hidden=false;$("#savePin").onclick=async()=>{const v=$("#pin").value;if(!/^\d{4,8}$/.test(v))return alert("Use 4–8 digits.");state.pinHash=await hashPin(v);localStorage.setItem("cs2.pinHash",state.pinHash);$("#modal").hidden=true;};
}
async function lock(){
 if(!state.pinHash)return pinModal();
 $("#modalBody").innerHTML=`<h2>Unlock</h2><p class="subtle">The PIN is checked locally.</p><input id="pin" class="pin-input" maxlength="8" inputmode="numeric" type="password" placeholder="••••"><div class="actions" style="margin-top:13px"><button id="unlock" class="primary">Unlock</button></div>`;
 $("#modal").hidden=false;$("#unlock").onclick=async()=>{if(await hashPin($("#pin").value)===state.pinHash){$("#modal").hidden=true}else alert("Wrong PIN.")};
}
function exportData(){
 const blob=new Blob([JSON.stringify({version:2,bookmarks:state.bookmarks,history:state.history,progress:state.progress,collections:state.collections,downloads:state.downloads,extensions:state.extensions},null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="cs2-local-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function addRepository(){
 $("#modalBody").innerHTML=`<h2>Add repository</h2><p class="subtle">Only signed/approved manifest metadata is accepted by this shell. It will not execute arbitrary JavaScript from the URL.</p><input id="repoUrl" class="pin-input" style="letter-spacing:0;font-size:14px" placeholder="https://example.com/repo.json"><div class="actions" style="margin-top:13px"><button class="primary" id="repoAdd">Add</button></div>`;
 $("#modal").hidden=false;$("#repoAdd").onclick=()=>{const u=$("#repoUrl").value.trim();try{const url=new URL(u);if(url.protocol!=="https:")throw 0;state.extensions.push({id:"repo-"+Date.now(),name:"Remote manifest (pending)",version:"0.0.0",enabled:false,verified:false,description:`Added ${url.origin}; package must be approved before code can run.`,cap:["metadata"],origin:url.origin});save();$("#modal").hidden=true;renderExtensions()}catch{alert("Use a valid HTTPS URL.")}};
}
function addExtension(){
 $("#modalBody").innerHTML=`<h2>Install extension manifest</h2><p class="subtle">Paste a manifest JSON. Scripts are metadata only in this version.</p><textarea id="extJson" style="width:100%;min-height:180px;background:#0d0d10;color:#eee;border:1px solid var(--line);border-radius:11px;padding:12px" spellcheck="false"></textarea><div class="actions" style="margin-top:13px"><button class="primary" id="installExt">Validate & add</button></div>`;
 $("#modal").hidden=false;$("#installExt").onclick=()=>{try{const x=JSON.parse($("#extJson").value);if(typeof x.name!=="string"||typeof x.version!=="string"||!Array.isArray(x.capabilities))throw 0;state.extensions.push({id:"custom-"+Date.now(),name:x.name,version:x.version,enabled:false,verified:false,description:String(x.description||"Custom manifest"),cap:x.capabilities.map(String).slice(0,12),origin:"manifest"});save();$("#modal").hidden=true;renderExtensions()}catch{alert("Invalid manifest. Required: name, version, capabilities[]")}};
}
function audit(){openAuditModal()}
function openAuditModal(){
 $("#modalBody").innerHTML=`<h2>Security audit</h2><p class="subtle">Current client-side posture</p><div class="list">${[
 ["CSP","Strict; no inline script and no objects."],
 ["Telemetry","None bundled."],
 ["Storage","Local browser storage only."],
 ["Remote JS","Not evaluated."],
 ["Referrer","No-referrer policy."],
 ["Browser permissions","Camera, microphone, geolocation, payment and USB denied."],
 ["PIN","SHA-256 Web Crypto verifier."],
 ["Server headers","Must be configured by your hosting server."]
].map(x=>`<div class="list-row"><div class="list-main"><strong>✓ ${x[0]}</strong><span>${x[1]}</span></div></div>`).join("")}</div>`;
 $("#modal").hidden=false;
}
$$("[data-screen]").forEach(b=>b.onclick=()=>show(b.dataset.screen));
$$("[data-jump]").forEach(b=>b.onclick=()=>show(b.dataset.jump));
$("#globalSearch").oninput=e=>{state.query=e.target.value;show("search");renderSearch(e.target.value)};
$("#heroSearch").onclick=()=>show("search");$("#heroSettings").onclick=()=>show("settings");
$("#randomBtn").onclick=()=>openDetail(catalog[Math.floor(Math.random()*catalog.length)].id);
$("#clearSearch").onclick=()=>{$("#globalSearch").value="";state.query="";state.filter="All";renderSearch()};
$$(".tab").forEach(t=>t.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("selected"));t.classList.add("selected");renderLibrary(t.dataset.lib)});
$("#setPin").onclick=pinModal;$("#lockBtn").onclick=lock;
$("#modalClose").onclick=()=>$("#modal").hidden=true;$("#modal").querySelector(".modal-backdrop").onclick=()=>$("#modal").hidden=true;
$("#playerClose").onclick=()=>$("#player").hidden=true;
$("#exportData").onclick=exportData;$("#importData").onclick=()=>$("#importFile").click();
$("#importFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(Array.isArray(x.bookmarks))state.bookmarks=x.bookmarks;if(Array.isArray(x.history))state.history=x.history;if(x.progress)state.progress=x.progress;if(x.collections)state.collections=x.collections;if(Array.isArray(x.downloads))state.downloads=x.downloads;save();renderHome();renderHistory();renderDownloads();alert("Imported local backup.")}catch{alert("Invalid backup file.")}};r.readAsText(f)};
$("#wipe").onclick=()=>{if(confirm("Delete ALL local CS 2.0 data?")){for(const k of Object.keys(localStorage))if(k.startsWith("cs2."))localStorage.removeItem(k);localStorage.removeItem("cs2.pinHash");location.reload()}};
$("#clearHistory").onclick=()=>{state.history=[];state.progress={};save();renderHistory();renderHome()};
$("#clearDownloads").onclick=()=>{state.downloads=[];save();renderDownloads()};
$("#addExt").onclick=addExtension;$("#importExtRepo").onclick=addRepository;$("#refreshExt").onclick=renderExtensions;$("#showAudit").onclick=audit;
$("#menuBtn").onclick=()=>alert("Use the bottom navigation on mobile.");

setTimeout(()=>{$("#boot").style.display="none";$("#shell").hidden=false;renderHome();renderSearch();renderLibrary();renderHistory();renderDownloads();renderExtensions()},250);
})();