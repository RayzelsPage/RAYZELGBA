// Deluxe v4.1: robust multi-CDN loader + deluxe UI
const canvas = document.getElementById('gbaScreen');
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
const errorPanel = document.getElementById('errorPanel');
const errorMsg = document.getElementById('errorMsg');

let gbaCore = null; // {type:'gbajs2'|'gbajs1', inst:any}
let savedState = null;
let cheats = JSON.parse(localStorage.getItem('rayzels.cheats') || '[]');
let recents = JSON.parse(localStorage.getItem('rayzels.recents') || '[]'); // [{name, size}]
yearEl.textContent = new Date().getFullYear();

// Splash hide after a moment
window.addEventListener('load', () => setTimeout(()=> splash.classList.add('hidden'), 900));

// Theme toggle
const THEME_KEY = 'rayzels.theme';
const savedTheme = localStorage.getItem(THEME_KEY) || 'auto';
applyTheme(savedTheme);
toggleThemeBtn?.addEventListener('click', () => {
  const next = (localStorage.getItem(THEME_KEY) || 'auto') === 'dark' ? 'light'
             : (localStorage.getItem(THEME_KEY) || 'auto') === 'light' ? 'auto' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});
function applyTheme(mode){
  document.body.classList.remove('theme-dark','theme-light','theme-auto');
  document.body.classList.add(`theme-${mode}`);
}

// Canvas scale
const SCALE_KEY = 'rayzels.scale';
scaleSel.value = localStorage.getItem(SCALE_KEY) || '4';
function applyScale(){
  const s = parseInt(scaleSel.value, 10) || 4;
  canvas.style.width = (240*s) + 'px';
  canvas.style.height = (160*s) + 'px';
  localStorage.setItem(SCALE_KEY, String(s));
}
scaleSel.addEventListener('change', applyScale);
applyScale();

// Helpers
function setStatus(name, statusText="Ready"){
  romMeta.hidden = false;
  romNameEl.textContent = name;
  romStatusEl.textContent = statusText;
  splash.classList.add('hidden');
}
function vibrate(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(_){} }
function addRecent(name, size){
  recents = [{name, size}, ...recents.filter(r => r.name!==name || r.size!==size)].slice(0,6);
  localStorage.setItem('rayzels.recents', JSON.stringify(recents));
  renderRecents();
}
const recentPanel = document.getElementById('recentPanel');
const recentList = document.getElementById('recentList');
const clearRecent = document.getElementById('clearRecent');
function renderRecents(){
  recentList.innerHTML='';
  if(!recents.length){ recentPanel.hidden=true; return; }
  recentPanel.hidden=false;
  recents.forEach(r=>{
    const chip=document.createElement('button');
    chip.className='recent-item'; chip.textContent=`${r.name} • ${Math.round(r.size/1024)} KB`;
    chip.title='Select this ROM again via the file picker';
    chip.addEventListener('click', ()=> romFile.click());
    recentList.appendChild(chip);
  });
}
clearRecent?.addEventListener('click', ()=>{ recents=[]; localStorage.setItem('rayzels.recents','[]'); renderRecents(); });
renderRecents();

// Multi-CDN loader for emulator core
async function loadEmulatorCore(){
  const sources = [
    // Preferred npm dist
    'https://cdn.jsdelivr.net/npm/gbajs@latest/dist/gba.min.js',
    'https://unpkg.com/gbajs@latest/dist/gba.min.js',
    // GitHub mirror (may be rate-limited)
    'https://cdn.jsdelivr.net/gh/endrift/gbajs/gba.min.js'
  ];
  for(const src of sources){
    try{
      await injectScript(src, 8000);
      if(window.GBA || window.GameBoyAdvance){
        console.log('Loaded emulator from', src);
        return true;
      }
    }catch(e){
      console.warn('Failed to load', src, e);
    }
  }
  // As a last attempt, try local file if user self-hosted it:
  try{
    await injectScript('./gba.min.js', 2000);
    if(window.GBA || window.GameBoyAdvance){ console.log('Loaded local gba.min.js'); return true; }
  }catch{}
  errorPanel.style.display='block';
  errorMsg.textContent = 'Could not fetch the emulator from multiple CDNs. This is usually a network/extension block. Use the self‑host instructions below.';
  return false;
}
function injectScript(src, timeoutMs=7000){
  return new Promise((resolve, reject)=>{
    const s=document.createElement('script'); s.src=src; s.async=true; s.onload=resolve; s.onerror=()=>reject(new Error('load error'));
    document.head.appendChild(s);
    setTimeout(()=> reject(new Error('timeout')), timeoutMs);
  });
}

// Ensure core is loaded soon after page load
loadEmulatorCore();

// Boot logic (supports both gbajs flavors)
let currentName = '';
async function bootFromFile(file){
  currentName = file.name;
  addRecent(file.name, file.size);
  // Wait for core if still loading
  if(!window.GBA && !window.GameBoyAdvance){
    const ok = await loadEmulatorCore();
    if(!ok) return;
  }
  if (window.GameBoyAdvance) {
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
  if (window.GBA) {
    try{
      const inst = new window.GBA(canvas);
      inst.loadROM(new Uint8Array(buffer));
      inst.run();
      gbaCore = { type:'gbajs2', inst };
      setStatus(currentName, 'Running');
      return;
    }catch(e){ console.warn('gbajs2 failed', e); }
  }
  errorPanel.style.display='block';
  errorMsg.textContent = 'The emulator script loaded, but did not expose a compatible API. Try a different browser, or self‑host a known-good build (see below).';
}

// Drag & drop / Browse
romDrop.addEventListener('dragover', e => { e.preventDefault(); });
romDrop.addEventListener('drop', async e => {
  e.preventDefault();
  const file = e.dataTransfer.files?.[0];
  if(!file || !file.name.toLowerCase().endsWith('.gba')) return alert("Please drop a .gba file.");
  bootFromFile(file);
});
romFile.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if(!file) return;
  if(!file.name.toLowerCase().endsWith('.gba')) return alert("Please choose a .gba file.");
  bootFromFile(file);
});

// Cheats
function renderCheats(){
  cheatListDiv.innerHTML = '';
  if(!cheats.length){
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.style.padding = '10px';
    empty.textContent = 'No cheats added yet.';
    cheatListDiv.appendChild(empty);
    return;
  }
  cheats.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'cheat-item';
    const left = document.createElement('div');
    left.className = 'cheat-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'cheat-toggle';
    checkbox.checked = c.enabled;
    checkbox.addEventListener('change', () => { c.enabled = checkbox.checked; persistCheats(); });
    const label = document.createElement('div');
    label.textContent = `0x${c.addr.toUpperCase()} = 0x${c.val.toUpperCase()}`;
    left.appendChild(checkbox);
    left.appendChild(label);
    const right = document.createElement('div');
    const rm = document.createElement('button');
    rm.className = 'btn tiny ghost';
    rm.textContent = 'Remove';
    rm.addEventListener('click', () => { cheats.splice(i,1); persistCheats(); renderCheats(); });
    right.appendChild(rm);
    row.appendChild(left);
    row.appendChild(right);
    cheatListDiv.appendChild(row);
  });
}
function persistCheats(){ localStorage.setItem('rayzels.cheats', JSON.stringify(cheats)); }
document.getElementById('btnAddCheat')?.addEventListener('click', () => {
  const addr = document.getElementById('cheatAddress').value.trim();
  const val  = document.getElementById('cheatValue').value.trim();
  if(!addr || !val || !/^[0-9a-fA-F]+$/.test(addr) || !/^[0-9a-fA-F]+$/.test(val)){
    alert('Please enter valid hex for both address and value.'); return;
  }
  cheats.push({ addr: addr.toUpperCase(), val: val.toUpperCase(), enabled: true });
  persistCheats(); renderCheats();
});
// Export/Import cheats
document.getElementById('btnExportCheats')?.addEventListener('click', () => {
  const data = new Blob([JSON.stringify(cheats, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url; a.download = 'rayzels-cheats.json'; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
});
document.getElementById('cheatsFile')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0]; if(!file) return;
  try{
    const text = await file.text();
    const parsed = JSON.parse(text);
    if(!Array.isArray(parsed)) throw new Error('Invalid format');
    cheats = parsed; persistCheats(); renderCheats();
  }catch(err){ alert('Invalid cheats file.'); }
});

function applyCheats(){
  if(!gbaCore) return;
  const inst = gbaCore.inst;
  if(!inst?.memory?.view) return; // only works on modern core
  cheats.forEach(c => {
    if(!c.enabled) return;
    try{
      const address = parseInt(c.addr, 16);
      const value   = parseInt(c.val, 16);
      inst.memory.view.setUint16(address, value, true);
    }catch(e){ /* ignore */ }
  });
}
setInterval(applyCheats, 100);
renderCheats();

// State controls
document.getElementById('btnSave').addEventListener('click', saveState);
document.getElementById('btnLoad').addEventListener('click', loadState);
document.getElementById('btnReset').addEventListener('click', resetCore);
function saveState(){
  if(!gbaCore) return alert('Load a ROM first.');
  try{
    savedState = gbaCore.inst.saveState?.();
    if(savedState){ localStorage.setItem('rayzels.state', JSON.stringify(savedState)); alert('State saved.'); }
    else alert('This core does not expose saveState in this build.');
  }catch(e){ alert('Could not save state in this build.'); }
}
function loadState(){
  if(!gbaCore) return alert('Load a ROM first.');
  try{
    const ls = localStorage.getItem('rayzels.state');
    const src = ls ? JSON.parse(ls) : savedState;
    if(!src) return alert('No saved state found.');
    gbaCore.inst.loadState?.(src);
    alert('State loaded.');
  }catch(e){ alert('Could not load state in this build.'); }
}
function resetCore(){
  if(!gbaCore) return;
  try{
    gbaCore.inst.pause?.(); gbaCore.inst.reset?.(); (gbaCore.inst.runStable?.() || gbaCore.inst.run?.());
  }catch(_){}
}

// Keyboard
document.addEventListener('keydown', e => setKey(e, true));
document.addEventListener('keyup',   e => setKey(e, false));
function setKey(e, pressed){
  if(!gbaCore) return;
  const map = {
    'ArrowUp':'UP', 'ArrowDown':'DOWN', 'ArrowLeft':'LEFT', 'ArrowRight':'RIGHT',
    'KeyZ':'A', 'KeyX':'B', 'KeyA':'L', 'KeyS':'R',
    'Enter':'START', 'ShiftRight':'SELECT', 'ShiftLeft':'SELECT', 'Escape': 'PAUSE'
  };
  const key = map[e.code];
  if(!key) return;
  e.preventDefault();
  if(key==='PAUSE' && pressed){ toggleOverlay(); return; }
  try{ gbaCore.inst.keys[key] = pressed; }catch(_){}
  if(pressed) vibrate(8);
}

// Touch controls + haptics
document.querySelectorAll('.touch-controls [data-key]').forEach(btn => {
  const key = btn.getAttribute('data-key');
  ['touchstart','touchend','mousedown','mouseup','mouseleave'].forEach(evt => {
    btn.addEventListener(evt, (e) => {
      e.preventDefault();
      if(!gbaCore) return;
      const pressed = (evt === 'touchstart' || evt === 'mousedown');
      try{ gbaCore.inst.keys[key] = pressed; }catch(_){}
      if(pressed) vibrate(10);
    }, {passive:false});
  });
});

// FPS meter + perf battery
let frames = 0, lastTime = performance.now();
function tick(){
  frames++;
  const now = performance.now();
  if(now - lastTime >= 1000){
    const fps = frames; frames = 0; lastTime = now;
    fpsEl.textContent = `FPS: ${fps}`;
    const pct = Math.max(0, Math.min(100, Math.round((fps/60)*100)));
    batteryFill.style.width = pct + '%';
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Overlay controls
const ovResume = document.getElementById('ovResume');
const ovSave   = document.getElementById('ovSave');
const ovLoad   = document.getElementById('ovLoad');
const ovReset  = document.getElementById('ovReset');
const ovTheme  = document.getElementById('ovTheme');
const ovClose  = document.getElementById('ovClose');

btnPause.addEventListener('click', toggleOverlay);
ovClose.addEventListener('click', toggleOverlay);
ovResume.addEventListener('click', () => { try{ gbaCore?.inst.run?.(); gbaCore?.inst.runStable?.(); }catch(e){}; toggleOverlay(false); });
ovSave.addEventListener('click', saveState);
ovLoad.addEventListener('click', loadState);
ovReset.addEventListener('click', resetCore);
ovTheme.addEventListener('click', () => {
  const next = (localStorage.getItem('rayzels.theme') || 'auto') === 'dark' ? 'light'
             : (localStorage.getItem('rayzels.theme') || 'auto') === 'light' ? 'auto' : 'dark';
  localStorage.setItem('rayzels.theme', next);
  applyTheme(next);
});

function toggleOverlay(show){
  const willShow = (typeof show === 'boolean') ? show : overlay.hasAttribute('hidden');
  if(willShow){
    overlay.removeAttribute('hidden');
    try{ gbaCore?.inst.pause?.(); }catch(e){}
  }else{
    overlay.setAttribute('hidden','');
    try{ gbaCore?.inst.run?.(); gbaCore?.inst.runStable?.(); }catch(e){}
  }
}
