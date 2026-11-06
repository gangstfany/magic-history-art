/** Student task shortcuts; canonical course data and the map stay authoritative. */
export function orderedWorks(items){return [...items].sort((a,b)=>a.apNumber-b.apNumber);}
export function globalSearchFilters(state){return {...state,unit:'all',culture:'all',period:'',periodGroupAps:null,workType:'',studyCategory:'',studyCategoryAps:null,favoritesOnly:false,favoriteIds:[]};}
export function adjacentWorkIds(items,id){const i=items.findIndex(w=>w.id===id);return {previous:i>0?items[i-1].id:null,next:i>=0&&i<items.length-1?items[i+1].id:null,position:i+1,total:items.length};}
export function metadataIsOpen(preferences,id){return preferences.get(id)??true;}
export function recentArtwork(value,works){try{const record=JSON.parse(value);return works.find(work=>work.id===record?.id)??null;}catch{return null;}}
export function mountLearningFlow(doc,api){
 const win=doc.defaultView,state=api.state,panel=doc.getElementById('detailPanel'),filters=doc.getElementById('filterContainer');
 if(!panel||!filters)return;
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(text,action,cls='afl-button')=>{const e=make('button',text,cls);e.type='button';e.addEventListener('click',action);return e;};
 const scope=()=>state.unit==='all'?'全部作品':`Unit ${state.unit}`;
 let mode='explore',origin=null,returning=null,observer,changingFavorites=false,renderedId=null;
 const metadataOpen=new Map();
 const recentKey='magic-history-art:last-work:v1';
 let lastWork=null;try{lastWork=recentArtwork(win.localStorage.getItem(recentKey),api.ARTWORKS);}catch{}

 const nav=make('nav','','afl-navigation');nav.setAttribute('aria-label','艺术史学习入口');
 const navItems=[['explore','地图'],['favorites','我的收藏']];
 for(const [key,label]of navItems){const b=button(label,()=>setMode(key));b.dataset.learningMode=key;nav.append(b);}
 const header=make('header','','afl-course-header');
 header.append(make('h2','Art History Map'),nav);filters.before(header);
 filters.classList.add('afl-compact-toolbar');
 doc.getElementById('unitFilter').closest('label').classList.add('afl-unit-field');
 doc.getElementById('searchInput').closest('label').classList.add('afl-search-field');
 const more=filters.querySelector('.category-filter-more');
 const filterSummary=filters.querySelector('.category-filter-summary');
 if(more&&filterSummary){
  const body=make('div','','afl-filter-body');
  body.append(doc.getElementById('periodFilter').closest('label'),doc.getElementById('studyCategory').closest('label'),doc.getElementById('typeFilter').closest('label'));
  const culture=doc.getElementById('cultureFilters');if(culture)body.append(culture);
  const clear=filterSummary.querySelector('.category-filter-clear'),note=filterSummary.querySelector('.category-filter-note');
  if(clear)body.append(clear);if(note)body.append(note);more.append(body);
  const count=filterSummary.querySelector('[role="status"]');if(count){count.classList.add('afl-toolbar-count');filters.append(count);}
  const chips=filterSummary.querySelector('.category-filter-chips');if(chips)filters.append(chips);
  filterSummary.remove();
 }
 const favoriteIds=()=>api.ARTWORKS.filter(w=>api.artworkFavorites?.has(w.id)).map(w=>w.id);
 const current=()=>orderedWorks(api.filterWorks(api.ARTWORKS,state));
 function setMode(next){
  mode=next;origin=null;state.selectedId=null;state.activeRegion=null;state.expandedSiteToken=null;
  state.favoritesOnly=next==='favorites';state.favoriteIds=favoriteIds();
  if(next==='favorites')api.selectUnit('all');else api.fitCurrentWorks();
 }
 function searchAll(){
  const query=state.search;mode='list';origin=null;state.favoritesOnly=false;
  api.selectUnit('all');state.search=query;doc.getElementById('searchInput').value=query;api.fitCurrentWorks();
 }
 function rememberOrigin(id){
  if(state.selectedId)return;
  const cards=[...panel.querySelectorAll('.as-work-card[data-link-work]')];
  origin={mode,region:state.activeRegion,transform:{...state.transform},panelScroll:panel.scrollTop,pageScroll:win.scrollY,
   ids:cards.map(c=>c.dataset.linkWork),workId:id};
 }
 function openWork(work){
  rememberOrigin(work.id);
  const site=api.groupBySite(current()).find(g=>g.works.some(w=>w.id===work.id));
  api.selectArtwork(work.id,site?.siteToken,true);
 }
 function restoreOrigin(){
  const id=state.selectedId;
  if(!origin){mode='list';state.selectedId=null;state.activeRegion=null;api.fitCurrentWorks();return;}
  const saved=origin;mode=saved.mode;state.selectedId=null;state.activeRegion=saved.region;state.transform={...saved.transform};
  returning={...saved,workId:id};api.render();api.applyTransform();
 }
 function cards(items,onSelect=openWork){
  const list=make('div','','as-work-list');
  for(const work of items){
   const card=button('',()=>onSelect(work),'as-work-card');card.dataset.linkWork=work.id;card.dataset.learningWork=work.id;
   card.setAttribute('aria-label',`查看 AP ${work.apNumber} ${work.titleEn}`);
   const thumb=make('span',String(work.apNumber),'as-thumb');
   const media=api.getArtworkImages(work).find(v=>v.imageUrl);
   if(media){const image=make('img');image.src=media.imageUrl;image.alt='';image.loading='lazy';image.addEventListener('error',()=>thumb.replaceChildren(make('span',`AP ${work.apNumber}`)),{once:true});thumb.replaceChildren(image);}
   const copy=make('span','','as-work-copy');copy.append(make('span',`AP ${work.apNumber} · Unit ${work.unit}`,'as-ap'),make('strong',work.titleEn),make('small',work.titleZh),make('small',work.date));card.append(thumb,copy,make('span','→'));list.append(card);
  }
  return list;
 }
 function paintStart(){
  if(mode!=='explore'||state.unit!=='all'||state.activeUnit||state.activeRegion||state.search.trim()||state.period||state.studyCategory||state.workType||state.culture!=='all')return;
  const target=panel.querySelector('.instruction,.afl-start');if(!target)return;
  const host=make('section','','afl-start');host.setAttribute('aria-label','艺术史学习起点');
  host.append(make('p','ART HISTORY / 开始学习','as-kicker'),make('h2','从一件作品开始','as-title'),make('p','搜索作品名、艺术家或 AP 编号，也可以从左侧地图或下方 Unit 开始。','afl-start-intro'));
  if(lastWork){
   const resume=make('section','','afl-resume');resume.append(make('h3','继续上次学习','afl-start-heading'));
   const card=cards([lastWork],work=>{mode='explore';origin=null;state.favoritesOnly=false;api.selectUnit(String(work.unit));const site=api.groupBySite(current()).find(group=>group.works.some(item=>item.id===work.id));api.selectArtwork(work.id,site?.siteToken,true);});
   card.querySelector('button').setAttribute('aria-label','继续学习 '+lastWork.titleEn);
   resume.append(card);host.append(resume);
  }
  const heading=make('h3','选择一个 Unit','afl-start-heading');host.append(heading);
  const units=make('div','','afl-unit-list');
  for(let id=1;id<=10;id++){
   const unit=api.getUnitById(id);if(!unit)continue;
   const count=api.ARTWORKS.filter(work=>work.unit===id).length;
   const row=button('',()=>{origin=null;api.selectUnit(String(id));},'afl-unit-link');
   row.setAttribute('aria-label',`进入 Unit ${id} ${unit.nameEn}`);
   row.append(make('span',`U${id}`,'afl-unit-badge'),make('strong',unit.nameEn),make('small',`${count} 件`),make('span','→'));
   units.append(row);
  }
  host.append(units,make('p','选择作品后，可查看图片、形式、语境与作品对比。','afl-start-footer'));target.replaceWith(host);
 }
 function paintList(){
  const query=state.search.trim(),items=current();
  if(!query&&mode==='explore')return;
  const target=panel.querySelector('.instruction,.as-context,.empty-state,.afl-results');if(!target)return;
  const host=make('section','','afl-results');host.setAttribute('aria-label',mode==='favorites'?'收藏作品':'作品列表');
  const title=query?'搜索结果':mode==='favorites'?'我的收藏':'作品列表';
  host.append(make('h2',title,'as-title'),make('p',`${scope()} · ${items.length} 件${query?'匹配作品':''}`,'afl-scope'));
  if(items.length)host.append(cards(items));else host.append(make('p',mode==='favorites'&&!query?'当前范围暂无收藏。可以在作品标题附近收藏，之后从这里继续复习。':'当前筛选范围没有匹配作品。','afl-empty'));
  if(query){
   const global=api.filterWorks(api.ARTWORKS,globalSearchFilters(state));
   const localIds=new Set(items.map(w=>w.id));const extra=global.filter(w=>!localIds.has(w.id));
   host.append(make('p',`搜索范围：${scope()}${state.favoritesOnly?'的收藏作品':''}；时期和类别筛选仍然生效。`,'afl-scope'));
   if(extra.length){host.append(button(`在全部作品中查看 ${global.length} 个结果`,searchAll));host.append(make('p',extra.slice(0,2).map(w=>`Unit ${w.unit} · ${w.titleEn}`).join('；'),'afl-scope'));}
   else if(!items.length)host.append(make('p','全部作品中也没有找到。可尝试作品名、艺术家或 AP 135。','afl-scope'));
  }
  if(mode==='favorites'&&!items.length&&state.unit!=='all')host.append(button('查看全部收藏',()=>setMode('favorites')));
  target.replaceWith(host);
 }
 function paintDetail(){
  const summary=panel.querySelector('.selected-summary');if(!summary||!state.selectedId)return;
  const meta=summary.querySelector('.art-identity-more');if(meta)meta.open=metadataIsOpen(metadataOpen,state.selectedId);
  const siteCycle=summary.querySelector('.site-cycle');if(siteCycle)siteCycle.hidden=Boolean(origin?.ids?.length);
  if(!summary.querySelector('.afl-sequence')){
   const control=make('nav','','afl-sequence');control.setAttribute('aria-label','连续学习');
   const back=button('← 返回列表',restoreOrigin);control.append(back);
   const range=origin?.ids?.length?origin.ids.map(id=>api.ARTWORKS.find(w=>w.id===id)).filter(Boolean):current();
   const step=adjacentWorkIds(range,state.selectedId);
   for(const [id,label]of [[step.previous,'上一件'],[step.next,'下一件']]){
    const b=button(label,()=>openWork(api.ARTWORKS.find(w=>w.id===id)));b.disabled=!id;control.append(b);
   }
   control.append(make('span',`${step.position} / ${step.total}`,'afl-position'));
   const tabs=summary.querySelector('.detail-tabs');summary.insertBefore(control,tabs||summary.firstChild);
  }
 }
 function finishReturn(){
  if(!returning)return;const saved=returning;
  win.requestAnimationFrame(()=>{
   const card=[...panel.querySelectorAll('.as-work-card[data-link-work]')].find(x=>x.dataset.linkWork===saved.workId);
   if(!card)return;
   panel.scrollTop=saved.panelScroll;win.scrollTo({top:saved.pageScroll,behavior:'instant'});
   card.focus({preventScroll:true});
   const bounds=card.getBoundingClientRect(),container=panel.getBoundingClientRect();
   const mobile=win.innerWidth<=664;
   if(mobile?(bounds.top<0||bounds.bottom>win.innerHeight):(bounds.top<container.top||bounds.bottom>container.bottom))card.scrollIntoView({block:'center',behavior:'instant'});
   card.classList.add('afl-returned');returning=null;
  });
 }
 function update(){
  observer?.disconnect();
  doc.dispatchEvent(new win.Event('art-filter-context'));
  for(const b of nav.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.learningMode===mode));
  const fav=nav.querySelector('[data-learning-mode="favorites"]');fav.textContent=`我的收藏 · ${favoriteIds().length}`;
  const scopeHint=doc.getElementById('searchInput');scopeHint.placeholder='作品名、艺术家或 AP 135';scopeHint.setAttribute('aria-description',`搜索${scope()}，也支持常见中文艺术家名`);
  if(state.selectedId){paintDetail();lastWork=api.ARTWORKS.find(work=>work.id===state.selectedId)||lastWork;try{if(lastWork)win.localStorage.setItem(recentKey,JSON.stringify({id:lastWork.id}));}catch{}}else{paintStart();paintList();}
  renderedId=state.selectedId;observer?.observe(panel,{childList:true});finishReturn();
 }
 function refreshFavorites(){
  if(changingFavorites)return;state.favoriteIds=favoriteIds();
  if(state.favoritesOnly){changingFavorites=true;if(state.selectedId&&!state.favoriteIds.includes(state.selectedId))state.selectedId=null;api.fitCurrentWorks();changingFavorites=false;}else update();
 }
 doc.addEventListener('art-before-render',()=>{const meta=panel.querySelector('.art-identity-more');if(meta&&renderedId)metadataOpen.set(renderedId,meta.open);});
 doc.addEventListener('art-after-render',update);
 doc.addEventListener('art-favorites-updated',refreshFavorites);
 doc.addEventListener('click',event=>{
  const card=event.target.closest?.('.as-work-card[data-link-work]');if(card&&panel.contains(card))rememberOrigin(card.dataset.linkWork);
 },true);
 doc.addEventListener('click',event=>{
  if(!event.target.closest?.('.detail-tab'))return;
  win.requestAnimationFrame(()=>{
   const target=panel.querySelector('.detail-tabpanel'),tabs=panel.querySelector('.detail-tabs');if(!target||!tabs)return;
   if(win.innerWidth<=664)target.scrollIntoView({block:'start',behavior:'instant'});
   else panel.scrollTo({top:panel.scrollTop+target.getBoundingClientRect().top-panel.getBoundingClientRect().top-tabs.offsetHeight-16,behavior:'instant'});
  });
 });
 observer=new win.MutationObserver(update);update();
 return ()=>{observer.disconnect();header.remove();};
}
if(typeof document!=='undefined'&&window.ArtHistoryMap)mountLearningFlow(document,window.ArtHistoryMap);
