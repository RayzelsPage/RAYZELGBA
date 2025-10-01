const canvas = document.getElementById('gbaScreen');
const romDrop = document.getElementById('romDrop');
const cheatListDiv = document.getElementById('cheatList');
let gba, savedState = null, cheats = [];

// Drag & drop ROM
romDrop.addEventListener('dragover', e => e.preventDefault());
romDrop.addEventListener('drop', async e => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if(!file || !file.name.endsWith('.gba')) return alert("Please drop a .gba file!");
  const buffer = await file.arrayBuffer();
  gba = new GBA(canvas);
  gba.loadROM(new Uint8Array(buffer));
  gba.run();
  romDrop.textContent = file.name;
});

// Cheats
function addCheat() {
  if(!gba) return alert("Load a ROM first!");
  const addr = parseInt(document.getElementById('cheatAddress').value,16);
  const val = parseInt(document.getElementById('cheatValue').value,16);
  if(isNaN(addr)||isNaN(val)) return alert("Invalid hex values");
  cheats.push({addr,val,enabled:true});
  updateCheatList();
  applyCheats();
}

function updateCheatList(){
  cheatListDiv.innerHTML='';
  cheats.forEach((c,i)=>{
    const div=document.createElement('div');
    div.className='cheatItem';
    const checkbox=document.createElement('input');
    checkbox.type='checkbox'; checkbox.checked=c.enabled;
    checkbox.addEventListener('change',()=>{c.enabled=checkbox.checked; applyCheats();});
    div.appendChild(checkbox);
    div.appendChild(document.createTextNode(`${i+1}: 0x${c.addr.toString(16).toUpperCase()}=0x${c.val.toString(16).toUpperCase()}`));
    const removeBtn=document.createElement('button'); removeBtn.textContent='X';
    removeBtn.onclick=()=>{ cheats.splice(i,1); updateCheatList(); applyCheats();};
    div.appendChild(removeBtn);
    cheatListDiv.appendChild(div);
  });
}

function applyCheats(){ if(!gba)return; cheats.forEach(c=>{ if(c.enabled) gba.memory.view.setUint16(c.addr,c.val,true); }); }

// Save/load state
function saveState(){ if(!gba)return alert("Load a ROM first!"); savedState=gba.saveState(); alert("State saved!"); }
function loadState(){ if(!gba||!savedState)return alert("No saved state found!"); gba.loadState(savedState); applyCheats(); alert("State loaded!"); }

// Keyboard controls
document.addEventListener('keydown',e=>handleKey(e,true));
document.addEventListener('keyup',e=>handleKey(e,false));
function handleKey(e,pressed){
  if(!gba) return;
  switch(e.code){
    case 'ArrowUp': gba.keys.UP=pressed; break;
    case 'ArrowDown': gba.keys.DOWN=pressed; break;
    case 'ArrowLeft': gba.keys.LEFT=pressed; break;
    case 'ArrowRight': gba.keys.RIGHT=pressed; break;
    case 'KeyZ': gba.keys.A=pressed; break;
    case 'KeyX': gba.keys.B=pressed; break;
    case 'KeyA': gba.keys.L=pressed; break;
    case 'KeyS': gba.keys.R=pressed; break;
    case 'Enter': gba.keys.START=pressed; break;
    case 'ShiftRight': gba.keys.SELECT=pressed; break;
  }
  e.preventDefault();
}

// On-screen buttons
const btnMap = {btnA:'A',btnB:'B',btnL:'L',btnR:'R',btnStart:'START',btnSelect:'SELECT'};
for(const id in btnMap){
  const el=document.getElementById(id);
  el.addEventListener('touchstart',()=>{if(gba) gba.keys[btnMap[id]]=true;});
  el.addEventListener('touchend',()=>{if(gba) gba.keys[btnMap[id]]=false;});
}
document.querySelectorAll('#dpad div').forEach(d=>{
  const key = {up:'UP',down:'DOWN',left:'LEFT',right:'RIGHT'}[d.id];
  d.addEventListener('touchstart',()=>{if(gba) gba.keys[key]=true;});
  d.addEventListener('touchend',()=>{if(gba) gba.keys[key]=false;});
});
