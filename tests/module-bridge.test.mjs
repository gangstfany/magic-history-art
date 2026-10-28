import test from 'node:test';
import assert from 'node:assert/strict';
import {validHostOrigin,mountModuleBridge} from '../module-bridge.mjs';
test('bridge restricts host to explicit HTTPS or loopback HTTP origins',()=>{
 for(const value of ['https://gangstfany.github.io','http://127.0.0.1:8030','http://localhost:8030','http://[::1]:8030']) assert.ok(validHostOrigin(value),value);
 for(const value of ['*','null','https://host/path','https://u:p@host','https://host/','http://example.org','javascript:alert(1)']) assert.ok(!validHostOrigin(value),value);
});
function setup(query='?embed=1&hostOrigin=https%3A%2F%2Fhost.example',workspace=null){
 const messages=[],listeners={},timers=new Map(),observed=[];let nextTimer=0,resize;
 const parent={postMessage:(...args)=>messages.push(args)};
 const win={parent,location:{search:query},addEventListener:(k,v)=>listeners[k]=v,removeEventListener:(k)=>delete listeners[k],setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timers.delete(id)};
 const doc={documentElement:{scrollHeight:900},body:{scrollHeight:900},querySelector:selector=>selector==='.art-workspace'?workspace:null};
 class Observer{constructor(fn){resize=fn;}observe(target){observed.push(target);}disconnect(){resize=null;}}
 const dispose=mountModuleBridge({window:win,document:doc,ResizeObserver:Observer});
 return {messages,listeners,parent,doc,dispose,resize:target=>{if(!target||observed.includes(target))resize?.();},flush:()=>{for(const fn of [...timers.values()])fn();timers.clear();}};
}
test('ready/init handshake validates identity, source and origin',()=>{
 const f=setup();assert.equal(f.messages.length,1);assert.deepEqual(f.messages[0],[{namespace:'magic-history',version:1,module:'art',type:'ready',height:900},'https://host.example']);
 const init={namespace:'magic-history',version:1,module:'art',type:'init'};
 for(const event of [{source:{},origin:'https://host.example',data:init},{source:f.parent,origin:'https://evil.example',data:init},{source:f.parent,origin:'https://host.example',data:{...init,version:2}},{source:f.parent,origin:'https://host.example',data:{...init,module:'apwh'}}]) f.listeners.message(event);
 assert.equal(f.messages.length,1);
 f.listeners.message({source:f.parent,origin:'https://host.example',data:init});assert.equal(f.messages.length,2);f.dispose();
});
test('resize coalesces unchanged height, bounds reports and disposes observers',()=>{
 const f=setup();f.resize();f.resize();f.flush();assert.equal(f.messages.length,1);
 f.doc.body.scrollHeight=1100;f.resize();f.flush();assert.equal(f.messages.at(-1)[0].type,'resize');assert.equal(f.messages.at(-1)[0].height,1100);
 f.doc.body.scrollHeight=50000;f.resize();f.flush();assert.equal(f.messages.at(-1)[0].height,10000);
 f.dispose();assert.deepEqual(f.listeners,{});
 const invalid=setup('?hostOrigin=*');assert.equal(invalid.messages.length,0);
});

test('intrinsic course height shrinks even while the iframe viewport is still tall',()=>{
 let bottom=2486;
 const workspace={getBoundingClientRect:()=>({bottom,height:500,width:390})};
 const f=setup(undefined,workspace);
 f.doc.documentElement.scrollHeight=f.doc.body.scrollHeight=2486;
 f.resize(workspace);f.flush();assert.equal(f.messages.at(-1)[0].height,2486);
 bottom=573;
 f.resize(workspace);f.flush();assert.equal(f.messages.at(-1)[0].height,650);
 bottom=1560;
 f.resize(workspace);f.flush();assert.equal(f.messages.at(-1)[0].height,1560);
 f.dispose();
});
