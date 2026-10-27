import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
const start=html.indexOf('    const SITE_WORLD_COORDINATES =');
const end=html.indexOf('    function toWorldCoordinates',start);
const sites=Function(html.slice(start,end)+';return SITE_WORLD_COORDINATES;')();
const paths=[...html.matchAll(/<path\b([^>]*class="[^"]*region-path[^>]*?)>/g)].map(([,attrs])=>({region:attrs.match(/data-region="([^"]*)"/)?.[1],d:attrs.match(/\bd="([^"]*)"/)?.[1]})).filter(p=>p.region&&p.d);
function inside(polygon,{x,y}){let odd=false;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+polygon.length-1)%polygon.length];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)odd=!odd;}return odd;}
function regionAt(point){return paths.filter(path=>path.d.split(/M/).slice(1).filter(sub=>{const values=(sub.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);return inside(Array.from({length:values.length/2},(_,i)=>({x:values[i*2],y:values[i*2+1]})),point);}).length%2).map(p=>p.region);}
test('geographic anchors for Rome and Athens fall inside the actual European base map',()=>{
 assert.ok(paths.length>=100);
 for(const name of ['Rome','Athens'])assert.ok(regionAt(sites[name]).includes('europe'),name+' was outside Europe: '+JSON.stringify(regionAt(sites[name])));
});
test('Rome naming variants use one geographic point',()=>assert.deepEqual(sites.Rome,sites['Rome, Italy']));
test('all revised city points use the recorded WGS84 projection and preserve non-city provenance',()=>{
 const review=JSON.parse(fs.readFileSync(new URL('../data/art-geography-city-review.json',import.meta.url),'utf8'));
 assert.equal(review.cities.length,60);
 for(const row of review.cities){
  assert.equal(row.scope,'city-representative');assert.match(row.source.url,/^https:\/\/www\.geonames\.org\/\d+\/$/);
  assert.deepEqual(sites[row.siteName],{x:+((row.longitude+180)*1600/360).toFixed(3),y:+((90-row.latitude)*800/180).toFixed(3)},row.siteName);
 }
 const artworkBlock=html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1];
 const works=JSON.parse(artworkBlock);assert.equal(works.length,250);
 for(const ap of [230,241])assert.ok(works.find(w=>w.apNumber===ap).siteName.includes('unresolved')||works.find(w=>w.apNumber===ap).siteName.includes('unverified'));
});
