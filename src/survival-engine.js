// Deterministic, renderer-independent rules for the first Mars expedition.
export const TILE=16, COLS=180, ROWS=68;
export const BLOCK={AIR:0,SOIL:1,ROCK:2,IRON:3,COPPER:4,ICE:5,CRYSTAL:6,HULL:7,DOOR:8};
export const MATERIALS={soil:'Regolito',iron:'Hierro',copper:'Cobre',ice:'Hielo',crystal:'Cristal'};
export const BASE={left:12,right:30,top:18,bottom:28};
export const RECIPES=[
  {id:'filter',name:'Reciclador de oxígeno',detail:'Restaura aire y temperatura en el refugio.',cost:{iron:4,copper:2,ice:3}},
  {id:'drill',name:'Taladro mejorado',detail:'Excava el doble de rápido; alcanza los cristales.',cost:{iron:5,copper:3}},
  {id:'battery',name:'Batería de reserva',detail:'Recupera 65 de energía del traje. Consumible.',cost:{copper:2,crystal:1}},
  {id:'tank',name:'Carga de oxígeno',detail:'Recupera 65 de oxígeno. Consumible.',cost:{ice:3,iron:1}},
  {id:'relay',name:'Transmisor de rescate',detail:'Llévalo a la antena de la meseta este.',cost:{iron:6,copper:5,crystal:3}},
];
export function rng(seed){let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function generateWorld(seed=47){
  const random=rng(seed), tiles=new Uint8Array(COLS*ROWS),surface=[];
  for(let x=0;x<COLS;x++){
    let h=Math.round(29+Math.sin(x*.09)*3+Math.sin(x*.27)*2);
    if(x>=10&&x<=34)h=28;
    surface[x]=h;
    for(let y=h;y<ROWS;y++){
      const cave=y>h+6&&y<ROWS-3&&(Math.sin(x*.23+y*.19)+Math.cos(x*.13-y*.31)>1.08);
      tiles[y*COLS+x]=cave?0:y<h+4?BLOCK.SOIL:BLOCK.ROCK;
    }
  }
  const vein=(x,y,type,size)=>{for(let j=-size;j<=size;j++)for(let i=-size;i<=size;i++)if(Math.abs(i)+Math.abs(j)<=size&&x+i>1&&x+i<COLS-1&&y+j<ROWS-1)tiles[(y+j)*COLS+x+i]=type;};
  for(let i=0;i<170;i++){
    const x=3+Math.floor(random()*(COLS-6)),y=surface[x]+2+Math.floor(random()*26);
    vein(x,y,i%7===0?BLOCK.CRYSTAL:i%4===0?BLOCK.ICE:i%3===0?BLOCK.COPPER:BLOCK.IRON,1+Math.floor(random()*2));
  }
  // Guaranteed near-surface deposits ensure every seed has a viable opening.
  for(const [x,type,size] of [[37,3,2],[43,4,2],[49,5,2],[57,3,2],[63,4,2],[72,6,2],[86,6,2]])vein(x,surface[x]+2,type,size);
  for(let y=BASE.top;y<=BASE.bottom;y++)for(let x=BASE.left;x<=BASE.right;x++){
    tiles[y*COLS+x]=y===BASE.top||y===BASE.bottom||x===BASE.left||x===BASE.right?BLOCK.HULL:0;
  }
  for(const x of [BASE.left,BASE.right])for(let y=BASE.bottom-3;y<BASE.bottom;y++)tiles[y*COLS+x]=BLOCK.DOOR;
  for(let x=0;x<COLS;x++)tiles[(ROWS-1)*COLS+x]=BLOCK.HULL;
  return {tiles,surface,seed};
}
export function getTile(g,x,y){if(x<0||x>=COLS||y<0||y>=ROWS)return BLOCK.HULL;return g.world.tiles[y*COLS+x];}
export function solid(tile){return tile!==BLOCK.AIR&&tile!==BLOCK.DOOR;}
export function tileSolid(g,x,y){return solid(getTile(g,x,y));}
export function inBase(g){const p=g.player;return p.x>(BASE.left+1)*TILE&&p.x<BASE.right*TILE&&p.y>BASE.top*TILE&&p.y<=BASE.bottom*TILE+1;}
export function roofed(g){const x=Math.floor(g.player.x/TILE),y=Math.floor(g.player.y/TILE);for(let i=1;i<=7;i++)if(tileSolid(g,x,y-i))return true;return false;}
export function createSurvival(seed=47,loadout='engineer'){
  return {version:2,world:generateWorld(seed),player:{x:22*TILE,y:26*TILE,vx:0,vy:0,facing:1,grounded:false},
    oxygen:100,energy:100,health:100,temperature:22,inventory:{soil:loadout==='engineer'?25:12,iron:0,copper:0,ice:0,crystal:0},
    crafted:{filter:false,drill:false,relay:false},elapsed:0,event:null,eventNumber:0,eventHistory:[],nextEvent:95,
    phase:'playing',mine:null,log:[],message:'Sal por la esclusa del este. Busca hierro, cobre y hielo.',relayInstalled:false,
    samples:0,visitedEast:false,loadout,distance:0,manualPause:false};
}
export function notify(g,text,tone='info'){g.message=text;g.log.unshift({text,tone,time:g.elapsed});g.log=g.log.slice(0,20);}
export function nearBench(g){return Math.hypot(g.player.x-21*TILE,g.player.y-26*TILE)<75&&inBase(g);}
export function nearTank(g){return Math.hypot(g.player.x-16*TILE,g.player.y-26*TILE)<48&&inBase(g);}
export function canAfford(g,cost){return Object.entries(cost).every(([key,n])=>g.inventory[key]>=n);}
export function craft(g,id){
  const recipe=RECIPES.find(r=>r.id===id);if(!recipe)return {ok:false,reason:'Plano desconocido.'};
  if(!nearBench(g))return {ok:false,reason:'Acércate al banco del refugio para fabricar.'};
  if(g.crafted[id])return {ok:false,reason:'Este equipo ya está instalado.'};
  if(!canAfford(g,recipe.cost))return {ok:false,reason:'Te faltan materiales para este plano.'};
  for(const [key,n] of Object.entries(recipe.cost))g.inventory[key]-=n;
  if(id==='battery')g.energy=Math.min(100,g.energy+65);
  else if(id==='tank')g.oxygen=Math.min(100,g.oxygen+65);
  else g.crafted[id]=true;
  notify(g,`${recipe.name}: ${id==='battery'||id==='tank'?'carga utilizada':'operativo'}.`,'success');return {ok:true};
}
function overlaps(g,x,y){const w=5,h=13;for(let ty=Math.floor((y-h)/TILE);ty<=Math.floor((y-1)/TILE);ty++)for(let tx=Math.floor((x-w)/TILE);tx<=Math.floor((x+w)/TILE);tx++)if(tileSolid(g,tx,ty))return true;return false;}
export function movePlayer(g,input,dt){
  const p=g.player,speed=input.sprint&&g.energy>1?104:70;
  p.vx=input.dx*speed;if(input.dx)p.facing=Math.sign(input.dx);
  if(input.jump&&p.grounded){p.vy=-155;p.grounded=false;}
  p.vy=Math.min(225,p.vy+300*dt);
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(p.vx*dt),Math.abs(p.vy*dt))/3));
  for(let s=0;s<steps;s++){
    const nx=p.x+p.vx*dt/steps;if(!overlaps(g,nx,p.y))p.x=nx;
    const ny=p.y+p.vy*dt/steps;
    if(!overlaps(g,p.x,ny)){p.y=ny;p.grounded=false;}
    else{if(p.vy>0){p.grounded=true;if(p.vy>205){g.health=Math.max(0,g.health-12);notify(g,'Caída fuerte: usa escalones de regolito para descender.','warning');}}p.vy=0;}
  }
  p.x=Math.max(TILE,Math.min((COLS-1)*TILE,p.x));p.y=Math.max(16,p.y);
  if(input.sprint&&input.dx)g.energy=Math.max(0,g.energy-dt*1.2);
  g.distance=Math.max(g.distance,p.x/TILE);
}
export function reachable(g,tx,ty){
  const px=g.player.x,py=g.player.y-7,ex=(tx+.5)*TILE,ey=(ty+.5)*TILE;
  if(Math.hypot(px-ex,py-ey)>62)return false;
  // A tool cannot drill or build through an intact intervening wall.
  const steps=Math.ceil(Math.hypot(ex-px,ey-py)/4);
  for(let i=1;i<steps;i++){const x=Math.floor((px+(ex-px)*i/steps)/TILE),y=Math.floor((py+(ey-py)*i/steps)/TILE);if(x===tx&&y===ty)break;if(tileSolid(g,x,y))return false;}
  return true;
}
const DROPS={[BLOCK.SOIL]:'soil',[BLOCK.ROCK]:'soil',[BLOCK.IRON]:'iron',[BLOCK.COPPER]:'copper',[BLOCK.ICE]:'ice',[BLOCK.CRYSTAL]:'crystal'};
export function mineTile(g,tx,ty,dt){
  const tile=getTile(g,tx,ty);if(!reachable(g,tx,ty)||!DROPS[tile]||g.energy<.2){g.mine=null;return false;}
  if(tile===BLOCK.CRYSTAL&&!g.crafted.drill){if(!g.mine||g.mine.tx!==tx||g.mine.ty!==ty)notify(g,'Cristal denso: fabrica el taladro mejorado.','warning');g.mine={tx,ty,progress:0};return false;}
  if(!g.mine||g.mine.tx!==tx||g.mine.ty!==ty)g.mine={tx,ty,progress:0};
  g.mine.progress+=dt*(g.crafted.drill?2.2:1);g.energy=Math.max(0,g.energy-dt*.7);
  const hardness=tile===BLOCK.SOIL?.25:tile===BLOCK.ICE?.5:tile===BLOCK.CRYSTAL?1.6:.8;
  if(g.mine.progress>=hardness){g.world.tiles[ty*COLS+tx]=0;g.inventory[DROPS[tile]]++;g.samples++;g.mine=null;return true;}return false;
}
export function placeTile(g,tx,ty){
  if(g.inventory.soil<1||getTile(g,tx,ty)!==0||!reachable(g,tx,ty))return false;
  const p=g.player;if((tx+1)*TILE>p.x-6&&tx*TILE<p.x+6&&(ty+1)*TILE>p.y-14&&ty*TILE<p.y)return false;
  // Preserve the starting refuge's usable space and escape path.
  if(tx>=BASE.left&&tx<=BASE.right&&ty>=BASE.top&&ty<=BASE.bottom)return false;
  const adjacent=[[tx-1,ty],[tx+1,ty],[tx,ty-1],[tx,ty+1]].some(([x,y])=>tileSolid(g,x,y));if(!adjacent)return false;
  g.world.tiles[ty*COLS+tx]=BLOCK.SOIL;g.inventory.soil--;return true;
}
export function antennaPosition(g){const x=112;return {x:x*TILE,y:g.world.surface[x]*TILE};}
export function interact(g,dt){
  if(nearTank(g)){g.oxygen=Math.min(100,g.oxygen+dt*24);g.energy=Math.min(100,g.energy+dt*18);g.health=Math.min(100,g.health+dt*7);notifyQuiet(g,'Recargando traje: oxígeno, batería y soporte médico.');return 'tank';}
  const a=antennaPosition(g);
  if(Math.hypot(g.player.x-a.x,g.player.y-a.y)<52){
    if(!g.crafted.relay){notifyQuiet(g,'La antena necesita un transmisor. Fabrícalo en el banco.');return 'antenna';}
    if(!g.relayInstalled){g.relayInstalled=true;notify(g,'Señal recuperada. Vuelve al refugio y activa el módulo de ascenso.','success');}return 'antenna';
  }
  if(inBase(g)&&g.player.x>25*TILE){
    if(!g.relayInstalled){notifyQuiet(g,'Ascenso bloqueado: instala el transmisor en la antena del este.');return 'lander';}
    if(!g.crafted.filter){notifyQuiet(g,'Restaura el reciclador del refugio antes de cerrar la expedición.');return 'lander';}
    g.phase='won';notify(g,'Expedición completada. Tripulante a salvo.','success');return 'lander';
  }
  return nearBench(g)?'bench':null;
}
function notifyQuiet(g,text){if(g.message!==text)notify(g,text);}
export function currentObjective(g){
  if(!g.crafted.filter)return {title:'RESTAURA EL REFUGIO',text:'Recolecta 4 hierro, 2 cobre y 3 hielo. Fabrica el reciclador en el banco.',target:'REFUGIO',x:21*TILE};
  if(!g.crafted.drill)return {title:'PREPARA LA EXPEDICIÓN',text:'Fabrica el taladro mejorado: 5 hierro y 3 cobre. Abre camino a los cristales.',target:'BANCO',x:21*TILE};
  if(!g.crafted.relay)return {title:'RECUPERA COMUNICACIONES',text:'Reúne 6 hierro, 5 cobre y 3 cristal para fabricar el transmisor.',target:'BANCO',x:21*TILE};
  if(!g.relayInstalled)return {title:'INSTALA EL TRANSMISOR',text:'Alcanza la antena de la meseta este y mantén E para conectarla.',target:'ANTENA',x:112*TILE};
  return {title:'REGRESA A CASA',text:'Vuelve al refugio. Activa el módulo de ascenso con E.',target:'ASCENSO',x:27*TILE};
}
export function tick(g,input,dt){
  if(g.phase!=='playing')return;dt=Math.min(.05,Math.max(0,dt));g.elapsed+=dt;
  movePlayer(g,input,dt);
  const base=inBase(g),cover=roofed(g);
  if(!g.event&&g.elapsed>=g.nextEvent){
    const types=['dust','meteors','flare'];const type=types[g.eventNumber%3];g.eventNumber++;
    g.event={type,remaining:type==='dust'?35:type==='meteors'?24:25,impact:0};
    g.eventHistory.push(type);
    notify(g,type==='dust'?'ALERTA: tormenta de polvo. Menor visibilidad y mayor consumo de traje.':type==='meteors'?'ALERTA: micrometeoritos. Busca techo o vuelve al refugio.':'ALERTA: radiación solar. Refúgiate bajo bloques.','danger');
  }
  if(g.event){g.event.remaining-=dt;g.event.impact+=dt;
    if(g.event.type==='flare'&&!cover&&!base)g.health=Math.max(0,g.health-dt*1.5);
    if(g.event.type==='meteors'&&!cover&&!base&&g.event.impact>3){g.event.impact=0;g.health=Math.max(0,g.health-8);notify(g,'Impacto cercano. Construye un techo sobre ti.','danger');}
    if(g.event.remaining<=0){g.event=null;g.nextEvent=g.elapsed+70;notify(g,'Ventana segura. El fenómeno ha terminado.','success');}}
  const weather=g.event?.type==='dust'&&!base?1.5:1;
  g.oxygen=Math.max(0,g.oxygen-dt*(base&&g.crafted.filter?-7:.34*weather));g.oxygen=Math.min(100,g.oxygen);
  const targetTemp=base?20:cover?-5:g.event?.type==='dust'?-55:-35;
  g.temperature+=(targetTemp-g.temperature)*dt*.035;
  g.energy=Math.max(0,g.energy-dt*(base?-.8:.10*weather));g.energy=Math.min(100,g.energy);
  if(g.energy<1&&g.temperature<0)g.health=Math.max(0,g.health-dt*.6);
  if(g.oxygen<1)g.health=Math.max(0,g.health-dt*6);
  if(input.interact)interact(g,dt);
  if(g.player.x>80*TILE)g.visitedEast=true;
  if(g.health<=0)g.phase='lost';
}
export function serialize(g){return JSON.stringify({...g,world:{...g.world,tiles:Array.from(g.world.tiles)}});}
export function restore(raw){
  try{const g=JSON.parse(raw);if(g.version!==2||g.world?.tiles?.length!==COLS*ROWS||!g.player||!g.inventory)return null;g.world.tiles=Uint8Array.from(g.world.tiles);g.mine=null;return g;}catch{return null;}
}
