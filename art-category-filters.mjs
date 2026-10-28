// Explicit browsing memberships across all ten Units. These do not replace authored types.
// Composite works may appear in more than one category; AP245 remains a metal sculpture.
export const CATEGORIES = [
 {id:'painting',label:'Painting, Prints & 2D Images',aps:[1,2,4,24,32,40,48,50,54,55,59,61,63,64,66,68,71,72,73,74,75,76,77,78,79,80,81,82,83,85,86,87,90,91,92,94,95,96,97,98,99,100,101,103,105,106,107,108,109,111,113,114,115,116,118,120,121,122,123,125,126,128,130,131,132,133,134,136,137,140,141,142,143,145,146,149,165,189,190,194,201,203,205,208,210,211,212,219,220,226,227,232,234,242,246,247]},
 {id:'sculpture',label:'Sculpture & 3D Works',aps:[3,6,9,10,14,15,17,18,19,22,23,25,27,28,29,31,34,35,36,37,38,41,42,43,45,47,62,69,77,89,104,119,129,138,144,150,157,160,164,169,171,172,173,174,175,176,179,180,182,184,193,195,197,202,214,216,217,218,222,228,230,237,244,245]},
 {id:'architecture',label:'Architecture & Monuments',aps:[8,12,17,20,21,26,30,31,32,35,38,39,44,45,46,48,49,51,52,56,58,60,63,65,67,70,82,84,88,93,102,112,124,135,139,147,152,153,154,155,156,157,159,161,167,168,181,183,185,186,192,195,197,198,199,200,206,207,209,213,214,225,240,249]},
 {id:'photography',label:'Photography',aps:[110,117,127,137,223,231,235,241]},
 {id:'installation',label:'Land Art, Installation & Performance',aps:[148,151,224,229,233,236,238,239,243,248,250]},
 {id:'books',label:'Books & Manuscripts',aps:[24,50,55,61,64,81,187,189,190,208,229]},
 {id:'objects',label:'Crafts & Ritual Objects',aps:[5,7,11,13,16,23,29,33,53,57,58,153,160,164,166,170,173,174,175,177,178,188,196,204,216,218,221,222]},
 {id:'textiles',label:'Textiles & Dress',aps:[59,158,162,163,165,175,178,191,194,215,219,223,232]}
];
// Broad browsing groups. Precise authored periods and multi-phase dates stay on works.
const range=(start,end)=>Array.from({length:end-start+1},(_,i)=>start+i);
export const BROAD_PERIODS = {
 1:[['Global Prehistory',range(1,11)]],
 2:[['Ancient Near East',[12,14,16,19,25,30]],['Ancient Egypt',[13,15,17,18,20,21,22,23,24]],['Ancient Greece',[26,27,28,33,34,35,36,37,38,41]],['Etruscan Art',[29,31,32]],['Ancient Rome',[39,40,42,43,44,45,46,47]]],
 3:[['Late Antique & Byzantine',[48,49,50,51,52,54]],['Medieval Europe',[53,55,58,59,60,61,62,64]],['Islamic Art',[56,57,65,84]],['Renaissance & Mannerism',[63,...range(66,80),83]],['Baroque, Rococo & Colonial Art',[81,82,...range(85,98)]]],
 4:[['Enlightenment, Rococo & Colonial Art',[99,100,101]],['Neoclassicism & Romanticism',[...range(102,109),111,112,118]],['Realism, Impressionism & Photography',[110,113,114,115,116,117,127]],['Post-Impressionism & Early Modernism',[119,120,121,122,123,124,125,126,128,129]],['Modernist Movements & Architecture',[...range(130,144),147]],['Postwar & Contemporary Art',[145,146,148,149,150,151,152]]],
 5:[['Precontact & Early Colonial Americas',range(153,162)],['Native North America: 19th–20th Centuries',range(163,166)]],
 6:[['African Historical Traditions',range(167,180)]],
 7:[['Ancient West Asia',[181]],['Buddhist Silk Road & Tibet',[182,184]],['Islamic Art & Architecture',[183,...range(185,191)]]],
 8:[['Ancient Asian Traditions',[192,193,194]],['Medieval Asian Traditions',range(195,204)],['Early Modern Asian Traditions',range(205,211)],['Modern Asian Art',[212]]],
 9:[['Pacific Historical Traditions',range(213,223)]],
 10:[['Global Contemporary',range(224,250)]]
};
export function broadPeriodOptions(works,unit) {
 return (BROAD_PERIODS[Number(unit)]||[]).map(([label,aps],index)=>({
  value:`broad:${unit}:${index}`,label,aps,count:works.filter(w=>aps.includes(w.apNumber)).length
 }));
}

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
 const unit=document.getElementById('unitFilter'),type=document.getElementById('typeFilter'),period=document.getElementById('periodFilter');
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
  const broad=broadPeriodOptions(works,state.unit);
  if(state.period&&!broad.some(option=>option.value===state.period))state.period='';
  state.periodGroupAps=broad.find(option=>option.value===state.period)?.aps||null;
  setFilterOptions(period,[{value:'',label:state.unit==='all'?'Select a Unit for Periods':'All Periods'},...broad.map(option=>({value:option.value,label:`${option.label} · ${option.count}`}))],state.period);
  period.disabled=state.unit==='all';
  period.title='Broad browsing groups; precise periods and multi-phase dates remain in artwork details.';
  filters.classList.add('has-category-filters');
  filters.dataset.broadPeriodsReplaceCulture=String(['2','3','4'].includes(String(state.unit)));
  const context=api.filterWorks(works,{...state,studyCategory:'',workType:''});
  setFilterOptions(category,[{value:'',label:`All Categories · ${context.length}`},...categoryCounts(context).filter(c=>available.some(a=>a.id===c.id)).map(c=>({value:c.id,label:`${c.label} · ${c.count}`}))],state.studyCategory||'');
  const options=exactTypeOptions(works,state.studyCategory,context);
  const categoryTotal=context.filter(w=>categoryIncludes(w,state.studyCategory)).length;
  setFilterOptions(type,[{value:'',label:`All Artwork Types · ${categoryTotal}`},...options.map(o=>({value:o.value,label:`${o.value} · ${o.count}`}))],state.workType);
  const filtered=api.filterWorks(works,state);
  status.textContent=`显示 ${filtered.length} / ${works.length} 件作品`;
  note.textContent=state.unit==='10'?'类别可交叉：《天书》收录于书籍与装置；AP232 叙事拼布作品收录于绘画与纺织。':'类别是浏览辅助，可交叉收录；组合建筑、手稿和仪式作品可见于多个类别，类别数量不应直接相加。';
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
 // Capture membership before the native handler fits the map.
 period.addEventListener('change',()=>{
  state.periodGroupAps=broadPeriodOptions(currentWorks(),state.unit).find(option=>option.value===period.value)?.aps||null;
 },true);
 period.addEventListener('change',sync);
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
