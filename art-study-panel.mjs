/** Linked map/list navigation for each course Unit; All Units keeps its overview. */
const UNIT_LABELS_ZH = {
  1:'全球史前艺术', 2:'古代地中海艺术', 3:'早期欧洲与殖民时期美洲',
  4:'后期欧洲与美洲艺术', 5:'美洲原住民艺术', 6:'非洲艺术',
  7:'西亚与中亚艺术', 8:'南亚、东亚与东南亚艺术', 9:'太平洋地区艺术', 10:'全球当代艺术'
};
export function hasStudyUnit(unit) {
  return Object.hasOwn(UNIT_LABELS_ZH, unit);
}
export function deriveStudyContext(items, groups, state) {
  if (!hasStudyUnit(state.unit)) return null;
  const selected = items.find(work => work.id === state.selectedId) || null;
  const group = selected
    ? groups.find(group => group.works.some(work => work.id === selected.id)) || null
    : groups.find(group => group.key === state.activeRegion) || null;
  return {items, groups, selected, group,
    kind: !items.length ? 'empty' : selected ? 'artwork' : group ? 'region' : 'overview'};
}

export function captureStudyView(state) {
  if (!hasStudyUnit(state.unit) || state.selectedId) return null;
  return {regionKey:state.activeRegion || null, transform:{...state.transform}};
}

export function isStudyMapTargetLinked(target, tokens, ids) {
  return target.kind === 'site' ? tokens.includes(target.siteToken) : ids.includes(target.workId);
}

export function getStudyThumbnail(work, getArtworkImages) {
  return getArtworkImages(work).find(image=>image.imageUrl) || null;
}

export function returnToStudyRegion(api, group, cachedTransform) {
  Object.assign(api.state,{selectedId:null,activeRegion:group.key,
    activeUnit:Number(api.state.unit),expandedSiteToken:null});
  if (!cachedTransform) { api.expandSiteGroup(group); return; }
  api.state.transform={...cachedTransform};
  api.render();api.applyTransform();
}

export function returnToStudyUnit(api, cachedTransform) {
  Object.assign(api.state,{selectedId:null,activeRegion:null,
    activeUnit:Number(api.state.unit),expandedSiteToken:null});
  if (!cachedTransform) { api.fitCurrentWorks(); return; }
  api.state.transform={...cachedTransform};
  api.render();api.applyTransform();
}

export function findStudyFocusTarget(key, controls, fallback) {
  if (!key) return null;
  return Array.from(controls).find(control=>control.dataset.studyFocus===key) || fallback;
}

export function mountStudyPanel(doc, api) {
const panel=doc.getElementById('detailPanel'),state=api.state;
const node=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,cls,action,key)=>{const e=node('button',text,cls);e.type='button';if(key)e.dataset.studyFocus=key;e.addEventListener('click',action);return e;};
let overviewTransform=null,regionTransforms=new Map(),focusContext=false,pendingFocus=null;
const visible=()=>api.filterWorks(api.ARTWORKS,state);
const regions=()=>api.groupByConfiguredRegion(visible(),Number(state.unit));
const regionOf=work=>regions().find(g=>g.works.some(w=>w.id===work.id));
function showOverview(){focusContext='context';returnToStudyUnit(api,overviewTransform);}
function showRegion(group){if(!group)return;focusContext=true;overviewTransform=state.activeRegion?overviewTransform:{...state.transform};state.selectedId=null;api.expandSiteGroup(group);regionTransforms.set(group.key,{...state.transform});}
function showWork(work){const group=regionOf(work);if(group){if(state.activeRegion===group.key)regionTransforms.set(group.key,{...state.transform});}const site=api.groupBySite(visible()).find(g=>g.works.some(w=>w.id===work.id));focusContext='artwork';api.selectArtwork(work.id,site?.siteToken,false);}
function backToRegion(group){focusContext='context';returnToStudyRegion(api,group,regionTransforms.get(group.key));}
function crumbs(group,work){const nav=node('nav','','as-breadcrumb');nav.setAttribute('aria-label','学习位置');nav.append(button('← Unit '+state.unit,'',showOverview,'unit:'+state.unit));if(group){nav.append(node('span','/'));if(work)nav.append(button(group.siteName,'',()=>backToRegion(group),'back-region:'+group.key));else nav.append(node('span',group.siteName));}if(work)nav.append(node('span','/ AP '+work.apNumber));return nav;}
function help(host){const d=node('details');const summary=node('summary','如何使用地图');summary.dataset.studyFocus='help:'+state.unit;d.append(summary,node('p','点击地图或右侧地区进入作品列表；点击作品查看详情。鼠标经过任一侧条目，对应位置会高亮。顶部路径可返回，筛选条件会保留。手机端直接点击即可。'));host.append(d);}
function workCard(work){const card=button('','as-work-card',()=>showWork(work));card.dataset.linkWork=work.id;card.dataset.studyFocus='work:'+work.id;card.setAttribute('aria-label','查看 AP '+work.apNumber+' '+work.titleEn);const thumb=node('span','','as-thumb');thumb.append(node('span',String(work.apNumber)));const image=getStudyThumbnail(work,api.getArtworkImages);if(image){const img=node('img');img.src=image.imageUrl;img.alt='';img.loading='lazy';img.addEventListener('error',()=>thumb.replaceChildren(node('span','AP '+work.apNumber)),{once:true});thumb.replaceChildren(img);}const copy=node('span','','as-work-copy');copy.append(node('span','AP '+work.apNumber,'as-ap'),node('strong',work.titleEn),node('small',work.titleZh),node('small',work.date));card.append(thumb,copy,node('span','→'));return card;}
function buildContext(){const context=deriveStudyContext(visible(),regions(),state);if(!context)return;const {groups,items,selected,group}=context;if(context.kind==='overview')overviewTransform={...state.transform};if(context.kind==='region')regionTransforms.set(group.key,{...state.transform});if(selected){const title=panel.querySelector('[data-selected-artwork-title]');if(title)title.dataset.studyFocus='artwork-title:'+selected.id;if(!panel.querySelector('.as-breadcrumb'))panel.insertBefore(crumbs(group,selected),panel.querySelector('.selected-summary'));return;}
 const count=panel.querySelector('.result-count');if(count)count.textContent=group?`当前地区 ${group.works.length} 件 · 单元匹配 ${items.length} 件`:`单元匹配 ${items.length} 件作品`;
 const old=panel.querySelector('.instruction');if(!old)return;
 const host=node('section','','as-context');host.setAttribute('aria-label','单元学习面板');
 if(group){host.append(crumbs(group),node('p','REGION / 地区学习','as-kicker'),node('h2',group.siteName,'as-title'),node('p',`${group.works.length} 件匹配作品 · 点击作品，地图会同步定位。`,'as-subtitle'));const list=node('div','','as-work-list');for(const work of group.works)list.append(workCard(work));host.append(list);}
 else{host.append(node('p',`UNIT ${String(state.unit).padStart(2,'0')} / EXPLORE`,'as-kicker'),node('h2',UNIT_LABELS_ZH[state.unit],'as-title'),node('p',api.getUnitById(Number(state.unit)).nameEn,'as-subtitle'));const stats=node('div','','as-summary');for(const [count,label]of [[items.length,'当前匹配作品'],[groups.length,'可探索地区']]){const block=node('div');block.append(node('strong',String(count)),node('span',label));stats.append(block);}host.append(stats,node('p','从地图上的地区开始，也可以直接选择下方入口。','as-hint'));const h=node('h3','','as-section-title');h.append(node('strong','选择一个地区'),node('span','与地图同步'));host.append(h);const list=node('div','','as-region-list');groups.forEach((g,i)=>{const row=button('','as-region-row',()=>showRegion(g));row.dataset.linkRegion=g.key;row.dataset.studyFocus='region:'+g.key;const copy=node('span');copy.append(node('strong',g.siteName),node('small',`${g.works.length} 件作品 · ${api.formatApGroupLabel(g.works)}`));row.append(node('span',String(i+1).padStart(2,'0'),'as-region-index'),copy,node('span','→'));list.append(row);});host.append(list);}
 help(host);old.replaceWith(host);const title=host.querySelector('.as-title');title.tabIndex=-1;title.dataset.studyFocus=group?'heading:'+group.key:'heading:unit-'+state.unit;
}
let observer,previousFilters='';
function capturePanelFocus(){
  const active=doc.activeElement;
  pendingFocus=panel.contains(active)&&active.dataset.studyFocus
    ? {key:active.dataset.studyFocus,scrollTop:panel.scrollTop}:null;
}
doc.addEventListener('art-before-render',capturePanelFocus);
function update(){
  observer.disconnect();
  const signature=JSON.stringify([state.unit,state.culture,state.period,state.workType,state.studyCategory,state.search]);
  if(signature!==previousFilters){overviewTransform=null;regionTransforms.clear();previousFilters=signature;}
  doc.body.classList.toggle('has-unit-study',hasStudyUnit(state.unit));
  if(hasStudyUnit(state.unit))buildContext();else clearHighlights();
  const heading=panel.querySelector('[data-selected-artwork-title],.as-title,.empty-state h2');
  let target=null;
  if(focusContext)target=focusContext==='artwork'?panel.querySelector('[data-selected-artwork-title]'):heading;
  else if(pendingFocus){
    target=findStudyFocusTarget(pendingFocus.key,panel.querySelectorAll('[data-study-focus]'),heading);
    if(target?.dataset.studyFocus===pendingFocus.key)panel.scrollTop=pendingFocus.scrollTop;
  }
  if(target){target.tabIndex=target.tabIndex<0?-1:target.tabIndex;target.focus({preventScroll:true});}
  focusContext=false;pendingFocus=null;
  observer.observe(panel,{childList:true});
}
observer=new MutationObserver(update);observer.observe(panel,{childList:true});

function clearHighlights(){doc.querySelectorAll('.is-study-linked').forEach(e=>e.classList.remove('is-study-linked'));}
function highlight(regionKey,ids=[]){clearHighlights();doc.querySelectorAll('[data-link-region],[data-link-work]').forEach(e=>{if(e.dataset.linkRegion===regionKey||ids.includes(e.dataset.linkWork))e.classList.add('is-study-linked');});const sites=api.groupBySite(visible());const tokens=sites.filter(g=>g.works.some(w=>ids.includes(w.id))).map(g=>g.siteToken);const region=regions().find(g=>g.key===regionKey);if(region)tokens.push(region.siteToken);doc.querySelectorAll('.site-marker,.expanded-work-pin,.expanded-pin-list-button[data-work-id]').forEach(e=>{if(isStudyMapTargetLinked({kind:e.classList.contains('site-marker')?'site':'work',siteToken:e.dataset.siteToken,workId:e.dataset.workId},tokens,ids))e.classList.add('is-study-linked');});}
function onHover(event){if(!hasStudyUnit(state.unit))return;const row=event.target.closest('[data-link-region],[data-link-work]');if(row){const work=api.ARTWORKS.find(w=>w.id===row.dataset.linkWork);highlight(row.dataset.linkRegion||regionOf(work||{})?.key,work?[work.id]:[]);return;}const marker=event.target.closest('.site-marker,.expanded-work-pin,.expanded-pin-list-button[data-work-id]');if(!marker)return;const region=regions().find(g=>g.siteToken===marker.dataset.siteToken);const site=api.groupBySite(visible()).find(g=>g.siteToken===marker.dataset.siteToken);const work=api.ARTWORKS.find(w=>w.id===marker.dataset.workId);highlight(region?.key||regionOf(work||site?.works[0]||{})?.key,work?[work.id]:(site?.works.map(w=>w.id)||[]));}
function rememberNativeView(event) {
  if(event.type==='keydown'&&!['Enter',' ','Spacebar'].includes(event.key))return;
  if(!event.target.closest('.site-marker,.expanded-work-pin,.expanded-pin-list-button[data-work-id]'))return;
  const snapshot=captureStudyView(state);
  if(!snapshot)return;
  if(snapshot.regionKey)regionTransforms.set(snapshot.regionKey,snapshot.transform);
  else overviewTransform=snapshot.transform;
}
doc.addEventListener('click',rememberNativeView,true);
doc.addEventListener('keydown',rememberNativeView,true);
doc.addEventListener('pointerover',onHover);doc.addEventListener('focusin',onHover);doc.addEventListener('focusout',event=>{if(!event.relatedTarget?.closest?.('[data-link-region],[data-link-work],.site-marker,.expanded-work-pin,.expanded-pin-list-button[data-work-id]'))clearHighlights();});doc.addEventListener('pointerout',event=>{if(!event.relatedTarget?.closest?.('[data-link-region],[data-link-work],.site-marker,.expanded-work-pin,.expanded-pin-list-button[data-work-id]'))clearHighlights();});
update();

}
if(typeof document!=='undefined'&&window.ArtHistoryMap)mountStudyPanel(document,window.ArtHistoryMap);
