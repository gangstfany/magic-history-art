import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {favoriteForArtwork, openArtworkFavorite, createFavoritesController} from '../art-favorites.mjs';
const html=readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
const works=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
test('all 250 favorite identities reuse stable artwork IDs and bounded plain metadata',()=>{
 assert.equal(new Set(works.map(w=>favoriteForArtwork(w).id)).size,250);
 for(const work of works){const item=favoriteForArtwork(work);assert.equal(item.id,work.id);assert.match(item.id,/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,139}$/);assert.equal(item.kind,'artwork');assert.equal(item.unit,String(work.unit));assert.ok(item.unit.length<=32);assert.ok(item.id.length<=140);assert.ok(item.title.length<=180);assert.ok(item.subtitle.length<=240);assert.deepEqual(Object.keys(item).sort(),['id','kind','subtitle','title','unit']);}
});
test('opening a favorite clears incompatible filters and selects its exact canonical work',()=>{
 const selected=works[249],calls=[];
 const api={ARTWORKS:works,state:{search:'other',unit:'2'},selectUnit(unit){calls.push(['unit',unit]);this.state={unit,search:''};},groupBySite(list){return [{siteToken:'site',works:list}];},selectArtwork(...args){calls.push(['select',...args]);}};
 assert.equal(openArtworkFavorite(api,{id:selected.id,kind:'artwork'}),true);
 assert.deepEqual(calls,[['unit',String(selected.unit)],['select',selected.id,'site',true]]);
 assert.equal(openArtworkFavorite(api,{id:'missing',kind:'artwork'}),false);
 assert.equal(openArtworkFavorite(api,{id:selected.id,kind:'flashcard'}),false);
});
function setup(query='?hostOrigin=https%3A%2F%2Fhost.example'){
 const messages=[],listeners={},parent={postMessage:(...args)=>messages.push(args)};
 const win={parent,location:{search:query},addEventListener:(key,fn)=>listeners[key]=fn,removeEventListener:()=>{},get localStorage(){throw Error('blocked');}};
 let updates=0,opened=0;
 const control=createFavoritesController(win,works,()=>updates++,()=>{opened++;return true;});
 const event=(data,extra={})=>listeners.message?.({source:parent,origin:'https://host.example',data:{namespace:'magic-history',version:1,module:'art',...data},...extra});
 return {control,messages,event,parent,get updates(){return updates;},get opened(){return opened;}};
}
test('trusted init and sync replace local mirror; toggle sends bounded canonical metadata',()=>{
 const f=setup(),item=favoriteForArtwork(works[0]);
 f.event({type:'init',favorites:[item]});assert.equal(f.control.has(item.id),true);
 f.control.toggle(item.id);assert.deepEqual(f.messages.at(-1),[{namespace:'magic-history',version:1,module:'art',type:'favorite-change',action:'remove',item},'https://host.example']);
 f.event({type:'favorites-sync',items:[]});assert.equal(f.control.has(item.id),false);
 f.event({type:'favorites-sync',items:[{...item,title:'<bad>',url:'https://evil'}]});
 assert.equal(f.control.has(item.id),true);f.control.toggle(item.id);assert.deepEqual(f.messages.at(-1)[0].item,item);
});
test('messages require explicit valid origin, parent source, identity and supported items',()=>{
 const f=setup(),item=favoriteForArtwork(works[0]);
 for(const extra of [{source:{}},{origin:'https://evil.example'},{data:{namespace:'magic-history',version:1,module:'apwh',type:'init',favorites:[item]}},{data:{namespace:'other',version:1,module:'art',type:'init',favorites:[item]}},{data:{namespace:'magic-history',version:2,module:'art',type:'init',favorites:[item]}}])f.event({type:'init',favorites:[item]},extra);
 assert.equal(f.control.has(item.id),false);
 f.event({type:'init',favorites:[{...item,kind:'wrong'},{...item,id:'missing'}]});assert.equal(f.control.has(item.id),false);
 f.event({type:'open-favorite',item:{id:item.id,kind:'artwork'}});assert.equal(f.opened,1);assert.equal(f.messages.at(-1)[0].type,'favorite-opened');
 const invalid=setup('?hostOrigin=*');invalid.control.toggle(item.id);assert.equal(invalid.messages.length,0);
});
test('standalone favorites survive reload when storage is available',()=>{
 const data=new Map(),win={location:{search:''},parent:null,localStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)},addEventListener(){},removeEventListener(){}};win.parent=win;
 createFavoritesController(win,works).toggle(works[0].id);
 assert.equal(createFavoritesController(win,works).has(works[0].id),true);
});
