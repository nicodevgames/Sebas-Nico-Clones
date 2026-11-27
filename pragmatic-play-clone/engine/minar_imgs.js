const fs = require('fs');
const W='/root/Sebas-Nico-Clones/pragmatic-play-clone/engine';
const syms = JSON.parse(fs.readFileSync(W+'/simbolos_reales.json','utf8'));
const CONC=16; let idx=0; const map={};
async function worker(){
 while(idx<syms.length){
  const s=syms[idx++];
  const url='https://www.pragmaticplay.com/en/games/'+s.slug+'/';
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'user-agent':'Mozilla/5.0 Chrome/126.0'}});
   if(r.ok){
    const t=await r.text();
    const og=/<meta property="og:image" content="([^"]+)"/.exec(t);
    if(og) map[s.symbol]=og[1];
   }
  }catch(e){}
 }
}
Promise.all(Array.from({length:CONC},worker)).then(()=>{
 fs.writeFileSync(W+'/caratulas.json',JSON.stringify(map,null,1));
 console.log('CARATULAS:',Object.keys(map).length,'/',syms.length);
});
