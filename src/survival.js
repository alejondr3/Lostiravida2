import {TILE,BASE,BLOCK,MATERIALS,RECIPES,createSurvival,tick,getTile,nearBench,nearTank,inBase,craft,canAfford,mineTile,placeTile,currentObjective,serialize,restore} from './survival-engine.js';
import {SurvivalRenderer} from './survival-renderer.js';
import {Soundtrack} from './soundtrack.js';

const SAVE='lostiravida.mars.v2',SETTINGS='lostiravida.audio.v1';
const music=new Soundtrack();let settings={volume:.22};try{settings=JSON.parse(localStorage.getItem(SETTINGS))||settings;}catch{}
music.setVolume(Number(settings.volume)||0);let game=null,screen='orbit',loadout='engineer',tool='mine',modal=null,keys=new Set(),pointer=null,pointerDown=false,pointerBuild=false,last=0,time=0,autosave=0,lastAlert=0,placeTimer=0,uiTimer=0;
let saved=null;try{saved=restore(localStorage.getItem(SAVE));if(saved?.phase!=='playing')saved=null;}catch{}
document.body.innerHTML=`<header class="masthead"><strong>LOS TIRA VIDA / 02</strong><small>JUNIOR ASTRONAUT · PROGRAMA DE EXPEDICIONES</small><div class="music-controls"><button class="tiny" id="mute" aria-label="Silenciar música">♫ MÚSICA</button><label for="volume">VOLUMEN</label><input id="volume" type="range" min="0" max="100" value="${Math.round(music.volume*100)}" aria-label="Volumen de música" /></div></header>
<main id="app"></main><footer class="page-footer"><span>EXPLORA · CONSTRUYE · SOBREVIVE</span><span>MÚSICA ORIGINAL · PIXEL ART · EN ESPAÑOL</span></footer>`;
document.querySelector('#mute').onclick=async()=>{await music.start();const muted=music.toggle();document.querySelector('#mute').textContent=muted?'♫ SILENCIO':'♫ MÚSICA';document.querySelector('#mute').setAttribute('aria-label',muted?'Activar música':'Silenciar música');};
document.querySelector('#volume').oninput=e=>{music.setVolume(Number(e.target.value)/100);try{localStorage.setItem(SETTINGS,JSON.stringify({volume:music.volume}));}catch{}};
const app=document.querySelector('#app');let renderer=null,canvas=null;
function renderOrbit(){screen='orbit';modal=null;pointerDown=false;keys.clear();music.modeTo('orbit');
  app.innerHTML=`<section class="orbit"><div class="orbit-hero"><div><p class="eyebrow">ESTACIÓN ORBITAL / CONTROL DE MISIÓN</p><h1>UN PLANETA HOSTIL.<br><span>TU PRIMER REFUGIO.</span></h1><p class="body-copy">Baja a Marte. Excava sus cuevas, consigue materiales y construye para sobrevivir. Tu entrenamiento termina cuando logres volver a casa.</p><div class="launch-options" role="group" aria-label="Equipo de expedición"><button class="loadout ${loadout==='engineer'?'selected':''}" data-loadout="engineer" aria-pressed="${loadout==='engineer'}"><strong>INGENIERÍA</strong><span>25 bloques de regolito para empezar a construir.</span></button><button class="loadout ${loadout==='scout'?'selected':''}" data-loadout="scout" aria-pressed="${loadout==='scout'}"><strong>EXPLORACIÓN</strong><span>12 bloques. Un comienzo con menos suministros.</span></button></div><div class="launch-actions"><button class="btn" id="launch">INICIAR DESCENSO ↓</button>${saved?'<button class="btn secondary" id="resume">CONTINUAR</button>':''}</div><p class="orbital-hint">Guardado automático local · 1 jugador · Mundo de bloques explorable</p></div><canvas class="pixel-scene" id="orbit-canvas" width="960" height="540" aria-label="Estación orbital sobre Marte en pixel art"></canvas></div><div class="mission-plan"><div><strong><b>01</b> EXCAVA</strong>Busca vetas de hierro, cobre y hielo bajo la superficie.</div><div><strong><b>02</b> FABRICA</strong>Restaura tu refugio y mejora el equipo en el banco.</div><div><strong><b>03</b> RESISTE</strong>Construye protección contra polvo, radiación e impactos.</div><div><strong><b>04</b> REGRESA</strong>Reconecta la antena y vuelve al módulo de ascenso.</div></div></section>`;
  canvas=document.querySelector('#orbit-canvas');renderer=new SurvivalRenderer(canvas);
  document.querySelectorAll('[data-loadout]').forEach(b=>b.onclick=()=>{loadout=b.dataset.loadout;renderOrbit();});
  document.querySelector('#launch').onclick=()=>{if(saved)showLaunchConfirm();else begin(false);};
  document.querySelector('#resume')?.addEventListener('click',()=>begin(true));
}
function showLaunchConfirm(){
  const wrap=document.createElement('div');wrap.className='shade';wrap.style.position='fixed';wrap.innerHTML='<section class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">NUEVA EXPEDICIÓN</h2><p>Esto reemplaza la expedición guardada en este navegador.</p><div class="launch-actions"><button class="btn" id="confirm-launch">COMENZAR DE NUEVO</button><button class="btn secondary" id="cancel-launch">CANCELAR</button></div></section>';document.body.append(wrap);
  document.querySelector('#confirm-launch').onclick=()=>{wrap.remove();begin(false);};document.querySelector('#cancel-launch').onclick=()=>wrap.remove();document.querySelector('#cancel-launch').focus();
}
async function begin(resume){
  game=resume&&saved?saved:createSurvival(47,loadout);screen='game';modal=null;keys.clear();pointer=null;pointerDown=false;lastAlert=game.eventNumber;autosave=0;tool='mine';
  app.innerHTML=`<section class="game-view"><div class="mission-title"><h1>MARTE / REFUGIO JEZERO</h1><span id="mission-time">EXPEDICIÓN 047</span></div><div class="viewport"><canvas class="world" id="world" width="960" height="540" tabindex="0" aria-label="Mundo lateral de Marte: usa WASD para moverte, espacio para saltar y el ratón para excavar o construir."></canvas><div class="hud">${meter('oxygen','OXÍGENO')}${meter('energy','ENERGÍA')}${meter('health','SALUD')}${meter('temp','TEMPERATURA')}</div><div class="shade hidden" id="shade"></div></div><div class="inventory" id="inventory"></div><div class="game-bottom"><div><p class="mission-message" id="message" role="status" aria-live="polite"></p><div class="controls"><span><kbd>A D</kbd> / <kbd>← →</kbd> MOVER</span><span><kbd>ESPACIO</kbd> SALTAR</span><span><kbd>CLIC</kbd> EXCAVAR · <kbd>2</kbd> CONSTRUIR</span><span><kbd>E</kbd> INTERACTUAR</span><span><kbd>SHIFT</kbd> CORRER</span></div></div><div class="toolbar"><button class="tiny" id="tool">1 / TALADRO</button><button class="tiny" id="fabricate">FABRICAR [C]</button><button class="tiny" id="mission">MISIÓN [J]</button><button class="tiny" id="pause">PAUSA [P]</button></div></div><div class="touch"><div><button data-key="a" aria-label="Mover a la izquierda">◀</button><button data-key="d" aria-label="Mover a la derecha">▶</button><button data-key=" " aria-label="Saltar">↑</button></div><div><button data-key="f">PICAR</button><button data-key="b">BLOQUE</button><button data-key="e">E</button></div></div><p class="save-status" id="save-status">Guardado local automático cada 10 segundos.</p></section>`;
  canvas=document.querySelector('#world');renderer=new SurvivalRenderer(canvas);
  canvas.addEventListener('pointermove',e=>{pointer=renderer.tileAt(e.clientX,e.clientY);});
  canvas.addEventListener('pointerdown',e=>{if(modal)return;e.preventDefault();canvas.focus({preventScroll:true});pointer=renderer.tileAt(e.clientX,e.clientY);canvas.setPointerCapture(e.pointerId);pointerDown=e.button===0;pointerBuild=e.button===2;});
  canvas.addEventListener('pointerup',()=>{pointerDown=false;pointerBuild=false;game.mine=null;});
  canvas.addEventListener('pointercancel',()=>{pointerDown=false;pointerBuild=false;game.mine=null;});
  canvas.oncontextmenu=e=>e.preventDefault();
  document.querySelector('#tool').onclick=()=>changeTool(tool==='mine'?'build':'mine');
  document.querySelector('#fabricate').onclick=()=>openModal('craft');document.querySelector('#mission').onclick=()=>openModal('mission');document.querySelector('#pause').onclick=()=>openModal('pause');
  document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);});
  canvas.focus({preventScroll:true});window.scrollTo(0,0);save();updateUI();await music.start();music.modeTo('explore');
}
function meter(id,label){return `<div class="meter ${id}"><label>${label}<span id="${id}-value"></span></label><div class="bar"><i id="${id}-bar"></i></div></div>`;}
function changeTool(next){tool=next;if(game)game.mine=null;const b=document.querySelector('#tool');if(b)b.textContent=tool==='mine'?'1 / TALADRO':'2 / BLOQUES';}
function save(){if(!game||game.phase!=='playing')return;try{localStorage.setItem(SAVE,serialize(game));saved=restore(serialize(game));const el=document.querySelector('#save-status');if(el)el.textContent=`Expedición guardada · ${new Date().toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}`;}catch{const el=document.querySelector('#save-status');if(el)el.textContent='El navegador no permitió guardar. La partida sigue en memoria.';}}
function updateUI(){if(!game||screen!=='game')return;
  for(const [id,value] of [['oxygen',game.oxygen],['energy',game.energy],['health',game.health],['temp',game.temperature]]){const el=document.querySelector(`#${id}-value`);el.textContent=id==='temp'?`${Math.round(value)} °C`:`${Math.ceil(value)}%`;const bar=document.querySelector(`#${id}-bar`);bar.style.width=`${id==='temp'?Math.max(5,Math.min(100,(value+60)/90*100)):value}%`;if(id==='oxygen')bar.style.background=value<25?'#ed817c':'#83d9bb';}
  const colors={soil:'#ba7e64',iron:'#b3b6b0',copper:'#e3a16c',ice:'#9ddae4',crystal:'#bb95df'};
  document.querySelector('#inventory').innerHTML=Object.entries(game.inventory).map(([id,n])=>`<span class="item"><i class="swatch" style="background:${colors[id]}"></i>${MATERIALS[id]} <b>${n}</b></span>`).join('');
  const msg=document.querySelector('#message');if(msg.textContent!==game.message)msg.textContent=game.message;
  document.querySelector('#mission-time').textContent=`${inBase(game)?'EN REFUGIO':'EN EXPEDICIÓN'} · ${game.event?'ALERTA ACTIVA':'SEÑAL ESTABLE'}`;
}
function closeModal(){modal=null;document.querySelector('#shade')?.classList.add('hidden');keys.clear();pointerDown=false;pointerBuild=false;canvas?.focus({preventScroll:true});music.resume();}
function openModal(kind){if(screen!=='game')return;modal=kind;keys.clear();pointerDown=false;pointerBuild=false;game.mine=null;const shade=document.querySelector('#shade');shade.classList.remove('hidden');
  if(kind==='craft'){
    shade.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="row"><h2 id="dialog-title">BANCO DE FABRICACIÓN</h2><button class="close" aria-label="Cerrar">×</button></div><p>${nearBench(game)?'Banco conectado. Selecciona un plano.':'Debes estar junto al banco del refugio para fabricar. Puedes consultar los planos desde aquí.'}</p><div class="recipes">${RECIPES.map(r=>`<article class="recipe"><div><h3>${r.name}${game.crafted[r.id]?' ✓':''}</h3><p>${r.detail}</p><span class="cost">${Object.entries(r.cost).map(([k,n])=>`${MATERIALS[k]} ${game.inventory[k]}/${n}`).join(' · ')}</span></div><button data-craft="${r.id}" ${!nearBench(game)||!canAfford(game,r.cost)||game.crafted[r.id]?'disabled':''}>${game.crafted[r.id]?'INSTALADO':'FABRICAR'}</button></article>`).join('')}</div></section>`;
    shade.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>{const result=craft(game,b.dataset.craft);if(result.ok){music.effect('craft');save();}openModal('craft');updateUI();});
  }else if(kind==='mission'){
    const obj=currentObjective(game);shade.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="row"><h2 id="dialog-title">REGISTRO DE EXPEDICIÓN</h2><button class="close" aria-label="Cerrar">×</button></div><p><strong>${obj.title}</strong><br>${obj.text}</p><div class="checklist">${[['filter','Restaurar el aire del refugio'],['drill','Mejorar el taladro'],['relay','Fabricar el transmisor']].map(([id,label])=>`<span class="${game.crafted[id]?'done':''}">${game.crafted[id]?'[✓]':'[ ]'} ${label}</span>`).join('')}<span class="${game.relayInstalled?'done':''}">${game.relayInstalled?'[✓]':'[ ]'} Instalar transmisor en la meseta este</span></div><p>El traje pierde oxígeno fuera del refugio. Mantén E en la estación de recarga. Construye con regolito para subir, bajar y cubrirte de radiación y micrometeoritos.</p><p>Vetas: hierro gris, cobre naranja, hielo celeste y cristal violeta. El cristal necesita el taladro mejorado.</p>${game.log.slice(0,6).map(e=>`<div class="log-entry ${e.tone}">${Math.floor(e.time)}s · ${e.text}</div>`).join('')}</section>`;
  }else if(kind==='pause'){
    save();shade.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">EXPEDICIÓN EN PAUSA</h2><p>El tiempo, el oxígeno y los eventos están detenidos.</p><div class="launch-actions"><button class="btn" id="continue">CONTINUAR</button><button class="btn secondary" id="return-orbit">VOLVER A ÓRBITA</button></div></section>`;
    document.querySelector('#continue').onclick=closeModal;document.querySelector('#return-orbit').onclick=()=>{save();renderOrbit();};
  }else if(kind==='won'||kind==='lost'){
    const won=kind==='won';music.modeTo(won?'victory':'orbit');
    shade.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><p class="eyebrow">${won?'EXTRACCIÓN COMPLETADA':'TELEMETRÍA PERDIDA'}</p><h2 id="dialog-title">${won?'BIENVENIDO A CASA.':'FIN DE LA EXPEDICIÓN.'}</h2><p>${won?'Construiste una ruta segura, restauraste el refugio y recuperaste la señal. Entrenamiento completado.':'El traje no pudo mantenerte con vida. Recarga antes de salir, prepara refugios y lleva suministros para el camino.'}</p><p>Tiempo: ${Math.floor(game.elapsed/60)} min ${Math.floor(game.elapsed%60)} s · Bloques recuperados: ${game.samples} · Eventos: ${game.eventHistory.length}</p><div class="launch-actions"><button class="btn" id="debrief">VOLVER A ÓRBITA</button>${!won&&saved?'<button class="btn secondary" id="checkpoint">CARGAR GUARDADO</button>':''}</div></section>`;
    if(won){saved=null;try{localStorage.removeItem(SAVE);}catch{}}document.querySelector('#debrief').onclick=renderOrbit;document.querySelector('#checkpoint')?.addEventListener('click',()=>begin(true));
  }
  shade.querySelector('.close')?.addEventListener('click',closeModal);shade.querySelector('button')?.focus();
}
window.addEventListener('keydown',e=>{
  if(screen!=='game'||e.target instanceof HTMLInputElement)return;
  if(e.ctrlKey||e.altKey||e.metaKey)return;
  const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
  if(modal){if(!e.repeat&&(k==='escape'||k==='p')&&game.phase==='playing')closeModal();return;}
  keys.add(k);if(e.repeat)return;
  if(k==='p'||k==='escape')openModal('pause');if(k==='c')openModal('craft');if(k==='j')openModal('mission');
  if(k==='1')changeTool('mine');if(k==='2')changeTool('build');
  if(k==='e'&&nearBench(game)&&!nearTank(game))openModal('craft');
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();pointerDown=false;pointerBuild=false;if(screen==='game'&&!modal&&game.phase==='playing')openModal('pause');});
document.addEventListener('visibilitychange',()=>{if(document.hidden)music.suspend();else if(!modal)music.resume();});
window.addEventListener('beforeunload',save);
function autoTarget(){const p=game.player;let tx=Math.floor((p.x+p.facing*17)/TILE),ty=Math.floor((p.y-6)/TILE);if(!getTile(game,tx,ty))ty=Math.floor((p.y+3)/TILE);return {x:tx,y:ty};}
function frame(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;time=now/1000;
  if(screen==='orbit'){renderer.drawOrbit(time);}
  else if(game){
    if(!modal){const interact=keys.has('e');
      if(interact&&nearBench(game)&&!nearTank(game)){openModal('craft');}
      else{
        tick(game,{dx:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),jump:keys.has(' ')||keys.has('w')||keys.has('arrowup'),sprint:keys.has('shift'),interact},dt);
        const target=keys.has('b')?{x:Math.floor((game.player.x+game.player.facing*18)/TILE),y:Math.floor((game.player.y-8)/TILE)}:keys.has('f')?autoTarget():pointer;
        if(target&&((pointerDown&&tool==='mine')||keys.has('f'))){if(mineTile(game,target.x,target.y,dt))music.effect('mine');}else game.mine=null;
        placeTimer-=dt;if(target&&placeTimer<=0&&((pointerDown&&tool==='build')||pointerBuild||keys.has('b'))){if(placeTile(game,target.x,target.y)){music.effect('place');}placeTimer=.2;}
        if(game.eventNumber>lastAlert){lastAlert=game.eventNumber;music.effect('alert');}music.modeTo(game.event?'danger':'explore');
        autosave+=dt;if(autosave>10){autosave=0;save();}
        if(game.phase!=='playing')openModal(game.phase==='won'?'won':'lost');
      }
    }
    renderer.drawWorld(game,modal?0:dt,pointer,tool);uiTimer+=dt;if(uiTimer>.15){uiTimer=0;updateUI();}
  }
  requestAnimationFrame(frame);
}
renderOrbit();requestAnimationFrame(frame);
