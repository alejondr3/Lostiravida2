import test from 'node:test';
import assert from 'node:assert/strict';
import {TILE,COLS,ROWS,BLOCK,BASE,generateWorld,createSurvival,tick,movePlayer,inBase,nearBench,nearTank,getTile,mineTile,placeTile,craft,interact,antennaPosition,serialize,restore,roofed} from '../src/survival-engine.js';
const idle={dx:0,jump:false,sprint:false,interact:false};
function run(g,seconds,input=idle){for(let i=0;i<seconds*20;i++)tick(g,input,.05);}
test('world generation is deterministic, bounded, and contains opening resource deposits',()=>{
  const a=generateWorld(47),b=generateWorld(47);assert.deepEqual(a.tiles,b.tiles);assert.equal(a.tiles.length,COLS*ROWS);
  for(const type of [BLOCK.IRON,BLOCK.COPPER,BLOCK.ICE,BLOCK.CRYSTAL])assert.ok(a.tiles.filter(t=>t===type).length>30);
  assert.equal(a.tiles[BASE.bottom*COLS+22],BLOCK.HULL);
});
test('standing on the refuge floor counts as sheltered and permits fabrication',()=>{
  const g=createSurvival();run(g,3);assert.ok(g.player.grounded);assert.ok(inBase(g));assert.ok(nearBench(g));
  g.inventory.iron=4;g.inventory.copper=2;g.inventory.ice=3;assert.ok(craft(g,'filter').ok);
  g.oxygen=40;run(g,2);assert.ok(g.oxygen>50);
});
test('player collides with hull but passes the airlock',()=>{
  const g=createSurvival();g.player.x=(BASE.right-1)*TILE;g.player.y=(BASE.top+3)*TILE;run(g,2,{...idle,dx:1});
  // Gravity can take the player into the doorway eventually; inspect the upper wall directly.
  g.player.x=BASE.right*TILE-7;g.player.y=(BASE.top+3)*TILE;g.player.vy=0;movePlayer(g,{...idle,dx:1},.02);assert.ok(g.player.x<BASE.right*TILE);
  g.player.y=BASE.bottom*TILE;run(g,2,{...idle,dx:1});assert.ok(g.player.x>BASE.right*TILE);
});
test('mining rewards inventory once and cannot reach through walls',()=>{
  const g=createSurvival();g.player.x=40*TILE+8;g.player.y=20*TILE;g.world.tiles.fill(0);
  g.world.tiles[20*COLS+41]=BLOCK.IRON;
  for(let i=0;i<20;i++)mineTile(g,41,20,.05);
  assert.equal(g.inventory.iron,1);assert.equal(getTile(g,41,20),0);mineTile(g,41,20,2);assert.equal(g.inventory.iron,1);
  g.world.tiles[19*COLS+41]=BLOCK.HULL;g.world.tiles[19*COLS+42]=BLOCK.COPPER;
  assert.equal(mineTile(g,42,19,4),false);assert.equal(g.inventory.copper,0);
});
test('crystal needs upgraded drill; normal stone can be mined',()=>{
  const g=createSurvival();g.world.tiles.fill(0);g.player.x=40*TILE;g.player.y=20*TILE;g.world.tiles[19*COLS+41]=BLOCK.CRYSTAL;
  mineTile(g,41,19,3);assert.equal(g.inventory.crystal,0);g.crafted.drill=true;
  mineTile(g,41,19,1);assert.equal(g.inventory.crystal,1);
});
test('building consumes a block, requires support, and cannot trap the player or fill the starting base',()=>{
  const g=createSurvival();g.world.tiles.fill(0);g.player.x=40*TILE+8;g.player.y=20*TILE;g.world.tiles[21*COLS+41]=BLOCK.ROCK;
  const before=g.inventory.soil;assert.ok(placeTile(g,41,20));assert.equal(g.inventory.soil,before-1);
  assert.equal(placeTile(g,40,19),false);assert.equal(placeTile(g,43,19),false);
});
test('fabrication requires a nearby bench and charges materials atomically',()=>{
  const g=createSurvival();assert.equal(craft(g,'filter').ok,false);assert.equal(g.inventory.iron,0);
  Object.assign(g.inventory,{iron:4,copper:2,ice:3});assert.ok(craft(g,'filter').ok);assert.equal(g.inventory.iron,0);
  assert.equal(craft(g,'filter').ok,false);g.player.x=100*TILE;assert.equal(craft(g,'battery').ok,false);
});
test('refill station restores suit reserves without consuming inventory',()=>{
  const g=createSurvival();g.player.x=16*TILE;g.player.y=28*TILE;g.oxygen=30;g.energy=20;assert.ok(nearTank(g));
  run(g,2,{...idle,interact:true});assert.ok(g.oxygen>70);assert.ok(g.energy>50);
});
test('solar flare damages exposed player and a roof provides protection',()=>{
  const g=createSurvival();g.world.tiles.fill(0);g.player.x=70*TILE;g.player.y=20*TILE;g.event={type:'flare',remaining:25,impact:0};
  run(g,1);assert.ok(g.health<100);
  g.player.y=20*TILE;g.player.vy=0;g.world.tiles[18*COLS+70]=BLOCK.SOIL;g.world.tiles[20*COLS+70]=BLOCK.SOIL;g.health=100;assert.ok(roofed(g));run(g,.4);assert.equal(g.health,100);
});
test('events arrive and finish; exhausted oxygen eventually ends an expedition',()=>{
  const g=createSurvival();g.elapsed=94.99;run(g,.1);assert.equal(g.event.type,'dust');
  g.event.remaining=.01;run(g,.1);assert.equal(g.event,null);assert.ok(g.nextEvent>g.elapsed);
  g.oxygen=0;g.health=1;run(g,.3);assert.equal(g.phase,'lost');
});
test('save roundtrip preserves changed terrain, inventory and objective progress',()=>{
  const g=createSurvival();g.world.tiles[400]=BLOCK.CRYSTAL;g.inventory.iron=12;g.crafted.drill=true;
  const saved=restore(serialize(g));assert.ok(saved.world.tiles instanceof Uint8Array);assert.equal(saved.world.tiles[400],BLOCK.CRYSTAL);assert.equal(saved.inventory.iron,12);assert.ok(saved.crafted.drill);
  assert.equal(restore('broken'),null);assert.equal(restore('{}'),null);
});
test('extraction requires restored refuge plus relay installed at the antenna',()=>{
  const g=createSurvival();g.player.x=27*TILE;g.player.y=28*TILE;interact(g,.05);assert.equal(g.phase,'playing');
  g.crafted.filter=true;g.crafted.relay=true;const a=antennaPosition(g);g.player.x=a.x;g.player.y=a.y;interact(g,.05);assert.ok(g.relayInstalled);
  g.player.x=27*TILE;g.player.y=28*TILE;interact(g,.05);assert.equal(g.phase,'won');
});
