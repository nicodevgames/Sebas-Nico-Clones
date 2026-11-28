const B='http://127.0.0.1:4000/hub/v1';
const AUTH='Bearer dev:PLAYER:op-demo:player-demo';
(async()=>{
 const r=await fetch(B+'/games/pragmatic-play-vs20doghouse/launch',{method:'POST',headers:{authorization:AUTH,'content-type':'application/json'},body:JSON.stringify({mode:'real',operatorId:'op-demo'})});
 const l=await r.json();
 console.log('LAUNCH',r.status,'| session:',l.sessionId);
 const token=l.url.match(/token=([^&]+)/)[1];
 console.log('URL:',l.url.slice(0,120));
 const s=await fetch('http://127.0.0.1:3100/api/spin-real',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,coin:0.2,gameId:'vs20doghouse'})});
 const sp=await s.json();
 console.log('SPIN',s.status);
 console.log('  grid:',JSON.stringify(sp.grid));
 console.log('  apuesta:',sp.apuesta,'premio:',sp.premio,'SALDO LEDGER:',sp.saldo,sp.moneda);
 // segundo giro para ver movimiento acumulado
 const s2=await fetch('http://127.0.0.1:3100/api/spin-real',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,coin:0.5,gameId:'vs20doghouse'})});
 const sp2=await s2.json();
 console.log('SPIN2',s2.status,'| apuesta 0.5 → saldo:',sp2.saldo);
})().catch(e=>console.error('E2E-ERR',e.message));
