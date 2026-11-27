const fs = require('fs');
const W='/root/Sebas-Nico-Clones/pragmatic-play-clone/engine';
const syms = JSON.parse(fs.readFileSync(W+'/simbolos_reales.json','utf8'));
let map={}; try{map=JSON.parse(fs.readFileSync(W+'/caratulas.json','utf8'))}catch(e){}
const pend = syms.filter(s=>!map[s.symbol]);
console.log('faltantes:',pend.length);
const CONC=8; let idx=0; let hechos=0;
async function worker(){
 while(idx<pend.length){
  const s=pend[idx++];
  const url='https://www.pragmaticplay.com/en/games/'+s.slug+'/';
  for(let inten=0;inten<2;inten++){
   try{
    const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'user-agent':'Mozilla/5.0 Chrome/126.0'}});
    if(r.ok){
     const t=await r.text();
     const og=/<meta property="og:image" content="([^"]+)"/.exec(t);
     if(og){ map[s.symbol]=og[1]; hechos++; break; }
    }
   }catch(e){ await new Promise(ok=>setTimeout(ok,800)); }
  }
  if(hechos%20===0 && hechos>0){ fs.writeFileSync(W+'/caratulas.json',JSON.stringify(map,null,1)); }
 }
}
Promise.all(Array.from({length:CONC},worker)).then(()=>{
 fs.writeFileSync(W+'/caratulas.json',JSON.stringify(map,null,1));
 console.log('FINAL CARATULAS:',Object.keys(map).length,'/',syms.length);
});
