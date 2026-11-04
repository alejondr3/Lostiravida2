export const WIDTH = 960;
export const HEIGHT = 640;
export const WALLS = [
  { x: 192, y: 128, w: 576, h: 12 },
  { x: 192, y: 128, w: 12, h: 384 },
  { x: 756, y: 128, w: 12, h: 384 },
  { x: 192, y: 500, w: 250, h: 12 },
  { x: 518, y: 500, w: 250, h: 12 },
  { x: 378, y: 140, w: 12, h: 125 },
  { x: 378, y: 315, w: 12, h: 185 },
  { x: 570, y: 140, w: 12, h: 125 },
  { x: 570, y: 315, w: 12, h: 185 },
];
export const OBJECTS = [
  { id: 'reactor', x: 280, y: 200, kind: 'reactor', label: 'REACTOR', seconds: 4, cost: 2 },
  { id: 'oxygen', x: 280, y: 410, kind: 'oxygen', label: 'RECICLADOR O₂', seconds: 3, cost: 1 },
  { id: 'garden', x: 660, y: 210, kind: 'garden', label: 'HIDROPONÍA', seconds: 3, cost: 1 },
  { id: 'antenna', x: 830, y: 98, kind: 'antenna', label: 'ANTENA', seconds: 5, cost: 2 },
  { id: 'lander', x: 480, y: 590, kind: 'lander', label: 'MÓDULO DE ASCENSO', seconds: 4, cost: 0 },
  { id: 'locker', x: 480, y: 185, kind: 'locker', label: 'TAQUILLA DE SUMINISTROS', seconds: 0, cost: 0 },
];
const PARTS = [[450,245],[520,325],[660,445],[700,350],[120,180],[120,420],[840,390],[800,540],[350,565],[560,80]];
export function createGame() {
  return { player: { x: 480, y: 350, direction: 'down' }, oxygen: 100, battery: 100, parts: 0,
    repaired: [], collected: [], progress: 0, target: null, elapsed: 0, phase: 'playing',
    storm: false, started: false, message: 'LA BASE ESTÁ SIN ENERGÍA. BUSCA LOS REPUESTOS BRILLANTES.' };
}
export function nearby(game) {
  return OBJECTS.find(o => Math.hypot(game.player.x - o.x, game.player.y - o.y) < 51) ?? null;
}
export function outside(game) {
  return game.player.x < 204 || game.player.x > 756 || game.player.y < 140 || game.player.y > 500;
}
export function blocked(x, y) {
  return x < 14 || y < 14 || x > WIDTH-14 || y > HEIGHT-14 || WALLS.some(w => x+8>w.x && x-8<w.x+w.w && y+8>w.y && y-8<w.y+w.h);
}
export function move(game, dx, dy, dt, sprint) {
  const length = Math.hypot(dx, dy); if (!length) return;
  const speed = sprint && game.battery>0 ? 126 : 78;
  const x = game.player.x + dx/length*speed*dt;
  const y = game.player.y + dy/length*speed*dt;
  if (!blocked(x, game.player.y)) game.player.x=x;
  if (!blocked(game.player.x, y)) game.player.y=y;
  game.player.direction = Math.abs(dx)>Math.abs(dy) ? dx>0?'right':'left' : dy>0?'down':'up';
  if (sprint) game.battery=Math.max(0,game.battery-dt*3);
}
export function step(game, input, dt) {
  if(game.phase!=='playing'||!game.started)return;
  dt=Math.min(.05,dt); game.elapsed+=dt;
  game.storm = game.elapsed%70>50;
  move(game,input.dx,input.dy,dt,input.sprint);
  const exterior=outside(game);
  game.oxygen=Math.max(0,game.oxygen-dt*(exterior?(game.storm?1.8:.75):.12));
  if(game.repaired.includes('oxygen')&&!exterior)game.oxygen=Math.min(100,game.oxygen+dt*7);
  if(game.repaired.includes('reactor'))game.battery=Math.min(100,game.battery+dt*1.5);
  PARTS.forEach(([x,y],i)=>{if(!game.collected.includes(i)&&Math.hypot(game.player.x-x,game.player.y-y)<22){game.collected.push(i);game.parts++;game.message='REPUESTO RECUPERADO · +1 PIEZA';}});
  const object=nearby(game);
  if(!input.interact||!object){game.target=null;game.progress=0;}
  else if(object.id==='locker'){
    game.oxygen=Math.min(100,game.oxygen+dt*18);game.battery=Math.min(100,game.battery+dt*12);
    game.message='RECARGANDO TRAJE EN LA TAQUILLA';
  } else if(!game.repaired.includes(object.id)) {
    let error='';
    if(object.id!=='reactor'&&!game.repaired.includes('reactor'))error='PRIMERO RESTAURA EL REACTOR';
    else if(object.id==='antenna'&&!game.repaired.includes('oxygen'))error='REPARA EL RECICLADOR DE OXÍGENO ANTES DE LA EVA';
    else if(object.id==='lander'&&!['reactor','oxygen','garden','antenna'].every(id=>game.repaired.includes(id)))error='RESTAURA LOS 4 SISTEMAS ANTES DE DESPEGAR';
    else if(game.parts<object.cost)error=`NECESITAS ${object.cost} REPUESTOS PARA ESTA REPARACIÓN`;
    if(error){game.message=error;game.progress=0;}
    else {
      if(game.target!==object.id){game.target=object.id;game.progress=0;}
      game.progress+=dt;
      if(game.progress>=object.seconds){game.parts-=object.cost;game.repaired.push(object.id);game.progress=0;game.message=`${object.label}: EN LÍNEA`;
        if(object.id==='lander')game.phase='won';
      }
    }
  }
  if(game.oxygen<=0){game.phase='lost';game.message='EL TRAJE AGOTÓ SU RESERVA DE OXÍGENO';}
}
export function salvage() { return PARTS; }
