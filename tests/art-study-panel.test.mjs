import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../art-history-map.html',import.meta.url),'utf8');
const works=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]).filter(w=>w.unit===3);
const groups=[...new Set(works.map(w=>w.region))].map(regionId=>({key:`unit-3-region-${regionId}`,regionId,works:works.filter(w=>w.region===regionId)}));
const load=()=>import('../art-study-panel.mjs');
test('U3 context starts with every filtered work and all eight available regions',async()=>{
 const {deriveStudyContext}=await load();
 const context=deriveStudyContext(works,groups,{unit:'3',selectedId:null,activeRegion:null});
 assert.equal(context.kind,'overview');assert.equal(context.items.length,51);assert.equal(context.groups.length,8);
});
test('region drill and artwork detail derive the matching filtered region',async()=>{
 const {deriveStudyContext}=await load();
 const france=groups.find(g=>g.regionId==='france');
 const context=deriveStudyContext(works,groups,{unit:'3',activeRegion:france.key});
 assert.equal(context.kind,'region');assert.equal(context.group.works.length,5);
 const work=works.find(w=>w.apNumber===60);
 const detail=deriveStudyContext(works,groups,{unit:'3',selectedId:work.id,activeRegion:'stale'});
 assert.equal(detail.kind,'artwork');assert.equal(detail.group.key,france.key);assert.equal(detail.selected,work);
});
test('filtering removes stale work/region state and empty results stay empty',async()=>{
 const {deriveStudyContext}=await load();
 const work=works.find(w=>w.apNumber===60),remaining=works.filter(w=>w.apNumber===64);
 const filteredGroups=groups.map(g=>({...g,works:g.works.filter(w=>w.apNumber===64)})).filter(g=>g.works.length);
 const state={unit:'3',selectedId:work.id,activeRegion:'unit-3-region-france'};
 const context=deriveStudyContext(remaining,filteredGroups,state);
 assert.equal(context.kind,'overview');assert.equal(context.items.length,1);assert.equal(context.selected,null);
 assert.equal(deriveStudyContext([],[],state).kind,'empty');
});
test('study panels do not replace All Units or invalid Unit states',async()=>{
 const {deriveStudyContext}=await load();
 for(const unit of ['all','','0','11','invalid'])assert.equal(deriveStudyContext(works,groups,{unit}),null);
});

test('map navigation snapshots retain the latest pan and do not overwrite region view from an open work',async()=>{
 const {captureStudyView}=await load();
 const state={unit:'3',selectedId:null,activeRegion:'unit-3-region-france',transform:{x:-231,y:45,scale:3}};
 const saved=captureStudyView(state);
 state.transform.x=-900;
 assert.deepEqual(saved,{regionKey:'unit-3-region-france',transform:{x:-231,y:45,scale:3}});
 assert.equal(captureStudyView({...state,selectedId:'ap60-chartres-cathedral'}),null);
 assert.equal(captureStudyView({...state,unit:'all'}),null);
});

test('linked work highlighting selects one AP work while retaining its parent site highlight',async()=>{
 const {isStudyMapTargetLinked}=await load();
 const tokens=['rome'],ids=['ap48'];
 assert.equal(isStudyMapTargetLinked({kind:'site',siteToken:'rome'},tokens,ids),true);
 assert.equal(isStudyMapTargetLinked({kind:'work',siteToken:'rome',workId:'ap48'},tokens,ids),true);
 assert.equal(isStudyMapTargetLinked({kind:'work',siteToken:'rome',workId:'ap49'},tokens,ids),false);
});


test('all ten Units derive their own overview, region list and selected artwork',async()=>{
 const {deriveStudyContext,captureStudyView:moduleCapture}=await load();
 const all=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 for(let unit=1;unit<=10;unit++){
  const items=all.filter(w=>w.unit===unit);
  const groups=[...new Set(items.map(w=>w.region))].map(regionId=>({key:`unit-${unit}-region-${regionId}`,works:items.filter(w=>w.region===regionId)}));
  const state={unit:String(unit),activeRegion:null,selectedId:null};
  const overview=deriveStudyContext(items,groups,state);
  assert.ok(overview,`Unit ${unit} must have a panel`);
  assert.equal(overview.kind,'overview');assert.equal(overview.items.length,items.length);
  assert.equal(overview.groups.flatMap(g=>g.works).length,items.length);
  for(const group of groups){
   assert.equal(deriveStudyContext(items,groups,{...state,activeRegion:group.key}).kind,'region');
   const detail=deriveStudyContext(items,groups,{...state,selectedId:group.works[0].id});
   assert.equal(detail.kind,'artwork');assert.equal(detail.group.key,group.key);
  }
  assert.equal(deriveStudyContext([],[],state).kind,'empty');
  assert.deepEqual(captureStudyViewSafe(unit),{regionKey:null,transform:{x:1,y:2,scale:3}});
 }
 function captureStudyViewSafe(unit){return moduleCapture({unit:String(unit),transform:{x:1,y:2,scale:3}});}
});

test('study cards normalize legacy Unit1/2 single images and newer multi-view images',async()=>{
 const {getStudyThumbnail}=await load();
 const source=html.match(/    function getArtworkImages\(work\) \{[\s\S]*?\n    \}/)[0];
 const normalize=Function(source+';return getArtworkImages;')();
 const all=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 for(const work of all.filter(w=>[1,2,3].includes(w.unit))){
  const view=getStudyThumbnail(work,normalize);
  const expected=normalize(work).find(image=>image.imageUrl);
  assert.deepEqual(view,expected||null,work.id);
 }
 assert.equal(getStudyThumbnail({imageUrl:null},normalize),null);
});

test('region return without a cached view reframes its own filtered works and keeps filters',async()=>{
 const {returnToStudyRegion}=await load();
 const state={unit:'3',selectedId:'ap60',activeRegion:null,studyCategory:'architecture',search:'',transform:{x:0,y:0,scale:1}};
 const group={key:'unit-3-region-france',kind:'region',works:[{id:'ap60'}]};
 const calls=[];const api={state,expandSiteGroup:g=>calls.push(g),render:()=>calls.push('render'),applyTransform:()=>calls.push('apply')};
 returnToStudyRegion(api,group,null);
 assert.deepEqual(calls,[group]);assert.equal(state.selectedId,null);assert.equal(state.activeRegion,group.key);
 assert.equal(state.studyCategory,'architecture');assert.equal(state.unit,'3');
 const saved={x:-200,y:15,scale:2};calls.length=0;
 returnToStudyRegion(api,group,saved);saved.x=999;
 assert.deepEqual(state.transform,{x:-200,y:15,scale:2});assert.deepEqual(calls,['render','apply']);
});
test('Unit return fits the current filtered scope if the overview cache was invalidated',async()=>{
 const {returnToStudyUnit}=await load();
 const state={unit:'8',activeRegion:'unit-8-region-china',selectedId:'ap193',search:'warriors',transform:{x:-500,y:0,scale:3}};
 const calls=[];const api={state,fitCurrentWorks:()=>calls.push('fit'),render:()=>calls.push('render'),applyTransform:()=>calls.push('apply')};
 returnToStudyUnit(api,null);
 assert.deepEqual(calls,['fit']);assert.equal(state.activeRegion,null);assert.equal(state.selectedId,null);assert.equal(state.search,'warriors');
 calls.length=0;returnToStudyUnit(api,{x:0,y:0,scale:1});assert.deepEqual(calls,['render','apply']);
});
test('redraw focus resolves the same control and falls back to the new context title when removed',async()=>{
 const {findStudyFocusTarget}=await load();
 const card={dataset:{studyFocus:'work:ap60'}},region={dataset:{studyFocus:'region:france'}},heading={id:'context-title'};
 assert.equal(findStudyFocusTarget('work:ap60',[region,card],heading),card);
 assert.equal(findStudyFocusTarget('work:filtered-out',[region],heading),heading);
 assert.equal(findStudyFocusTarget(null,[region,card],heading),null);
});
