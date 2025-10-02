// Deluxe v4.4 — Auto-Fit scaling + local-first core + deluxe UI
const canvas = document.getElementById('gbaScreen');
const deviceBox = document.getElementById('deviceBox');
const romDrop = document.getElementById('romDrop');
const romFile = document.getElementById('romFile');
const romMeta = document.getElementById('romMeta');
const romNameEl = document.getElementById('romName');
const romStatusEl = document.getElementById('romStatus');
const cheatListDiv = document.getElementById('cheatList');
const yearEl = document.getElementById('year');
const splash = document.getElementById('splash');
const toggleThemeBtn = document.getElementById('toggleTheme');
const fpsEl = document.getElementById('fps');
const batteryFill = document.getElementById('batteryFill');
const overlay = document.getElementById('overlay');
const btnPause = document.getElementById('btnPause');
const scaleSel = document.getElementById('scale');

let gbaCore = null; // {type:'gbajs2'|'gbajs1', inst:any}
let savedState = null;
let cheats = JSON.parse(localStorage.getItem('rayzels.cheats') || '[]');
let recents = JSON.parse(localStorage.getItem('rayzels.recents') || '[]'); // [{name, size}]
yearEl.textContent = new Date().getFullYear();

// Splash hide
window.addEventListener('load', () => setTimeout(()=> splash.classList.add('hidden'), 900));

// Theme
const THEME_KEY = 'rayzels.theme';
applyTheme(localStorage.getItem(THEME_KEY) || 'auto');
toggleThemeBtn?.addEventListener('click', () => {
  const cur = localStorage.getItem(THEME_KEY) || 'auto';
  const next = cur === 'dark' ? 'light' : cur === 'light' ? 'auto' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});
function applyTheme(mode){ document.body.className = document.body.className.replace(/\btheme-(dark|light|auto)\b/g,''); document.body.classList.add(`theme-${mode}`); }

// Scale + Auto-Fit
const SCALE_KEY = 'rayzels.scale';
scaleSel.value = localStorage.getItem(SCALE_KEY) || 'auto';
function computeAutoScale(){
  // Fit inside deviceBox/content area; allow some padding for footer/controls
  const maxW = Math.min(deviceBox.clientWidth - 32, document.documentElement.clientWidth - 40);
  const maxH = Math.min(window.innerHeight * 0.7, deviceBox.clientHeight - 100);
  const wMul = Math.max(1, Math.floor(maxW / 240));
  const hMul = Math.max(1, Math.floor(maxH / 160));
  return Math.max(2, Math.min(10, Math.min(wMul, hMul))); // clamp 2..10
}
function applyScale(){
  let s = scaleSel.value;
  if (s === 'auto'){
    s = computeAutoScale();
    // Don't persist 'auto' as a number; remember the mode instead
    localStorage.setItem(SCALE_KEY, 'auto');
  }else{
    s = parseInt(s,10) || 4;
    localStorage.setItem(SCALE_KEY, String(s));
  }
  canvas.style.width = (240*s) + 'px';
  canvas.style.height = (160*s) + 'px';
}
scaleSel.addEventListener('change', applyScale);
applyScale();
window.addEventListener('resize', () => { if(scaleSel.value==='auto') applyScale(); });
window.addEventListener('orientationchange', () => { if(scaleSel.value==='auto') setTimeout(applyScale, 100); });

// Helpers
function setStatus(name, statusText="Ready"){ romMeta.hidden=false; romNameEl.textContent=name; romStatusEl.textContent=statusText; splash.classList.add('hidden'); }
function vibrate(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(_){} }
function addRecent(name, size){ recents = [{name, size}, ...recents.filter(r => r.name!==name || r.size!==size)].slice(0,6); localStorage.setItem('rayzels.recents', JSON.stringify(recents)); renderRecents(); }

// Recents
const recentPanel = document.getElementById('recentPanel');
const recentList = document.getElementById('recentList');
const clearRecent = document.getElementById('clearRecent');
function renderRecents(){ recentList.innerHTML=''; if(!recents.length){ recentPanel.hidden=true; return; } recentPanel.hidden=false; recents.forEach(r=>{ const chip=document.createElement('button'); chip.className='recent-item'; chip.textContent=`${r.name} • ${Math.round(r.size/1024)} KB`; chip.title='Select again via file picker'; chip.addEventListener('click', ()=> romFile.click()); recentList.appendChild(chip); }); }
clearRecent?.addEventListener('click', ()=>{ recents=[]; localStorage.setItem('rayzels.recents','[]'); renderRecents(); });
renderRecents();

// Ensure emulator core (local-first, then CDNs)
(async function ensureCore(){
  if (window.GBA || window.GameBoyAdvance) return;
  const sources = [
    'https://cdn.jsdelivr.net/npm/gbajs@latest/dist/gba.min.js',
    'https://unpkg.com/gbajs@latest/dist/gba.min.js',
    'https://cdn.jsdelivr.net/gh/endrift/gbajs/gba.min.js'
  ];
  for (const src of sources){ try{ await injectScript(src, 8000); if (window.GBA || window.GameBoyAdvance) return; }catch{} }
  console.warn('Could not load emulator core from CDNs. Add ./gba.min.js next to index.html.');
})();
function injectScript(src, timeoutMs=7000){
  return new Promise((resolve, reject)=>{
    const s=document.createElement('script'); s.src=src; s.async=true; s.onload=resolve; s.onerror=()=>reject(new Error('load error')); document.head.appendChild(s);
    setTimeout(()=> reject(new Error('timeout')), timeoutMs);
  });
}

// Boot logic
let currentName = '';
async function bootFromFile(file){
  currentName = file.name; addRecent(file.name, file.size);
  if(!window.GBA && !window.GameBoyAdvance){ await new Promise(r=>setTimeout(r, 800)); }
  if (window.GameBoyAdvance){
    try{
      const gba = new window.GameBoyAdvance();
      gba.setLogger?.(()=>{});
      if (gba.setCanvasScaled) gba.setCanvasScaled(canvas);
      else if (gba.setCanvas)  gba.setCanvas(canvas);
      gbaCore = { type:'gbajs1', inst: gba };
      gba.loadRomFromFile(file, function(success){
        if(success){ try{ gba.runStable?.(); }catch(_){ gba.run?.(); } setStatus(currentName, 'Running'); }
        else alert('Could not load ROM (unsupported or corrupt).');
      });
      return;
    }catch(e){ console.warn('gbajs1 failed', e); }
  }
  const buffer = await file.arrayBuffer();
  if (window.GBA){
    try{
      const inst = new window.GBA(canvas);
      inst.loadROM(new Uint8Array(buffer));
      inst.run();
      gbaCore = { type:'gbajs2', inst };
      setStatus(currentName, 'Running');
      return;
    }catch(e){ console.warn('gbajs2 failed', e); }
  }
  alert('Emulator core failed to initialize. Ensure ./gba.min.js exists in your repo, especially for Safari.');
}

// Input + loaders
romDrop.addEventListener('dragover', e => e.preventDefault());
romDrop.addEventListener('drop', async e => { e.preventDefault(); const file=e.dataTransfer.files?.[0]; if(!file||!file.name.toLowerCase().endsWith('.gba')) return alert('Please drop a .gba file.'); bootFromFile(file); });
romFile.addEventListener('change', async e => { const file=e.target.files?.[0]; if(!file) return; if(!file.name.toLowerCase().endsWith('.gba')) return alert('Please choose a .gba file.'); bootFromFile(file); });

// Cheats (simple 16-bit writes on modern core)
function renderCheats(){ cheatListDiv.innerHTML=''; if(!cheats.length){ const empty=document.createElement('div'); empty.className='muted'; empty.style.padding='10px'; empty.textContent='No cheats added yet.'; cheatListDiv.appendChild(empty); return; } cheats.forEach((c,i)=>{ const row=document.createElement('div'); row.className='cheat-item'; const left=document.createElement('div'); left.className='cheat-row'; const cb=document.createElement('input'); cb.type='checkbox'; cb.className='cheat-toggle'; cb.checked=c.enabled; cb.addEventListener('change',()=>{c.enabled=cb.checked; persistCheats();}); const label=document.createElement('div'); label.textContent=`0x${c.addr.toUpperCase()} = 0x${c.val.toUpperCase()}`; left.appendChild(cb); left.appendChild(label); const rm=document.createElement('button'); rm.className='btn tiny ghost'; rm.textContent='Remove'; rm.addEventListener('click',()=>{cheats.splice(i,1); persistCheats(); renderCheats();}); row.appendChild(left); row.appendChild(rm); cheatListDiv.appendChild(row); }); }
function persistCheats(){ localStorage.setItem('rayzels.cheats', JSON.stringify(cheats)); }
document.getElementById('btnAddCheat')?.addEventListener('click',()=>{ const a=document.getElementById('cheatAddress').value.trim(); const v=document.getElementById('cheatValue').value.trim(); if(!a||!v||!/^[0-9a-fA-F]+$/.test(a)||!/^[0-9a-fA-F]+$/.test(v)) return alert('Enter valid hex for both.'); cheats.push({addr:a.toUpperCase(), val:v.toUpperCase(), enabled:true}); persistCheats(); renderCheats(); });
document.getElementById('btnExportCheats')?.addEventListener('click',()=>{ const data=new Blob([JSON.stringify(cheats,null,2)],{type:'application/json'}); const url=URL.createObjectURL(data); const a=document.createElement('a'); a.href=url; a.download='rayzels-cheats.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); });
document.getElementById('cheatsFile')?.addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(!f) return; try{ const t=await f.text(); const p=JSON.parse(t); if(!Array.isArray(p)) throw 0; cheats=p; persistCheats(); renderCheats(); }catch{ alert('Invalid cheats file.'); } });

function applyCheats(){ if(!gbaCore?.inst?.memory?.view) return; cheats.forEach(c=>{ if(!c.enabled) return; try{ gbaCore.inst.memory.view.setUint16(parseInt(c.addr,16), parseInt(c.val,16), true);}catch(_){}}); }
setInterval(applyCheats, 100); renderCheats();

// State controls
document.getElementById('btnSave').addEventListener('click',()=>{ if(!gbaCore) return alert('Load a ROM first.'); try{ savedState=gbaCore.inst.saveState?.(); if(savedState){ localStorage.setItem('rayzels.state', JSON.stringify(savedState)); alert('State saved.'); } else alert('This core does not expose saveState in this build.'); }catch{ alert('Could not save state in this build.'); } });
document.getElementById('btnLoad').addEventListener('click',()=>{ if(!gbaCore) return alert('Load a ROM first.'); try{ const ls=localStorage.getItem('rayzels.state'); const src=ls?JSON.parse(ls):savedState; if(!src) return alert('No saved state found.'); gbaCore.inst.loadState?.(src); alert('State loaded.'); }catch{ alert('Could not load state in this build.'); } });
document.getElementById('btnReset').addEventListener('click',()=>{ if(!gbaCore) return; try{ gbaCore.inst.pause?.(); gbaCore.inst.reset?.(); (gbaCore.inst.runStable?.()||gbaCore.inst.run?.()); }catch{} });

// Keyboard
document.addEventListener('keydown', e => setKey(e, true));
document.addEventListener('keyup',   e => setKey(e, false));
function setKey(e, pressed){
  if(!gbaCore) return;
  const map={'ArrowUp':'UP','ArrowDown':'DOWN','ArrowLeft':'LEFT','ArrowRight':'RIGHT','KeyZ':'A','KeyX':'B','KeyA':'L','KeyS':'R','Enter':'START','ShiftRight':'SELECT','ShiftLeft':'SELECT','Escape':'PAUSE'};
  const key=map[e.code]; if(!key) return; e.preventDefault();
  if(key==='PAUSE' && pressed){ toggleOverlay(); return; }
  try{ gbaCore.inst.keys[key]=pressed; }catch{}
  if(pressed) vibrate(8);
}

// Touch controls
document.querySelectorAll('.touch-controls [data-key]').forEach(btn=>{
  const key=btn.getAttribute('data-key');
  ['touchstart','touchend','mousedown','mouseup','mouseleave'].forEach(evt=>{
    btn.addEventListener(evt,(e)=>{ e.preventDefault(); if(!gbaCore) return; const p=(evt==='touchstart'||evt==='mousedown'); try{gbaCore.inst.keys[key]=p;}catch{} if(p) vibrate(10); }, {passive:false});
  });
});

// FPS meter
let frames=0, last=performance.now();
function tick(){ frames++; const now=performance.now(); if(now-last>=1000){ const fps=frames; frames=0; last=now; fpsEl.textContent='FPS: '+fps; batteryFill.style.width=Math.max(0,Math.min(100,Math.round((fps/60)*100)))+'%'; } requestAnimationFrame(tick); }
requestAnimationFrame(tick);

// Overlay
const ovResume=document.getElementById('ovResume');
const ovSave=document.getElementById('ovSave');
const ovLoad=document.getElementById('ovLoad');
const ovReset=document.getElementById('ovReset');
const ovTheme=document.getElementById('ovTheme');
const ovClose=document.getElementById('ovClose');
btnPause.addEventListener('click', toggleOverlay);
ovClose.addEventListener('click', toggleOverlay);
ovResume.addEventListener('click',()=>{ try{ gbaCore?.inst.run?.(); gbaCore?.inst.runStable?.(); }catch{}; toggleOverlay(false); });
ovSave.addEventListener('click',()=>document.getElementById('btnSave').click());
ovLoad.addEventListener('click',()=>document.getElementById('btnLoad').click());
ovReset.addEventListener('click',()=>document.getElementById('btnReset').click());
ovTheme.addEventListener('click',()=>{ const cur=localStorage.getItem('rayzels.theme')||'auto'; const next=cur==='dark'?'light':cur==='light'?'auto':'dark'; localStorage.setItem('rayzels.theme',next); applyTheme(next); });
function toggleOverlay(show){ const willShow=(typeof show==='boolean')?show:overlay.hasAttribute('hidden'); if(willShow){ overlay.removeAttribute('hidden'); try{gbaCore?.inst.pause?.();}catch{} } else { overlay.setAttribute('hidden',''); try{gbaCore?.inst.run?.(); gbaCore?.inst.runStable?.();}catch{} } }
