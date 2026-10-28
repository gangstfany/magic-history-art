import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {assertNoAbsolutePrivatePaths,assertNoRestrictedAssetUrls} from '../scripts/verify-art-history-private-leaks.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('public release includes complete artwork payload and excludes other repositories/private media',()=>{
 execFileSync('python3',['scripts/build.py'],{cwd:root});
 const output=path.join(root,'_site');
 const html=readFileSync(path.join(output,'art-history-map.html'),'utf8');
 const artworks=JSON.parse(html.match(/<script id="artwork-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 assert.equal(artworks.length,250);assert.deepEqual([...new Set(artworks.map(w=>w.unit))].sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10]);
 const views=artworks.flatMap(w=>w.images||[w]);
 assert.equal(views.length,381);
 assert.equal(views.filter(v=>v.imageUrl===null).length,0,'release restores all 74 missing views');
 const archive=JSON.parse(readFileSync(path.join(root,'study-media/manifest.json'),'utf8'));
 const restored=archive.images.filter(row=>row.group==='restoredViews');
 const {createHash}=process.getBuiltinModule('node:crypto');
 assert.equal(restored.length,74);
 for(const row of restored){
  const asset=path.join(output,row.filePath);
  assert.ok(existsSync(asset),row.filePath);
  assert.equal(createHash('sha256').update(readFileSync(asset)).digest('hex'),row.sha256);
 }
 for(const row of archive.images.filter(row=>row.group==='remoteFallbacks'))assert.ok(!existsSync(path.join(output,row.filePath)),'unused fallback excluded');
 assert.ok(!existsSync(path.join(output,'study-media/manifest.json')),'archive metadata is not published');
 assert.match(html,/<script type="module" src="module-bridge.mjs"><\/script>/);
 assert.match(html,/<script type="module" src="art-comparison.mjs"><\/script>/);
 for(const file of ['art-comparison.mjs','assets/art-comparison.css','art-category-filters.mjs','assets/art-category-filters.css'])assert.ok(existsSync(path.join(output,file)),file);
 for(const file of ['.private-media','world-map.html','assets/auth','tests','scripts','.git'])assert.ok(!existsSync(path.join(output,file)),file);
 assert.ok(existsSync(path.join(output,'.nojekyll')));
 const entries=[];
 function walk(directory){for(const name of readdirSync(directory,{withFileTypes:true})){const entry=path.join(directory,name.name);if(name.isDirectory())walk(entry);else if(/\.(html|mjs|css|json)$/.test(name.name))entries.push({path:path.relative(output,entry),text:readFileSync(entry,'utf8')});}}
 walk(output);assertNoAbsolutePrivatePaths(entries);assertNoRestrictedAssetUrls(entries);
 const local=html.match(/assets\/art-history\/[a-zA-Z0-9/_-]+\.webp/g)||[];
 assert.ok(local.length>70);for(const asset of local)assert.ok(existsSync(path.join(output,asset)),asset);
});
test('module extraction preserves the approved source page and media supplementation',()=>{
 const manifest=JSON.parse(readFileSync(path.join(root,'source-manifest.json'),'utf8'));
 const html=readFileSync(path.join(root,'art-history-map.html'),'utf8').replace('  <script type="module" src="module-bridge.mjs"></script>\n','');
 const {createHash}=process.getBuiltinModule('node:crypto');
 assert.equal(createHash('sha256').update(html).digest('hex'),manifest.approvedSourceHtmlSha256 || manifest.originalHtmlSha256);
});
