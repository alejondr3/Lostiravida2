import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,move,blocked,OBJECTS} from '../src/expedition-engine.js';
const idle={dx:0,dy:0,sprint:false,interact:false};
function ticks(g,n,input=idle){for(let i=0;i<n;i++)step(g,input,.05);}
test('walls stop astronaut movement and doorways remain traversable',()=>{
  assert.equal(blocked(195,200),true);assert.equal(blocked(384,290),false);
  const g=createGame();g.player={x:370,y:200};move(g,1,0,.05,false);assert.equal(g.player.x,370);
});
test('repair requires resources and uninterrupted interaction',()=>{
  const g=createGame();g.started=true;g.player={x:280,y:200};
  ticks(g,100,{...idle,interact:true});assert.equal(g.repaired.length,0);
  g.parts=2;ticks(g,40,{...idle,interact:true});ticks(g,1);assert.equal(g.progress,0);
  ticks(g,82,{...idle,interact:true});assert.equal(g.repaired.includes('reactor'),true);assert.equal(g.parts,0);
});
test('oxygen depletes outside, refills at locker, and exhaustion ends the run',()=>{
  const g=createGame();g.started=true;g.player={x:100,y:100};g.oxygen=20;ticks(g,20);assert.ok(g.oxygen<20);
  g.player={x:480,y:185};ticks(g,20,{...idle,interact:true});assert.ok(g.oxygen>30);
  g.oxygen=.01;g.player={x:100,y:100};ticks(g,1);assert.equal(g.phase,'lost');
});
test('full repair sequence allows extraction with exactly six parts',()=>{
  const g=createGame();g.started=true;g.parts=6;
  for(const id of ['reactor','oxygen','garden','antenna','lander']){
    const o=OBJECTS.find(o=>o.id===id);g.player={x:o.x,y:o.y};ticks(g,(o.seconds+1)*20,{...idle,interact:true});
  }
  assert.equal(g.phase,'won');assert.equal(g.parts,0);
});
test('holding interaction away from a system cannot repair anything',()=>{
  const g=createGame();g.started=true;g.parts=10;ticks(g,200,{...idle,interact:true});assert.equal(g.repaired.length,0);
});
