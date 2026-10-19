const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(storage) {
  const values=new Map();
  const context=vm.createContext({console,localStorage:storage||{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}});
  for(const name of ['lighting','profiles','storage'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),context);
  return context;
}
test('Kelvin: known warm and daylight values; bounded continuous range',()=>{
  const {Lighting:L}=setup();
  assert.equal(JSON.stringify(L.kelvinToRgb(2000)),'[255,137,14]');
  assert.equal(JSON.stringify(L.kelvinToRgb(5600)),'[255,239,225]');
  for(let k=2000;k<=7500;k+=10){const rgb=L.kelvinToRgb(k);assert.ok(rgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255));if(k<7500)assert.ok(rgb.every((v,i)=>Math.abs(v-L.kelvinToRgb(k+10)[i])<=3));}
  assert.equal(JSON.stringify(L.kelvinToRgb(-100)),JSON.stringify(L.kelvinToRgb(2000)));
});
test('Intensity 0–100 multiplies actual channels for both modes',()=>{
  const {Lighting:L,Profiles:P}=setup();
  for(const mode of ['temperature','custom']){const s={...P.defaults,mode,customColor:'#12ABEF'};assert.equal(L.displayColor({...s,intensity:0}),'rgb(0, 0, 0)');assert.equal(L.displayColor({...s,intensity:100}),`rgb(${L.baseRgb(s).join(', ')})`);}
  assert.equal(L.displayColor({mode:'custom',customColor:'#FFFFFF',intensity:50}),'rgb(128, 128, 128)');
  assert.equal(L.validHex('#ABCDEF'),true);for(const value of ['#FFF','red','#ZZ00FF',null,'<script>'])assert.equal(L.validHex(value),false);
});
test('Settings clamp extremes and reject wrong types',()=>{
  const {Profiles:P}=setup();const s=P.settings({mode:'other',temperature:99999,intensity:-8,customColor:'oops'});
  assert.equal(s.mode,'temperature');assert.equal(s.temperature,7500);assert.equal(s.intensity,0);assert.equal(s.customColor,'#FFFFFF');
  assert.equal(P.settings({intensity:NaN,temperature:'2000'}).temperature,5600);
});
test('Six valid initial profiles, independent IDs and dates',()=>{
  const {Profiles:P}=setup();const profiles=P.initial();assert.equal(profiles.length,6);assert.equal(new Set(profiles.map(p=>p.id)).size,6);assert.ok(profiles.every(P.validProfile));assert.equal(profiles.filter(p=>p.favorite).length,3);
  const p=P.create('Minha luz',P.defaults);assert.ok(P.validProfile(p));assert.notEqual(p.id,P.create('Outra',P.defaults).id);
});
test('Import validates whole collection and rejects duplicates / unsupported versions',()=>{
  const {Profiles:P}=setup();const p=P.initial()[0];assert.equal(P.parseImport({version:1,profiles:[p]}).profiles.length,1);
  for(const bad of [null,{}, {version:2,profiles:[]},{version:1,profiles:[p,p]}, {version:1,profiles:[p,{...p,id:'other',intensity:101}]},{version:1,profiles:[{...p,createdAt:'invalid'}]},{version:1,profiles:[{...p,name:''}]}]) assert.throws(()=>P.parseImport(bad));
});
test('Merge resolves collisions without mutating existing or imported profiles',()=>{
  const {Profiles:P}=setup();const existing=P.initial();const incoming=[{...existing[0]}];const merged=P.merge(existing,incoming);
  assert.equal(merged.length,7);assert.equal(new Set(merged.map(p=>p.id)).size,7);assert.equal(incoming[0].id,'neutral');assert.equal(existing.length,6);
});
test('Persistence restores current state; adjusting state cannot overwrite profile',()=>{
  const {LighterStorage:S}=setup();const state=S.load();state.settings.temperature=2700;state.settings.intensity=0;state.settings.customColor='#ABCDEF';state.settings.mode='custom';
  assert.ok(S.save(state));const restored=S.load();assert.equal(restored.settings.intensity,0);assert.equal(restored.settings.customColor,'#ABCDEF');assert.equal(restored.settings.mode,'custom');assert.equal(restored.profiles[0].temperature,5000);
});
test('Default startup only applies when selected; missing default falls back to current',()=>{
  const {LighterStorage:S}=setup();const s=S.load();s.settings.temperature=2000;s.settings.defaultProfileId='cool';
  assert.equal(S.validate(s).settings.temperature,2000);s.settings.startupMode='default-profile';assert.equal(S.validate(s).settings.temperature,6500);
  s.settings.defaultProfileId='missing';assert.equal(S.validate(s).settings.temperature,2000);assert.equal(S.validate(s).settings.defaultProfileId,null);
});
test('Corrupt JSON / unavailable storage / quota failure fall back safely',()=>{
  const corrupt=setup({getItem:()=>'{broken',setItem:()=>{throw Error('quota');}}).LighterStorage;
  assert.equal(corrupt.load().profiles.length,6);assert.equal(corrupt.failed,true);assert.equal(corrupt.save({}),false);
  const blocked=setup({getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}}).LighterStorage;
  assert.equal(blocked.load().settings.temperature,5600);assert.equal(blocked.save({}),false);
});
test('Stored malformed profiles removed, duplicates removed, null preferences handled',()=>{
  const {LighterStorage:S}=setup();const s=S.load();s.profiles.push({...s.profiles[0]}, {id:'bad'});s.preferences=null;
  const valid=S.validate(s);assert.equal(valid.profiles.length,6);assert.equal(valid.preferences.autoHideControls,true);
  s.profiles=[];assert.equal(S.validate(s).profiles.length,0);assert.equal(S.validate({version:999}).profiles.length,6);
});
test('Backup serialization roundtrip preserves relevant profile data',()=>{
  const {Profiles:P,LighterStorage:S}=setup();const s=S.load();const backup=JSON.parse(JSON.stringify({version:1,profiles:s.profiles.map(({customColor,...p})=>p),preferences:s.preferences}));
  const imported=P.parseImport(backup);assert.equal(imported.profiles.length,6);assert.equal(imported.profiles[2].temperature,6500);assert.equal(imported.preferences.smooth,true);
});
