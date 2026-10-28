// Unit 10 browsing memberships; exact authored work types are never rewritten.
export const CATEGORIES = [
 {id:'painting',label:'绘画与素描',aps:[226,227,232,234,242,246,247]},
 {id:'sculpture',label:'雕塑与立体作品',aps:[228,230,237,244,245]},
 {id:'architecture',label:'建筑与纪念空间',aps:[225,240,249]},
 {id:'photography',label:'摄影',aps:[231,235,241]},
 {id:'installation',label:'装置、影像与行为',aps:[224,229,233,236,238,239,243,248,250]},
 {id:'books',label:'书籍与文字作品',aps:[229]}
];
export function categoryIncludes(work,id) {
 return !id || (work.unit===10 && !!CATEGORIES.find(c=>c.id===id)?.aps.includes(work.apNumber));
}
export function categoryCounts(works) {
 return CATEGORIES.map(c=>({id:c.id,label:c.label,count:works.filter(w=>categoryIncludes(w,c.id)).length}));
}
export function exactTypeOptions(works,id,context=works) {
 return [...new Set(works.filter(w=>categoryIncludes(w,id)).map(w=>w.workType))]
  .sort((a,b)=>a.localeCompare(b,'en'))
  .map(value=>({value,count:context.filter(w=>w.workType===value&&categoryIncludes(w,id)).length}));
}

export function setFilterOptions(select,options,value) {
 const expected=JSON.stringify(options.map(o=>[o.value,o.label]));
 // Native course handlers also rebuild this select; inspect the actual DOM.
 const current=JSON.stringify(Array.from(select.options,o=>[o.value,o.textContent]));
 if(current!==expected){
  select.replaceChildren(...options.map(o=>{
   const option=select.ownerDocument.createElement('option');
   option.textContent=o.label;option.value=o.value;return option;
  }));
 }
 select.value=value;
}

function mount(document,api) {
 const win=document.defaultView, state=api.state;
 const works=api.ARTWORKS.filter(w=>w.unit===10);
 const filters=document.getElementById('filterContainer');
 const unit=document.getElementById('unitFilter'),type=document.getElementById('typeFilter');
 const node=(tag,text,className)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;};
 const field=node('label','作品类别','filter-label category-filter-field');
 const category=node('select');category.id='studyCategory';category.setAttribute('aria-label','作品类别');field.htmlFor=category.id;field.append(category);
 type.parentElement.before(field);
 type.parentElement.firstChild.textContent='具体类型';type.setAttribute('aria-label','具体类型');
 const summary=node('div','','category-filter-summary');
 const status=node('p');status.setAttribute('role','status');
 const clear=node('button','清除筛选','category-filter-clear');clear.type='button';
 const chips=node('div','','category-filter-chips');
 const note=node('p','类别可交叉：《天书》同时收录于书籍与装置。','category-filter-note');
 summary.append(status,clear,chips,note);filters.append(summary);
 state.studyCategory ||= '';
 state.studyCategoryAps ||= null;

 function resetSelection(){
  Object.assign(state,{selectedId:null,activeUnit:10,activeRegion:null,expandedSiteToken:null,pendingFocusParentKey:null,activeDetailTab:'quick'});
 }
 function sync(){
  const enabled=state.unit==='10';
  field.hidden=!enabled;summary.hidden=!enabled;
  filters.classList.toggle('has-category-filters',enabled);
  type.parentElement.firstChild.textContent=enabled?'具体类型':'作品类型';
  type.setAttribute('aria-label',enabled?'具体类型':'作品类型');
  if(!enabled){state.studyCategory='';state.studyCategoryAps=null;return;}
  const context=api.filterWorks(works,{...state,unit:'10',studyCategory:'',workType:''});
  setFilterOptions(category,[{value:'',label:`全部类别 · ${context.length}`},...categoryCounts(context).map(c=>({value:c.id,label:`${c.label} · ${c.count}`}))],state.studyCategory||'');
  const options=exactTypeOptions(works,state.studyCategory,context);
  const categoryTotal=context.filter(w=>categoryIncludes(w,state.studyCategory)).length;
  setFilterOptions(type,[{value:'',label:`全部具体类型 · ${categoryTotal}`},...options.map(o=>({value:o.value,label:`${o.value} · ${o.count}`}))],state.workType);
  const filtered=api.filterWorks(works,state);
  status.textContent=`显示 ${filtered.length} / 27 件作品`;
  clear.disabled=!state.studyCategory&&!state.workType&&!state.period&&state.culture==='all'&&!state.search.trim();
  chips.replaceChildren();
  const chip=(label,action)=>{const button=node('button',label+' ×','category-filter-chip');button.type='button';button.setAttribute('aria-label','移除'+label+'筛选');button.addEventListener('click',action);chips.append(button);};
  if(state.studyCategory)chip(CATEGORIES.find(c=>c.id===state.studyCategory).label,()=>{state.studyCategory='';state.studyCategoryAps=null;state.workType='';resetSelection();api.fitCurrentWorks();sync();category.focus();});
  if(state.workType)chip(state.workType,()=>{state.workType='';resetSelection();api.fitCurrentWorks();sync();type.focus();});
 }
 category.addEventListener('change',()=>{
  state.studyCategory=category.value;state.studyCategoryAps=CATEGORIES.find(c=>c.id===category.value)?.aps||null;state.workType='';resetSelection();api.fitCurrentWorks();sync();
 });
 type.addEventListener('change',sync);
 filters.addEventListener('input',event=>{if(event.target.id==='searchInput')sync();});
 document.getElementById('periodFilter').addEventListener('change',sync);
 filters.addEventListener('click',event=>{if(event.target.closest('[data-culture]'))sync();});
 document.addEventListener('art-filter-context',sync);
 function resetAll(){
  state.studyCategory='';state.studyCategoryAps=null;unit.value=state.unit;unit.dispatchEvent(new win.Event('change',{bubbles:true}));sync();category.focus();
 }
 clear.addEventListener('click',resetAll);
 document.addEventListener('click',event=>{
  if(state.unit==='10'&&event.target.closest('.empty-state .clear-button')){
   event.preventDefault();event.stopImmediatePropagation();resetAll();
  }
 },true);
 unit.addEventListener('change',sync);
 sync();
}
if(typeof document!=='undefined'&&window.ArtHistoryMap)mount(document,window.ArtHistoryMap);
