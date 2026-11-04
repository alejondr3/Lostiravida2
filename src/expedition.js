import { createGame, step, nearby, outside, OBJECTS, WALLS, salvage } from './expedition-engine.js';

document.body.innerHTML=`<header><strong>LOS TIRA VIDA / 02</strong><span>JUNIOR ASTRONAUT · EXPEDICIÓN 16 BITS</span></header>
<main><div class="topline"><h1>OPERACIÓN: ÚLTIMA LUZ</h1><span class="status" id="status">SEÑAL DE EMERGENCIA</span></div>
<div class="game-shell"><canvas id="world" width="640" height="360" aria-label="Base espacial explorable. Muévete con WASD o flechas y mantén E para interactuar." tabindex="0"></canvas>
<div class="overlay" id="overlay"><span class="tag">SOL 047 · CRÁTER JEZERO · 03:42</span><h2>LA BASE SE APAGÓ.<br>TÚ SIGUES AQUÍ.</h2><p>Una tormenta dañó los sistemas. Recorre el refugio, recupera repuestos y devuelve la energía. Después sal al exterior para pedir extracción.</p><button class="btn" id="start">INICIAR EXPEDICIÓN</button></div>
<div class="hud"><div class="meter"><label>OXÍGENO <span id="o2">100%</span></label><div class="bar"><i id="o2bar"></i></div></div><div class="meter battery"><label>BATERÍA <span id="battery">100%</span></label><div class="bar"><i id="batbar"></i></div></div><div class="counter"><small>REPUESTOS</small><span id="parts">00</span></div><div class="counter"><small>SISTEMAS</small><span id="systems">0 / 4</span></div></div></div>
<div class="brief"><p id="message" role="status" aria-live="polite">RECUPERA REPUESTOS Y RESTAURA EL REACTOR.</p><button class="btn secondary" id="pause">PAUSA</button></div>
<div class="instructions"><span><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> MOVER</span><span><kbd>E</kbd> MANTENER PARA REPARAR</span><span><kbd>SHIFT</kbd> CORRER</span><span><kbd>P</kbd> PAUSA</span><span><kbd>M</kbd> SONIDO</span></div>
<div class="touch-controls"><div class="dpad"><button data-touch="up" aria-label="Arriba">↑</button><button data-touch="left" aria-label="Izquierda">←</button><button data-touch="down" aria-label="Abajo">↓</button><button data-touch="right" aria-label="Derecha">→</button></div><button class="action" data-touch="interact">MANTENER<br>ACCIÓN</button></div></main>
<footer><span>EXPLORA · REPARA · SOBREVIVE</span><a href="https://github.com/alejondr3/Lostiravida2">ARCHIVO DE MISIÓN</a></footer>`;
const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const keys=new Set();let game=createGame(),paused=false,sound=true,last=0,time=0,audio=null,previousParts=0,previousRepairs=0;
const camera={x:160,y:170};
function beep(freq=440){if(!sound)return;try{audio??=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.type='square';o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.13);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.14);}catch{}}
function start(){game=createGame();game.started=true;paused=false;previousParts=0;previousRepairs=0;document.querySelector('#overlay').classList.add('hidden');document.querySelector('#pause').textContent='PAUSA';canvas.focus();beep(660);}
document.querySelector('#start').onclick=start;
function pause(){if(!game.started||game.phase!=='playing')return;paused=!paused;document.querySelector('#pause').textContent=paused?'CONTINUAR':'PAUSA';keys.clear();}
document.querySelector('#pause').onclick=()=>{pause();canvas.focus({preventScroll:true});};
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();keys.add(key);if(!e.repeat&&key==='p')pause();if(!e.repeat&&key==='m'){sound=!sound;game.message=sound?'SONIDO ACTIVADO':'SONIDO DESACTIVADO';}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();if(game.started&&game.phase==='playing'&&!paused)pause();});
document.querySelectorAll('[data-touch]').forEach(b=>{const k={up:'w',down:'s',left:'a',right:'d',interact:'e'}[b.dataset.touch];b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(k);};b.onpointerup=b.onpointercancel=()=>keys.delete(k);});
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function text(s,x,y,color='#d9d6b9',size=7){ctx.fillStyle=color;ctx.font=`bold ${size}px monospace`;ctx.fillText(s,Math.round(x),Math.round(y));}
function line(x,y,x2,y2,color){ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function astronaut(x,y){const walk=keys.has('w')||keys.has('s')||keys.has('a')||keys.has('d')||[...keys].some(k=>k.startsWith('arrow'));const stride=walk&&game.phase==='playing'&&!paused?Math.sin(time*12)*2:0;
  rect(x-9,y+10,18,4,'#141322');rect(x-6,y-10,12,12,'#e8dfca');rect(x-8,y-8,3,9,'#a5adba');rect(x-4,y-7,9,6,'#14283f');rect(x-3,y-7,7,2,'#6dd9df');rect(x-5,y+2,10,9,'#cfcec4');rect(x-7,y+3,2,6,'#dd894d');rect(x+5,y+3,2,6,'#dd894d');rect(x-5,y+11,4,4+stride,'#343e57');rect(x+1,y+11,4,4-stride,'#343e57');rect(x-3,y+4,3,3,'#e39c5b');}
function floor(){for(let y=0;y<640;y+=16)for(let x=0;x<960;x+=16){const n=(x*17+y*31)%137;rect(x,y,16,16,n<40?'#673e40':n<80?'#75454a':'#704147');if(n%7===0)rect(x+4,y+8,3,2,'#94595b');if(n%13===0)rect(x+10,y+2,4,2,'#432d3b');}
  // Rim rocks and craters.
  for(let i=0;i<70;i++){const x=(i*137+23)%960,y=(i*79+19)%640;if(x>175&&x<785&&y>110&&y<525)continue;rect(x,y,14,7,'#3e2938');rect(x+2,y-3,9,5,'#915556');rect(x+3,y-3,6,2,'#aa6a62');}
  // Paths, airlock and cable route to antenna.
  rect(445,490,70,130,'#5e5360');for(let y=500;y<610;y+=16){rect(448,y,6,5,'#e5a65c');rect(503,y,6,5,'#e5a65c');}
  line(745,155,820,155,'#dd9855');line(820,155,830,100,'#dd9855');
  // Three rooms share a continuous middle corridor.
  rect(200,137,558,365,'#1b263b');
  for(let y=144;y<500;y+=16)for(let x=208;x<752;x+=16){rect(x,y,15,15,((x+y)/16)%2===0?'#273449':'#29384d');rect(x,y,15,1,'#34435a');}
  rect(204,267,552,46,'#33465b');for(let x=210;x<750;x+=25){rect(x,270,10,2,'#6993a1');rect(x,308,10,2,'#6993a1');}
  // Industrial room details: cables, benches, shelves.
  for(const x of [216,406,598]){rect(x,151,135,9,'#101d2c');for(let j=0;j<6;j++)rect(x+j*22+5,153,12,3,'#4d7b82');}
  rect(402,380,39,62,'#142338');rect(406,383,31,5,'#6c8590');rect(409,397,25,22,'#143647');rect(414,401,14,3,'#66c5b9');rect(520,380,30,60,'#172339');for(let j=0;j<3;j++){rect(523,385+j*17,24,12,'#536075');rect(527,388+j*17,5,2,'#ad9976');}
  // Four growing beds.
  for(let j=0;j<3;j++){rect(603+j*48,360,35,88,'#182735');rect(605+j*48,362,31,84,'#4b3a3d');for(let k=0;k<5;k++){const px=612+j*48,py=369+k*16;rect(px,py,16,3,'#4c8d62');rect(px+4,py-3,4,12,'#69b97d');rect(px+8,py-4,6,4,'#91ce8a');}}
  // Pipes and floor grates.
  for(let y=330;y<480;y+=12){rect(215,y,17,5,'#132131');rect(217,y,13,1,'#5a7183');}
  for(let y=170;y<470;y+=28){rect(742,y,7,20,'#121e30');rect(743,y,2,20,'#7a91a1');}
  for(const w of WALLS){rect(w.x,w.y,w.w,w.h,'#101a2e');rect(w.x,w.y,w.w,3,'#8795a3');rect(w.x,w.y+4,w.w,2,'#475e76');}
  text('01 / ENERGÍA',238,175,'#bdbfb4',8);text('02 / CONTROL',429,162,'#bdbfb4',8);text('03 / CULTIVOS',616,175,'#bdbfb4',8);
  text('ESCLUSA',457,487,'#e9bc75',7);
}
function machine(o){const x=o.x,y=o.y,on=game.repaired.includes(o.id),c=on?'#79db9c':'#ef865c';
  if(o.kind==='reactor'){rect(x-27,y-14,54,43,'#101c30');rect(x-23,y-20,46,43,'#64718a');rect(x-16,y-14,32,29,'#213448');rect(x-10,y-10,20,20,on?'#559c85':'#6d3c49');for(let i=0;i<3;i++)rect(x-7,y-7+i*6,14,2,c);rect(x-25,y+24,50,5,'#101c30');}
  if(o.kind==='oxygen'){for(let i=-1;i<=1;i++){rect(x-24+i*18,y-17,14,36,'#6c95a1');rect(x-22+i*18,y-12,4,24,'#96b9bc');rect(x-20+i*18,y-18,6,4,c);}rect(x-30,y+20,58,5,'#132239');}
  if(o.kind==='garden'){rect(x-28,y-18,56,37,'#152839');rect(x-24,y-14,48,25,'#335466');for(let i=0;i<4;i++)rect(x-20+i*12,y-10,6,17,c);rect(x-22,y+14,44,4,'#7f95a0');}
  if(o.kind==='locker'){rect(x-24,y-18,48,37,'#d3c8a3');rect(x-20,y-14,40,29,'#596576');rect(x-5,y-10,10,21,'#b7dbbe');rect(x-11,y-4,22,8,'#b7dbbe');}
  if(o.kind==='antenna'){rect(x-3,y-2,6,42,'#8a9bad');rect(x-18,y+34,36,5,'#293a50');for(let i=0;i<24;i++){rect(x-24+i,y-16+i*.6,48-i*2,3,'#b9c5c8');}line(x,y,x+19,y-26,'#f0a16b');rect(x+17,y-28,5,5,c);if(on){for(let k=0;k<3;k++){const r=8+((time*12+k*10)%30);ctx.strokeStyle='#7bedb366';ctx.beginPath();ctx.arc(x+19,y-26,r,-2.5,-.7);ctx.stroke();}}}
  if(o.kind==='lander'){rect(x-30,y-15,60,38,'#26394d');rect(x-22,y-26,44,39,'#c7c0b0');rect(x-14,y-22,28,15,'#24455d');rect(x-10,y-20,20,4,'#79ccd7');rect(x-27,y+12,8,16,'#a0acb2');rect(x+19,y+12,8,16,'#a0acb2');rect(x-37,y+25,25,4,'#233148');rect(x+12,y+25,25,4,'#233148');}
  const pulse=Math.floor(time*3)%2;rect(x+23,y-18,4,4,on?'#7bedb3':pulse?'#ed805b':'#632f3e');
}
function render(){const p=game.player;camera.x+=((p.x-320)-camera.x)*.08;camera.y+=((p.y-180)-camera.y)*.08;camera.x=Math.max(0,Math.min(320,camera.x));camera.y=Math.max(0,Math.min(280,camera.y));
  ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));floor();OBJECTS.forEach(machine);
  salvage().forEach(([x,y],i)=>{if(game.collected.includes(i))return;const bob=Math.sin(time*4+i)*2;rect(x-6,y-3+bob,12,8,'#132333');rect(x-5,y-5+bob,10,7,'#e1ab60');rect(x-2,y-4+bob,4,5,'#ffe4a0');if(Math.sin(time*4+i)>.3){rect(x-11,y-10,1,5,'#ffedbe');rect(x-13,y-8,5,1,'#ffedbe');}});
  astronaut(p.x,p.y);
  const obj=nearby(game);if(obj){text(obj.label,p.x-40,p.y-36,'#ffdd9d',7);const done=game.repaired.includes(obj.id);text(done?'SISTEMA OPERATIVO':obj.id==='locker'?'[E] RECARGAR':`[E] MANTENER · ${obj.cost} PIEZAS`,p.x-52,p.y-25,done?'#7bedb3':'#e6e0c9',6);
    if(game.progress>0){rect(p.x-25,p.y-20,50,5,'#101b2b');rect(p.x-24,p.y-19,48*game.progress/obj.seconds,3,'#7bedb3');}}
  ctx.restore();
  // Dust crossing the view, with higher density during the exterior storm.
  if(outside(game)||game.storm){ctx.globalAlpha=game.storm?.55:.17;for(let i=0;i<(game.storm?100:25);i++){const x=((i*83-time*(game.storm?140:30))%660+660)%660;const y=(i*53+time*4)%360;rect(x,y,game.storm?9:3,1,'#d5a28d');}ctx.globalAlpha=1;}
  const shade=ctx.createRadialGradient(320,180,90,320,180,380);shade.addColorStop(0,'#00000000');shade.addColorStop(1,'#05091c99');ctx.fillStyle=shade;ctx.fillRect(0,0,640,360);
  rect(10,10,205,35,'#0a1427dc');text('OBJETIVO DE EXPEDICIÓN',18,23,'#e2a56c',7);
  const objective=!game.repaired.includes('reactor')?'REACTOR · BUSCA 2 REPUESTOS':!game.repaired.includes('oxygen')?'REPARA EL RECICLADOR O2':!game.repaired.includes('garden')?'RESTAURA LOS CULTIVOS':!game.repaired.includes('antenna')?'SAL AL EXTERIOR · REPARA ANTENA':'REGRESA AL MÓDULO · DESPEGA';text(objective,18,36,'#e2deca',7);
  text(`${outside(game)?'EXTERIOR / EVA':'INTERIOR / REFUGIO'}${game.storm?' · TORMENTA':''}`,400,20,game.storm?'#ef865c':'#91b1bb',7);
  // Mini map.
  rect(553,279,77,70,'#0a1427dd');rect(571,293,43,36,'#3a5266');rect(585,293,1,36,'#738d9e');rect(600,293,1,36,'#738d9e');rect(556+p.x/960*70,283+p.y/640*60,3,3,'#ffe09b');text('MAPA',572,344,'#91b1bb',6);
  if(paused){rect(0,0,640,360,'#071020b0');text('EN PAUSA',255,180,'#ffe09b',16);}
}
let lastMessage='';
function updateHud(){document.querySelector('#o2').textContent=`${Math.ceil(game.oxygen)}%`;document.querySelector('#o2bar').style.width=`${game.oxygen}%`;document.querySelector('#o2bar').style.background=game.oxygen<25?'#ed805b':'#7bedb3';document.querySelector('#battery').textContent=`${Math.ceil(game.battery)}%`;document.querySelector('#batbar').style.width=`${game.battery}%`;document.querySelector('#parts').textContent=String(game.parts).padStart(2,'0');document.querySelector('#systems').textContent=`${game.repaired.filter(id=>id!=='lander').length} / 4`;
  if(game.message!==lastMessage){document.querySelector('#message').textContent=game.message;lastMessage=game.message;}
  document.querySelector('#status').textContent=game.storm?'TORMENTA DE POLVO':game.repaired.includes('antenna')?'EXTRACCIÓN AUTORIZADA':'SEÑAL DE EMERGENCIA';
}
function finish(){const overlay=document.querySelector('#overlay');if(!overlay.classList.contains('hidden'))return;const won=game.phase==='won';const seconds=Math.floor(game.elapsed);overlay.innerHTML=`<span class="tag">EXPEDICIÓN ${won?'COMPLETADA':'INTERRUMPIDA'}</span><h2>${won?'VOLVISTE A CASA.':'SIN OXÍGENO.'}</h2><p>${won?`Los cuatro sistemas están restaurados. Tiempo de misión: ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}. Recuperaste ${game.collected.length} repuestos.`:'Recarga en la taquilla de Control. Repara el reciclador para recuperar oxígeno dentro del refugio y prepara la salida al exterior.'}</p><button class="btn" id="retry">NUEVA EXPEDICIÓN</button>`;overlay.classList.remove('hidden');document.querySelector('#retry').onclick=start;beep(won?880:150);}
function frame(now){const dt=(now-last)/1000||0;last=now;time=now/1000;if(!paused){step(game,{dx:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy:Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')),interact:keys.has('e'),sprint:keys.has('shift')},dt);}
  if(game.collected.length>previousParts){previousParts=game.collected.length;beep(740);}if(game.repaired.length>previousRepairs){previousRepairs=game.repaired.length;beep(980);}render();updateHud();if(game.phase!=='playing')finish();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
