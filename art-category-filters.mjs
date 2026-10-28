// Explicit browsing memberships across all ten Units. These do not replace authored types.
// Composite works may appear in more than one category; AP245 remains a metal sculpture.
export const CATEGORIES = [
 {id:'painting',label:'绘画、版画与平面图像',aps:[1,2,4,24,32,40,48,50,54,55,59,61,63,64,66,68,71,72,73,74,75,76,77,78,79,80,81,82,83,85,86,87,90,91,92,94,95,96,97,98,99,100,101,103,105,106,107,108,109,111,113,114,115,116,118,120,121,122,123,125,126,128,130,131,132,133,134,136,137,140,141,142,143,145,146,149,165,189,190,194,201,203,205,208,210,211,212,219,220,226,227,232,234,242,246,247]},
 {id:'sculpture',label:'雕塑与立体作品',aps:[3,6,9,10,14,15,17,18,19,22,23,25,27,28,29,31,34,35,36,37,38,41,42,43,45,47,62,69,77,89,104,119,129,138,144,150,157,160,164,169,171,172,173,174,175,176,179,180,182,184,193,195,197,202,214,216,217,218,222,228,230,237,244,245]},
 {id:'architecture',label:'建筑与纪念空间',aps:[8,12,17,20,21,26,30,31,32,35,38,39,44,45,46,48,49,51,52,56,58,60,63,65,67,70,82,84,88,93,102,112,124,135,139,147,152,153,154,155,156,157,159,161,167,168,181,183,185,186,192,195,197,198,199,200,206,207,209,213,214,225,240,249]},
 {id:'photography',label:'摄影',aps:[110,117,127,137,223,231,235,241]},
 {id:'installation',label:'地景、装置与行为',aps:[148,151,224,229,233,236,238,239,243,248,250]},
 {id:'books',label:'书籍与手稿',aps:[24,50,55,61,64,81,187,189,190,208,229]},
 {id:'objects',label:'工艺与仪式器物',aps:[5,7,11,13,16,23,29,33,53,57,58,153,160,164,166,170,173,174,175,177,178,188,196,204,216,218,221,222]},
 {id:'textiles',label:'纺织与服饰',aps:[59,158,162,163,165,175,178,191,194,215,219,223]}
];
export function categoriesForWorks(works) {
 return CATEGORIES.filter(category=>works.some(work=>categoryIncludes(work,category.id)));
}
export function categoryIncludes(work,id) {
 return !id || !!CATEGORIES.find(c=>c.id===id)?.aps.includes(work.apNumber);
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
 const allWorks=api.ARTWORKS;
 const currentWorks=()=>state.unit==='all'?allWorks:allWorks.filter(w=>w.unit===Number(state.unit));
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
 const note=node('p','','category-filter-note');
 summary.append(status,clear,chips,note);filters.append(summary);
 state.studyCategory ||= '';
 state.studyCategoryAps ||= null;

 function resetSelection(){
  Object.assign(state,{selectedId:null,activeUnit:state.unit==='all'?null:Number(state.unit),activeRegion:null,expandedSiteToken:null,pendingFocusParentKey:null,activeDetailTab:'quick'});
 }
 function sync(){
  const works=currentWorks();
  const available=categoriesForWorks(works);
  filters.classList.add('has-category-filters');
  const context=api.filterWorks(works,{...state,studyCategory:'',workType:''});
  setFilterOptions(category,[{value:'',label:`全部类别 · ${context.length}`},...categoryCounts(context).filter(c=>available.some(a=>a.id===c.id)).map(c=>({value:c.id,label:`${c.label} · ${c.count}`}))],state.studyCategory||'');
  const options=exactTypeOptions(works,state.studyCategory,context);
  const categoryTotal=context.filter(w=>categoryIncludes(w,state.studyCategory)).length;
  setFilterOptions(type,[{value:'',label:`全部具体类型 · ${categoryTotal}`},...options.map(o=>({value:o.value,label:`${o.value} · ${o.count}`}))],state.workType);
  const filtered=api.filterWorks(works,state);
  status.textContent=`显示 ${filtered.length} / ${works.length} 件作品`;
  note.textContent=state.unit==='10'?'类别可交叉：《天书》同时收录于书籍与装置。':'类别是浏览辅助，可交叉收录；组合建筑、手稿和仪式作品可见于多个类别，类别数量不应直接相加。';
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
  if(event.target.closest('.empty-state .clear-button')){
   event.preventDefault();event.stopImmediatePropagation();resetAll();
  }
 },true);
 unit.addEventListener('change',sync);
 sync();
}
if(typeof document!=='undefined'&&window.ArtHistoryMap)mount(document,window.ArtHistoryMap);
