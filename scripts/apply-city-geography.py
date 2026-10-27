"""Generate reviewed city anchors from attributed WGS84 coordinates; never edit artwork payloads."""
from pathlib import Path
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[1]
review=json.loads((ROOT/'data/art-geography-city-review.json').read_text())
page=ROOT/'art-history-map.html';html=page.read_text()
start=html.index('    const SITE_WORLD_COORDINATES =');end=html.index('    function toWorldCoordinates',start)
chunk=html[start:end]
for city in review['cities']:
 lat,lon=city['latitude'],city['longitude']
 if not(-90<=lat<=90 and -180<=lon<=180):raise ValueError(city['siteName'])
 point={'x':round((lon+180)*1600/360,3),'y':round((90-lat)*800/180,3)}
 if point!=city['anchor']:raise ValueError('Projected anchor disagrees with source coordinates: '+city['siteName'])
 key=city['siteName'];quoted=[json.dumps(key,ensure_ascii=False),"'"+key.replace("'","\\'")+"'"]
 pattern='(?:'+'|'.join(re.escape(v)for v in quoted)+r')\s*:\s*\{[^{}]*\}'
 chunk,count=re.subn(pattern,lambda _:json.dumps(key,ensure_ascii=False)+': '+json.dumps(point,separators=(', ',': ')),chunk)
 if count!=1:raise ValueError('Expected one anchor for '+key)
html=html[:start]+chunk+html[end:];page.write_text(html)
manifest=ROOT/'source-manifest.json';data=json.loads(manifest.read_text())
source=html.replace('  <script type="module" src="module-bridge.mjs"></script>\n','')
data['approvedSourceHtmlSha256']=hashlib.sha256(source.encode()).hexdigest()
data['cityGeographyRevision']={'date':'2026-10-27','review':'data/art-geography-city-review.json','cityAliases':len(review['cities']),'artworkPayloadChanged':False}
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('Applied '+str(len(review['cities']))+' attributed city anchors; artwork payload unchanged.')
