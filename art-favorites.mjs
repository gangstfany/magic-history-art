/** Artwork favorites: the host owns embedded state; standalone pages keep a local fallback. */
import {validHostOrigin} from './module-bridge.mjs';
const IDENTITY=Object.freeze({namespace:'magic-history',version:1,module:'art'});
const plain=(value,limit)=>String(value ?? '').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,limit);
export function favoriteForArtwork(work){
 return {id:work.id,kind:'artwork',title:plain(work.titleEn || work.titleZh,180),
  subtitle:plain(`AP ${work.apNumber} · ${work.titleZh || ''}`,240),unit:String(work.unit)};
}
export function openArtworkFavorite(api,item){
 if(item?.kind!=='artwork'||typeof item.id!=='string'||item.id.length>140)return false;
 const work=api.ARTWORKS.find(work=>work.id===item.id);if(!work)return false;
 // The existing Unit action clears every filter and resets the map branch.
 api.selectUnit(String(work.unit));
 const group=api.groupBySite(api.ARTWORKS.filter(candidate=>candidate.unit===work.unit))
  .find(group=>group.works.some(candidate=>candidate.id===work.id));
 api.selectArtwork(work.id,group?.siteToken,true);
 return true;
}
export function createFavoritesController(win,works,onChange=()=>{},open=()=>false){
 const requested=new URLSearchParams(win.location.search).get('hostOrigin');
 const embedded=win.parent!==win&&validHostOrigin(requested);
 const hostOrigin=embedded?requested:null;
 const storageKey=embedded?`magic-history.art.favorites.v1:${hostOrigin}`:'magic-history.art.favorites.v1';
 const catalogue=new Map(works.map(work=>[work.id,favoriteForArtwork(work)]));
 let favorites=new Set();
 const known=item=>item?.kind==='artwork'&&typeof item.id==='string'&&item.id.length<=140&&catalogue.has(item.id);
 function replace(items){
  if(!Array.isArray(items)||items.length>250)return;
  favorites=new Set(items.filter(known).map(item=>item.id));save();onChange();
 }
 function save(){try{win.localStorage.setItem(storageKey,JSON.stringify([...favorites].map(id=>catalogue.get(id))));}catch{}}
 // Embedded snapshots are mirrors only: a new host init always establishes truth.
 if(!embedded){try{replace(JSON.parse(win.localStorage.getItem(storageKey)||'[]'));}catch{}}
 const send=data=>{if(embedded)win.parent.postMessage({...IDENTITY,...data},hostOrigin);};
 const receive=event=>{
  const data=event.data;
  if(!embedded||event.source!==win.parent||event.origin!==hostOrigin||!data||data.namespace!==IDENTITY.namespace||data.version!==1||data.module!=='art')return;
  if(data.type==='init')replace(data.favorites);
  else if(data.type==='favorites-sync')replace(data.items);
  else if(data.type==='open-favorite'&&known(data.item)){
   const ok=open({id:data.item.id,kind:'artwork'});
   send({type:'favorite-opened',ok:!!ok,id:data.item.id,kind:'artwork'});
  }
 };
 win.addEventListener('message',receive);
 return {has:id=>favorites.has(id),toggle(id){
  const item=catalogue.get(id);if(!item)return;
  const action=favorites.has(id)?'remove':'add';
  if(action==='remove')favorites.delete(id);else favorites.add(id);
  save();onChange();send({type:'favorite-change',action,item});
 },dispose(){win.removeEventListener('message',receive);}};
}
export function mountArtworkFavorites(doc,api){
 const panel=doc.getElementById('detailPanel');if(!panel)return;
 let controller;
 function update(){
  const work=api.ARTWORKS.find(work=>work.id===api.state.selectedId);
  const summary=panel.querySelector('.selected-summary');
  if(!work||!summary)return;
  let button=summary.querySelector('[data-art-favorite]');
  if(!button){button=doc.createElement('button');button.type='button';button.className='art-favorite-button';button.dataset.artFavorite='';summary.append(button);button.addEventListener('click',()=>controller.toggle(api.state.selectedId));}
  const saved=controller.has(work.id);
  button.textContent=saved?'★ 已收藏':'☆ 收藏作品';
  button.setAttribute('aria-pressed',String(saved));
  button.setAttribute('aria-label',`${saved?'取消收藏':'收藏'}：${work.titleZh || work.titleEn}`);
 }
 controller=createFavoritesController(doc.defaultView,api.ARTWORKS,()=>{if(controller)update();},item=>openArtworkFavorite(api,item));
 const observer=new doc.defaultView.MutationObserver(update);
 observer.observe(panel,{childList:true});update();
 return ()=>{controller.dispose();observer.disconnect();};
}
if(typeof document!=='undefined'&&window.ArtHistoryMap)mountArtworkFavorites(document,window.ArtHistoryMap);
