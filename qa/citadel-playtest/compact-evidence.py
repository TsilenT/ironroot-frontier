"""Retain private raw artifacts; derive small review records and selected images."""
from pathlib import Path
import base64, hashlib, json, shutil
HERE=Path(__file__).resolve().parent
OUT=HERE/'evidence'
OUT.mkdir(exist_ok=True)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def compact(value):
    if isinstance(value,list): return [compact(v) for v in value]
    if not isinstance(value,dict): return value
    if 'game' in value and 'format' in value:
        game=value['game'];s=game['state']
        return {'format':value['format'],'scenario':value.get('scenario'),'rulesetId':game.get('rulesetId'),'mapId':game.get('mapId'),'ai':game['ai'],'difficulty':game['difficulty'],'tick':game['tick'],'time':s['time'],'gold':s['gold'],'bases':[{'hp':b['hp'],'maxHp':b['maxHp'],'cooldown':b['cooldown']} for b in s['bases']],'citadelOptions':s.get('citadelOptions'),'bridgeControl':s.get('bridgeControl'),'stats':s['stats']}
    if 'slots' in value and 'slotStrokes' in value: return {k:compact(v) for k,v in value.items() if k not in ['slots','slotStrokes']}
    return {k:compact(v) for k,v in value.items()}
def specs(suites):
    for suite in suites:
        yield from suite.get('specs',[])
        yield from specs(suite.get('suites',[]))
records=[]
for name in ['browser-initial','browser-general','browser-final','browser-feedback','browser-visible','browser-blockers','browser-reviewed']:
    source=HERE/(name+'.json')
    if not source.exists(): continue
    raw=json.loads(source.read_text());cases=[]
    for spec in specs(raw['suites']):
        for test in spec['tests']:
            if not test['results']: cases.append({'title':spec['title'],'project':test['projectName'],'status':'not-run','annotations':test.get('annotations',[])})
            for result in test['results']:
                attachments={}
                for item in result.get('attachments',[]):
                    if item.get('body') and item.get('contentType')=='application/json':
                        attachments[item['name']]=compact(json.loads(base64.b64decode(item['body'])))
                cases.append({'title':spec['title'],'project':test['projectName'],'status':result['status'],'durationMs':result['duration'],'annotations':test.get('annotations',[])+result.get('annotations',[]),'errors':result.get('errors',[]),'observations':attachments})
    record={'run':name,'rawPath':str(source.relative_to(HERE)),'rawSha256':sha(source),'stats':raw['stats'],'errors':raw['errors'],'cases':cases}
    (OUT/(name+'-cases.json')).write_text(json.dumps(record,indent=2)+'\n');records.append(record)
images=[]
for project in ['narrow-phone','landscape','desktop']:
    for filename in ['citadel-immediate-open.png','synthetic-arrows-battle.png','synthetic-regen-battle.png','synthetic-regen-damage-interruption.png']:
        run='browser-reviewed-artifacts'
        matches=list((HERE/run).glob('*-'+project+'/'+filename))
        if len(matches)!=1: raise RuntimeError(f'Expected exactly one {project}/{filename}; got {matches}')
        original=matches[0];target=OUT/(project+'-'+filename);shutil.copyfile(original,target)
        images.append({'file':target.name,'rawPath':str(original.relative_to(HERE)),'sha256':sha(original)})
for run,project,filename,label in [('browser-feedback-artifacts','narrow-phone','synthetic-regen-battle.png','failure-narrow-regen-label-clipped.png'),('browser-final-artifacts','desktop','synthetic-regen-battle.png','failure-offscreen-feedback-capture.png')]:
    matches=list((HERE/run).glob('*-'+project+'/'+filename))
    if len(matches)!=1: raise RuntimeError(f'Missing failure capture {run}/{project}/{filename}')
    original=matches[0];target=OUT/label;shutil.copyfile(original,target);images.append({'file':target.name,'rawPath':str(original.relative_to(HERE)),'sha256':sha(original),'scope':'Retained adverse visual finding before correction'})
quota=list((HERE/'browser-reviewed-artifacts').glob('*-desktop/quota-purchase-not-saved.png'))
if len(quota)!=1: raise RuntimeError('Missing quota-save warning screenshot')
original=quota[0];target=OUT/'desktop-quota-purchase-not-saved.png';shutil.copyfile(original,target);images.append({'file':target.name,'rawPath':str(original.relative_to(HERE)),'sha256':sha(original)})
(OUT/'images.json').write_text(json.dumps(images,indent=2)+'\n')
raw=[]
for pattern in ['browser-initial-artifacts','browser-initial-html','browser-general-artifacts','browser-general-html','browser-final-artifacts','browser-final-html','browser-feedback-artifacts','browser-feedback-html','browser-visible-artifacts','browser-visible-html','browser-blockers-artifacts','browser-blockers-html','browser-reviewed-artifacts','browser-reviewed-html']:
    directory=HERE/pattern
    if directory.exists():
        for p in sorted(directory.rglob('*')):
            if p.is_file(): raw.append({'path':str(p.relative_to(HERE)),'bytes':p.stat().st_size,'sha256':sha(p)})
for p in sorted(HERE.glob('browser-*.json')):
    raw.append({'path':p.name,'bytes':p.stat().st_size,'sha256':sha(p)})
(OUT/'retained-raw-manifest.json').write_text(json.dumps({'localRoot':str(HERE),'files':raw,'totalBytes':sum(p['bytes'] for p in raw),'note':'All raw files remain local. This manifest does not upload or delete them.'},indent=2)+'\n')
print(json.dumps({'runs':[r['stats'] for r in records],'selectedImages':len(images),'rawFiles':len(raw),'rawBytes':sum(p['bytes'] for p in raw)}))
