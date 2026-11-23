// OLX stats snapshot for PS SHOP. Usage: node reklama/scripts/olx_stats.js [outdir]
// Public pages only (no OLX internal API). Writes <outdir>/olx_YYYY-MM-DD.csv (ads) and _pos.csv (search positions).
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const PROFILE='https://www.olx.uz/list/user/6lj3A/';
const QUERIES=['аренда ps5','аренда playstation','ps plus','gta 6 ps5','игры на ps5',"o'yinlar ps5",'установка игр ps4 ps5'];
const out=process.argv[2]||'reklama/stats';const day=new Date().toISOString().slice(0,10);
const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
(async()=>{const b=await chromium.launch();const p=await b.newPage({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',locale:'ru-RU'});
 const cards=async()=>p.$$eval('[data-cy="l-card"]',e=>e.map(d=>{const a=d.querySelector('a[href*="/d/"]');return {id:d.id,url:a?a.href.split('?')[0].split('#')[0]:'',title:d.innerText.split('\n').map(s=>s.trim()).filter(s=>s.length>12&&!/сум|район|г\./.test(s))[0]||''}}));
 let mine=[];for(let pg=1;pg<=8;pg++){await p.goto(PROFILE+'?page='+pg,{timeout:45000});await p.waitForTimeout(3000);const c=await cards();if(!c.length)break;const before=mine.length;for(const x of c)if(!mine.find(m=>m.url==x.url))mine.push(x);if(mine.length==before)break;}
 for(const x of mine){try{await p.goto(x.url,{timeout:45000});await p.waitForTimeout(2500);await p.mouse.wheel(0,4000);await p.waitForTimeout(2500);const t=await p.innerText('body');x.views=+((t.match(/Просмотров: ?(\d+)/)||[0,-1])[1]);x.pub=(t.match(/Опубликовано (.{0,25}г\.)/)||['',''])[1];}catch(e){x.views=-1;x.pub='ERR'}}
 const urls=new Set(mine.map(m=>m.url));const pos=[];
 for(const s of QUERIES){await p.goto('https://www.olx.uz/list/q-'+encodeURIComponent(s.replace(/ /g,'-'))+'/',{timeout:45000});await p.waitForTimeout(3500);const c=await cards();const total=await p.evaluate(()=>{const m=document.body.innerText.match(/Мы нашли ([\d\s]+) объявлен/);return m?m[1].replace(/\s/g,''):''});const ps=c.map((x,i)=>urls.has(x.url)?i+1:0).filter(Boolean);pos.push([s,total,c.length,ps[0]||'',ps.length]);}
 await b.close();fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,`olx_${day}.csv`),'id,views,published,title,url\n'+mine.map(x=>[x.id,x.views,q(x.pub),q(x.title),x.url].join(',')).join('\n')+'\n');
 fs.writeFileSync(path.join(out,`olx_${day}_pos.csv`),'query,total,cards_p1,best_pos,our_slots_p1\n'+pos.map(r=>[q(r[0]),...r.slice(1)].join(',')).join('\n')+'\n');
 const tv=mine.reduce((s,x)=>s+Math.max(0,x.views),0);console.log(`ads ${mine.length}, views ${tv}`);pos.forEach(r=>console.log(`${r[0]}: best ${r[3]||'-'} / ${r[2]} (total ${r[1]})`));})();
