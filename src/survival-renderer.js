import {TILE,COLS,ROWS,BLOCK,BASE,getTile,inBase,nearBench,nearTank,antennaPosition,currentObjective,reachable} from './survival-engine.js';
const W=480,H=270;
const COLORS={1:['#a15e50','#b8795d','#784c49'],2:['#5f5363','#7c6873','#403b50'],3:['#625564','#b3b6b0','#454051'],4:['#775548','#e3a16c','#53424a'],5:['#466b81','#9ddae4','#355167'],6:['#53486f','#bb95df','#37324e'],7:['#354659','#8299a6','#1c2a40'],8:['#1c3542','#7cc1c2','#1c2a3e']};
export class SurvivalRenderer{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.ctx.imageSmoothingEnabled=false;this.camera={x:0,y:0};this.time=0;this.pointer=null;}
  rect(x,y,w,h,c){const ctx=this.ctx;ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  text(s,x,y,c='#d8d6be',size=5){this.ctx.fillStyle=c;this.ctx.font=`bold ${size}px monospace`;this.ctx.fillText(s,Math.round(x),Math.round(y));}
  line(x,y,x2,y2,c){const ctx=this.ctx;ctx.strokeStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
  screenToWorld(x,y){const bounds=this.canvas.getBoundingClientRect();return {x:(x-bounds.left)/bounds.width*W+this.camera.x,y:(y-bounds.top)/bounds.height*H+this.camera.y};}
  tileAt(x,y){const p=this.screenToWorld(x,y);return {x:Math.floor(p.x/TILE),y:Math.floor(p.y/TILE)};}
  drawOrbit(t){
    const c=this.ctx;c.setTransform(2,0,0,2,0,0);this.rect(0,0,W,H,'#0c142b');
    for(let i=0;i<100;i++){const x=(i*97+11)%W,y=(i*53)%H;this.rect(x,y,i%7?1:2,1,i%3?'#4a6289':'#d9cfaf');}
    c.save();c.beginPath();c.arc(330,220,133,0,Math.PI*2);c.clip();this.rect(190,80,280,200,'#87594e');
    for(let i=0;i<28;i++){const y=95+i*6;this.rect(202+Math.sin(i*2.4)*18,y,270,4,i%3?'#a16a52':'#bf8b66');}
    c.restore();
    for(let i=0;i<7;i++){this.rect(30+i*17,130,13,45,'#172f48');this.rect(31+i*17,132,11,40,'#48667e');for(let j=0;j<6;j++)this.rect(32+i*17,134+j*6,9,1,'#7c9eae');}
    this.rect(108,146,230,9,'#7f8f9d');this.rect(182,109,92,67,'#33465f');this.rect(185,106,86,3,'#9eafb5');this.rect(187,113,82,53,'#a2aaa4');
    for(let i=0;i<4;i++){this.rect(194+i*18,122,13,25,'#172e49');this.rect(195+i*18,124,11,5,'#81babc');this.rect(197+i*18,143,8,2,'#b5ded4');}
    this.rect(222,91,7,16,'#657e96');this.line(225,91,251,74,'#c4d2ca');this.rect(247,69,8,8,'#d99b62');
    this.astronaut(310,152,0,false,1);this.text('ESTACIÓN ORBITAL / JEZERO',20,23,'#e0c595',7);this.text('CONTROL DE EXPEDICIONES',20,36,'#789aaf',5);
    this.rect(15,233,175,22,'#0b1428');this.text('MARTE · DESTINO AUTORIZADO',23,246,'#81c9b2',6);
    const pulse=Math.sin(t*2)>0;this.rect(277,116,3,3,pulse?'#81c9b2':'#284940');
  }
  astronaut(x,y,vx,grounded,facing){const walk=Math.abs(vx)>2&&grounded?Math.round(Math.sin(this.time*13)):0;
    this.rect(x-5,y-13,10,7,'#dedbc9');this.rect(x-6,y-12,2,8,'#97a5b3');this.rect(x-3,y-11,7,4,'#163147');this.rect(x-2,y-11,5,1,'#93ded9');
    this.rect(x-4,y-6,8,5,'#bac7c6');this.rect(x-3,y-5,2,2,'#e8a564');this.rect(x-6,y-5,2,4,'#da9762');this.rect(x+4,y-5,2,4,'#da9762');
    this.rect(x-4,y-1,3,2+walk,'#24354d');this.rect(x+1,y-1,3,2-walk,'#24354d');this.rect(x+(facing>0?5:-9),y-4,4,2,'#98a6ad');
  }
  tile(g,x,y){const type=getTile(g,x,y),[base,light,dark]=COLORS[type],px=x*TILE,py=y*TILE;const exposed=getTile(g,x,y-1)===0;
    this.rect(px,py,16,16,base);
    if(type===BLOCK.DOOR){this.rect(px+2,py,12,16,'#172b3c');this.rect(px+7,py,2,16,'#4b8b91');this.rect(px+3,py+5,2,3,'#91d8cb');return;}
    if(type===BLOCK.HULL){this.rect(px,py,16,2,light);this.rect(px+14,py+2,2,14,dark);this.rect(px+2,py+3,2,2,'#b0b5b4');this.rect(px+3,py+13,10,1,'#53677d');return;}
    if(exposed)this.rect(px,py,16,2,light);this.rect(px,py+15,16,1,dark);
    const n=(x*17+y*39)%13;this.rect(px+2+n%5,py+4,3,2,dark);this.rect(px+9,py+10-n%4,4,1,light);
    if(type>=3&&type<=6){for(let i=0;i<3;i++){const ox=(i*7+x*3)%12+1,oy=(i*5+y)%11+2;this.rect(px+ox,py+oy,3,3,light);this.rect(px+ox+1,py+oy,1,1,'#e9d5b2');}}
  }
  drawWorld(g,dt,pointer,tool){
    const c=this.ctx;this.time+=dt;c.setTransform(2,0,0,2,0,0);
    const p=g.player;this.camera.x=Math.max(0,Math.min(COLS*TILE-W,p.x-W*.45));this.camera.y=Math.max(0,Math.min(ROWS*TILE-H,p.y-H*.48));
    const cam=this.camera;const night=g.elapsed%300>180;
    this.rect(0,0,W,H,night?'#10172d':'#554458');
    // Stars, moons and layered terrain move at different rates.
    for(let i=0;i<55;i++)this.rect(((i*97-cam.x*.08)%W+W)%W,(i*29)%95,1,1,night?'#a5abb2':'#8f7b81');
    this.rect(391-cam.x*.05,30,12,12,'#a99791');this.rect(393-cam.x*.05,28,8,16,'#a99791');
    for(let layer=0;layer<3;layer++){
      const baseline=150-layer*15-cam.y*.16;
      for(let x=0;x<W;x+=4){const world=x+cam.x*(.12+layer*.09);const h=26+Math.sin(world*.016+layer)*22+Math.sin(world*.04)*8;this.rect(x,baseline-h,4,H,layer===0?'#594151':layer===1?'#694751':'#80544f');}
    }
    c.save();c.translate(-Math.round(cam.x),-Math.round(cam.y));
    const left=Math.max(0,Math.floor(cam.x/TILE)),right=Math.min(COLS,Math.ceil((cam.x+W)/TILE)+1),top=Math.max(0,Math.floor(cam.y/TILE)),bottom=Math.min(ROWS,Math.ceil((cam.y+H)/TILE)+1);
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      const tile=getTile(g,x,y),py=y*TILE;if(!tile&&y>g.world.surface[x]){
        this.rect(x*TILE,py,16,16,'#242338');if((x+y)%4===0)this.rect(x*TILE+3,py+4,5,2,'#343047');
      }
    }
    this.baseInterior(g);
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(getTile(g,x,y))this.tile(g,x,y);
    // Salvage landmarks above the terrain.
    for(const x of [51,81,142]){const y=g.world.surface[x]*TILE;this.rect(x*TILE-10,y-9,30,9,'#303447');this.rect(x*TILE-6,y-14,19,6,'#7e7476');this.rect(x*TILE-3,y-12,7,3,'#dfad70');}
    const a=antennaPosition(g);this.rect(a.x-3,a.y-44,6,44,'#7c8b9a');this.rect(a.x-11,a.y-3,22,3,'#1c2d40');
    for(let i=0;i<13;i++)this.rect(a.x-15+i,a.y-49+i/2,30-i*2,2,'#bec2b9');this.line(a.x,a.y-43,a.x+16,a.y-63,'#cbd2c6');this.rect(a.x+15,a.y-65,3,3,g.relayInstalled?'#83d9bb':'#ed817c');
    if(g.relayInstalled){const r=7+this.time*7%20;c.strokeStyle='#83d9bb88';c.beginPath();c.arc(a.x+16,a.y-63,r,-2.8,-.4);c.stroke();}
    this.text('ANTENA / E-112',a.x-25,a.y-72,'#dcbd94',5);
    this.astronaut(p.x,p.y,p.vx,p.grounded,p.facing);
    // Helmet lamp makes cave navigation readable without removing darkness.
    if(p.y/TILE>g.world.surface[Math.floor(p.x/TILE)]+5){const light=c.createRadialGradient(p.x,p.y,15,p.x,p.y,145);light.addColorStop(0,'#02091a00');light.addColorStop(1,'#02091abb');c.fillStyle=light;c.fillRect(cam.x,cam.y,W,H);}
    if(pointer){const tx=pointer.x,ty=pointer.y;if(tx>=left&&tx<right&&ty>=top&&ty<bottom){c.strokeStyle=reachable(g,tx,ty)?tool==='build'?'#83d9bb':'#e9ae67':'#ed817c';c.strokeRect(tx*TILE+.5,ty*TILE+.5,15,15);
      if(g.mine&&g.mine.tx===tx&&g.mine.ty===ty){const i=Math.min(14,g.mine.progress*12);this.rect(tx*TILE+1,ty*TILE+13,i,2,'#e9ae67');}}}
    const context=nearTank(g)?'[E] RECARGAR TRAJE':nearBench(g)?'[E] FABRICAR':inBase(g)&&p.x>25*TILE?'[E] ASCENSO':Math.hypot(p.x-a.x,p.y-a.y)<52?'[E] CONECTAR ANTENA':'';
    if(context){this.rect(p.x-46,p.y-28,92,10,'#0a162bea');this.text(context,p.x-41,p.y-21,'#c9d8c5',5);}
    c.restore();
    if(g.event?.type==='dust'){this.rect(0,0,W,H,'#ba795228');for(let i=0;i<65;i++){const x=((i*67-this.time*110)%500+500)%500;this.rect(x,(i*41+this.time*9)%H,8,1,'#d1a17a55');}}
    if(g.event?.type==='meteors')for(let i=0;i<8;i++){const x=(i*89+this.time*70)%W,y=(i*41+this.time*115)%H;this.line(x,y,x-7,y-11,'#f3bd77');this.rect(x,y,2,2,'#fff1b1');}
    if(g.event?.type==='flare'){this.rect(0,0,W,4,'#ed817c');if(Math.sin(this.time*5)>0)this.rect(0,0,W,H,'#ed817c0b');}
    const objective=currentObjective(g);this.rect(7,7,201,30,'#0a1429e8');this.text(objective.title,13,17,'#e9ae67',6);
    this.text(`${objective.target} ${Math.round(Math.abs(p.x-objective.x)/TILE)} m ${p.x>objective.x?'<':'>'}`,13,29,'#a6c3c4',5);
    this.rect(337,7,136,21,'#0a1429dc');this.text(`${inBase(g)?'REFUGIO':'EVA'} / ${Math.floor(g.elapsed/60)}:${String(Math.floor(g.elapsed%60)).padStart(2,'0')} / ${night?'NOCHE':'DÍA'}`,344,20,'#9eafc4',5);
    if(g.event){const name={dust:'TORMENTA DE POLVO',meteors:'MICROMETEORITOS',flare:'RADIACIÓN SOLAR'}[g.event.type];this.rect(128,243,224,18,'#3b2333ed');this.text(`! ${name} · ${Math.ceil(g.event.remaining)}s`,138,255,'#f0a599',6);}
    if(g.oxygen<25||g.health<25){c.strokeStyle='#ed817c';c.lineWidth=2;c.strokeRect(1,1,W-2,H-2);}
  }
  baseInterior(g){
    const x=BASE.left*TILE,y=BASE.top*TILE,w=(BASE.right-BASE.left)*TILE,h=(BASE.bottom-BASE.top)*TILE;
    this.rect(x,y,w,h,'#1b2b3e');
    for(let j=y+16;j<y+h;j+=16){this.line(x,j,x+w,j,'#293c50');for(let i=x+16;i<x+w;i+=32)this.line(i,j,i,j+16,'#293c50');}
    for(let i=x+20;i<x+w-16;i+=48){this.rect(i,y+18,28,4,'#879b9f');this.rect(i+2,y+22,24,1,'#c6d5b7');}
    this.text('REFUGIO JEZERO / 047',x+76,y+43,'#94b8bd',7);
    // Oxygen station, fabrication bench and ascent hatch are physical landmarks.
    const tx=16*TILE,by=28*TILE;this.rect(tx-13,by-34,24,29,'#213e53');this.rect(tx-10,by-31,8,23,'#93c6c6');this.rect(tx+1,by-31,8,23,'#71a6ab');this.rect(tx-12,by-6,24,4,'#9caca8');this.text('RECARGA',tx-16,by-41,'#83d9bb',5);
    const bx=21*TILE;this.rect(bx-19,by-19,38,5,'#b4b0a1');this.rect(bx-17,by-14,4,14,'#61778b');this.rect(bx+13,by-14,4,14,'#61778b');this.rect(bx-13,by-32,20,12,'#4b637a');this.rect(bx-10,by-30,14,7,'#83d9bb');this.rect(bx+10,by-24,7,5,'#db9e69');this.text('BANCO',bx-13,by-40,'#e9ae67',5);
    const lx=27*TILE;this.rect(lx-14,by-52,28,52,'#263c50');this.rect(lx-11,by-49,22,43,'#596e80');this.rect(lx-8,by-44,16,20,'#18374c');this.rect(lx-6,by-42,12,4,'#82c5cf');this.rect(lx+5,by-18,3,3,g.relayInstalled?'#83d9bb':'#ed817c');this.text('ASCENSO',lx-18,by-60,'#ddbd8a',5);
    const fx=24*TILE;this.rect(fx-7,by-22,14,22,'#416071');this.rect(fx-4,by-18,8,12,g.crafted.filter?'#83d9bb':'#b36b63');
    for(let i=0;i<3;i++){this.rect(x+38+i*35,y+63,26,31,'#183446');this.rect(x+41+i*35,y+66,20,5,'#3a6b73');this.rect(x+44+i*35,y+75,14,10,'#467b71');}
    this.text('AIRLOCK',x-12,by-56,'#bcb38e',4);this.text('AIRLOCK',x+w-12,by-56,'#bcb38e',4);
  }
}
