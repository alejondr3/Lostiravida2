// Original, dependency-free pixel animations for the mission dossier.
import { mkdirSync, writeFileSync } from 'node:fs';
const W = 320, H = 112;
const palette = [7,23,47, 91,214,255, 255,138,61, 123,228,149, 247,244,233, 31,66,100, 199,156,255, 18,39,65];
const u16 = n => [n & 255, n >> 8];
mkdirSync('assets', { recursive: true });
function gif(name, paint) {
  const bytes = [...Buffer.from('GIF89a'), ...u16(W), ...u16(H), 0xf2, 0, 0, ...palette,
    0x21,0xff,11,...Buffer.from('NETSCAPE2.0'),3,1,0,0,0];
  for (let frame = 0; frame < 24; frame++) {
    const pixels = new Uint8Array(W * H);
    const dot = (x,y,c) => { x=Math.round(x); y=Math.round(y); if(x>=0&&x<W&&y>=0&&y<H) pixels[y*W+x]=c; };
    const rect = (x,y,w,h,c) => { for(let j=0;j<h;j++)for(let i=0;i<w;i++)dot(x+i,y+j,c); };
    for(let i=0;i<38;i++) dot((i*79+frame*(i%3===0?1:0))%W,(i*37)%H, i%4===0?1:5);
    paint(frame, dot, rect);
    bytes.push(0x21,0xf9,4,0,8,0,0,0,0x2c,0,0,0,0,...u16(W),...u16(H),0,3);
    // Fixed-width LZW: reset before the dictionary would grow beyond 4 bits.
    const packed=[]; let buffer=0,bits=0;
    const code = n => { buffer|=n<<bits; bits+=4; while(bits>=8){packed.push(buffer&255);buffer>>=8;bits-=8;} };
    for(let i=0;i<pixels.length;i+=5){code(8);for(let j=i;j<Math.min(i+5,pixels.length);j++)code(pixels[j]);}
    code(9); if(bits)packed.push(buffer&255);
    for(let i=0;i<packed.length;i+=255){const block=packed.slice(i,i+255);bytes.push(block.length,...block);}bytes.push(0);
  }
  bytes.push(0x3b);writeFileSync(`assets/${name}.gif`,Buffer.from(bytes));
}
gif('orbita', (f,d,r) => {
  for(let y=-25;y<=25;y++)for(let x=-25;x<=25;x++)if(x*x+y*y<625)d(160+x,56+y,x<0?5:1);
  for(let a=0;a<360;a+=2){const t=a*Math.PI/180;d(160+83*Math.cos(t),56+33*Math.sin(t),5);}
  const t=f/24*Math.PI*2; const x=160+83*Math.cos(t),y=56+33*Math.sin(t);
  r(x-4,y-3,9,7,4);r(x-15,y-2,9,4,2);r(x+7,y-2,9,4,2);
});
gif('despegue',(f,d,r)=>{
  const y=26+Math.sin(f/24*Math.PI*2)*4;
  r(149,y,22,49,4);r(156,y+9,8,8,1);r(141,y+37,8,16,2);r(171,y+37,8,16,2);
  for(let i=0;i<12;i++)r(149+i,y-12+i,22-i*2,1,2);
  for(let i=0;i<20+(f%4)*3;i++)r(153+i*.2,y+50+i,14-i*.45,1,i<8?4:2);
});
gif('telemetria',(f,d,r)=>{
  for(let j=0;j<4;j++){
    r(24,17+j*23,272,3,5);r(24,17+j*23,60+((f*8+j*47)%190),3,j%2?3:1);
    for(let i=0;i<16;i++)r(24+i*17,23+j*23,9,7,(i+f+j)%7<3?2:5);
  }
});
gif('senal',(f,d,r)=>{
  r(151,57,18,30,4);r(135,86,50,5,5);
  for(let a=0;a<360;a+=3){const t=a*Math.PI/180;d(160+13*Math.cos(t),43+13*Math.sin(t),1);}
  for(let n=0;n<3;n++){const radius=22+((f*2+n*18)%54);for(let a=210;a<330;a+=2){const t=a*Math.PI/180;d(160+radius*Math.cos(t),43+radius*Math.sin(t),n===0?2:5);}}
});
console.log('4 GIF originales creados en assets/');
