// Minimal non-rendering DOM fixture: exercises real application event wiring.
// This does not substitute for visual browser / Fullscreen API verification.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function boot() {
  const elements=new Map(), events={}, timers=new Map(), storage=new Map();let tick=0;
  class Element {
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.value='';this.hidden=false;this.open=false;this.listeners={};this.classes=new Set();this.style={setProperty:(k,v)=>this.style[k]=v};this.classList={add:k=>this.classes.add(k),remove:k=>this.classes.delete(k),contains:k=>this.classes.has(k),toggle:(k,v)=>v?this.classes.add(k):this.classes.delete(k)};}
    set className(v){this.classes=new Set(v.split(' '));}get className(){return [...this.classes].join(' ');}
    get lastChild(){return this.children.at(-1);}
    set textContent(v){this.text=String(v);this.children=[];}get textContent(){return (this.text||'')+this.children.map(c=>c.textContent).join('');}
    append(...items){for(const c of items){c.parent=this;this.children.push(c);}}prepend(c){c.parent=this;this.children.unshift(c);}replaceChildren(...items){this.children=[];this.append(...items);}
    setAttribute(k,v){this.attrs[k]=String(v);}addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
    async fire(k,extra={}){const e={target:this,preventDefault(){this.defaultPrevented=true;},...extra};for(const f of this.listeners[k]||[])await f(e);await this['on'+k]?.(e);return e;}
    click(){return this.fire('click');}focus(){document.activeElement=this;}blur(){document.activeElement=document.body;}select(){}setCustomValidity(v){this.validityMessage=v;}reportValidity(){}
    showModal(){this.open=true;}close(){this.open=false;this.fire('close');}
    contains(el){return el===this||this.children.some(c=>c.contains(el));}
    matches(selector){return selector===':hover'?false:selector===':focus-within'?this.contains(document.activeElement):selector.includes('input')?['INPUT','SELECT','TEXTAREA'].includes(this.tagName):false;}
    querySelector(selector){return this.children.find(c=>c.tagName===selector.toUpperCase());}
    closest(tag){return this.tagName===tag.toUpperCase()?this:this.parent?.closest(tag);}
  }
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for(const match of html.matchAll(/<([a-z-]+)[^>]*\bid="([^"]+)"[^>]*>/g)){const el=new Element(match[1]);elements.set(match[2],el);el.id=match[2];}
  const all=()=>[...elements.values()].flatMap(function walk(e){return [e,...e.children.flatMap(walk)];});
  const document={body:new Element('body'),documentElement:new Element('html'),activeElement:null,getElementById:id=>elements.get(id),createElement:tag=>new Element(tag),querySelectorAll:sel=>sel==='dialog'?[...elements.values()].filter(e=>e.tagName==='DIALOG'):sel.startsWith('[data-')?all().filter(e=>Object.hasOwn(e.dataset,sel.slice(6,-1))):[],addEventListener:(k,f)=>(events[k]??=[]).push(f)};
  document.activeElement=document.body;
  elements.get('fullscreen').append(new Element('span'));
  for(const id of ['temperature','intensity','color','hex','profile-name','auto-hide','smooth','startup'])elements.get('panel').append(elements.get(id));
  const context=vm.createContext({console,document,setTimeout:(fn,delay)=>{timers.set(++tick,{fn,delay});return tick;},clearTimeout:id=>timers.delete(id),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},confirm:()=>true,Blob,URL});
  context.window=context;context.addEventListener=()=>{};
  for(const name of ['lighting','profiles','storage'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),context);
  context.lighterInitial=context.LighterStorage.load();
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8'),context);
  return {context,$:id=>elements.get(id),state:context.lighterInitial,document,async event(key,values={}){const e={key,target:document.activeElement,preventDefault(){this.defaultPrevented=true;},...values};for(const fn of events.keydown||[])await fn(e);return e;},async pointer(type){for(const fn of events[type]||[])await fn({target:document.body});},runTimers(delay){for(const [id,t]of [...timers])if(t.delay===delay){timers.delete(id);t.fn();}}};
}
test('Application initializes and integrates sliders, mode and HEX without losing either mode',async()=>{
  const b=boot();assert.equal(b.$('temperature-value').textContent,'5.600 K');
  b.$('intensity').value='0';await b.$('intensity').fire('input');assert.equal(b.document.documentElement.style['--light'],'rgb(0, 0, 0)');
  b.$('temperature').value='3200';await b.$('temperature').fire('input');await b.$('custom-mode').click();
  b.$('hex').focus();b.$('hex').value='#12ABEF';await b.$('hex').fire('input');assert.equal(b.state.settings.customColor,'#12ABEF');
  await b.$('temperature-mode').click();assert.equal(b.state.settings.temperature,3200);await b.$('custom-mode').click();assert.equal(b.state.settings.customColor,'#12ABEF');
  b.$('hex').value='#NO';await b.$('hex').fire('input');assert.equal(b.state.settings.customColor,'#12ABEF');await b.$('hex').fire('blur');assert.equal(b.$('hex').value,'#12ABEF');
});
test('Profile create, rename, update, duplicate, favorite, default and delete integrate',async()=>{
  const b=boot();await b.$('save-profile').click();b.$('profile-name').value='Studio <test>';await b.$('name-form').fire('submit');
  assert.equal(b.state.profiles.length,7);const p=b.state.profiles.at(-1);assert.equal(p.name,'Studio <test>');
  const actions=()=>b.$('profile-list').children.at(-1).children[1].children;
  await actions().find(x=>x.textContent==='Renomear').click();b.$('profile-name').value='Luz nova';await b.$('name-form').fire('submit');assert.equal(p.name,'Luz nova');
  b.$('intensity').value='37';await b.$('intensity').fire('input');assert.equal(p.intensity,100);
  await actions().find(x=>x.textContent==='Atualizar').click();assert.equal(p.intensity,37);
  await actions().find(x=>x.textContent==='Definir padrão').click();assert.equal(b.state.settings.defaultProfileId,p.id);
  await b.$('profile-list').children.at(-1).children[0].children[1].click();assert.equal(p.favorite,true);
  await actions().find(x=>x.textContent==='Duplicar').click();assert.equal(b.state.profiles.length,8);assert.equal(b.state.profiles.at(-1).intensity,37);
  await actions().find(x=>x.textContent==='Excluir').click();assert.equal(b.state.profiles.length,7);
  await actions().find(x=>x.textContent==='Excluir').click();assert.equal(b.state.settings.defaultProfileId,null);assert.equal(b.state.profiles.length,6);
});
test('Keyboard clamps values, protects inputs / browser shortcuts and applies favorites',async()=>{
  const b=boot();await b.event('ArrowUp');assert.equal(b.state.settings.intensity,100);b.state.settings.intensity=1;await b.event('ArrowDown');assert.equal(b.state.settings.intensity,0);
  b.state.settings.temperature=7500;await b.event('ArrowRight');assert.equal(b.state.settings.temperature,7500);
  await b.event('1');assert.equal(b.state.settings.temperature,5000);b.$('hex').focus();await b.event('ArrowRight');assert.equal(b.state.settings.temperature,5000);
  b.document.activeElement=b.document.body;const e=await b.event('s',{ctrlKey:true});assert.equal(e.defaultPrevented,undefined);assert.equal(b.$('profiles-dialog').open,false);
  await b.event('s');assert.equal(b.$('profiles-dialog').open,true);
});
test('Clean mode, pointer / Tab recovery and auto-hide interaction guards',async()=>{
  const b=boot();await b.$('clean').click();assert.equal(b.document.body.classList.contains('controls-hidden'),true);assert.equal(b.$('panel').inert,true);
  await b.pointer('pointermove');assert.equal(b.document.body.classList.contains('controls-hidden'),true);
  await b.pointer('pointerdown');await b.pointer('pointerup');assert.equal(b.document.body.classList.contains('controls-hidden'),false);
  b.runTimers(3000);assert.equal(b.document.body.classList.contains('controls-hidden'),true);
  await b.pointer('pointermove');assert.equal(b.document.body.classList.contains('controls-hidden'),false);
  b.runTimers(3000);
  await b.event('Tab');assert.equal(b.$('panel').inert,false);
  b.$('hex').focus();await b.pointer('pointermove');b.runTimers(3000);assert.equal(b.$('panel').inert,false);
  b.document.activeElement=b.document.body;await b.$('manage').click();b.runTimers(3000);assert.equal(b.$('panel').inert,false);
});
test('Manual hiding via H and minimize ignores incidental movement and focus',async()=>{
  const b=boot();
  for(const hide of [()=>b.event('h'),()=>b.$('hide').click(),()=>b.$('clean').click()]){
    await hide();
    for(let i=0;i<3;i++){await b.pointer('pointermove');await b.pointer('focusin');await b.pointer('focusout');b.runTimers(3000);assert.equal(b.document.body.classList.contains('controls-hidden'),true);assert.equal(b.$('panel').inert,true);}
    await b.event('h');assert.equal(b.document.body.classList.contains('controls-hidden'),false);
  }
});
test('Import invalid file is atomic; merge collisions and confirmed replacement work',async()=>{
  const b=boot();const initial=JSON.stringify(b.state.profiles);
  b.$('import-file').files=[{size:50,text:async()=>'{invalid'}];await b.$('import-file').fire('change');assert.equal(JSON.stringify(b.state.profiles),initial);
  const data=JSON.stringify({version:1,profiles:[b.state.profiles[0]]});b.$('import-file').files=[{size:data.length,text:async()=>data}];
  b.$('import-mode').value='merge';await b.$('import-file').fire('change');assert.equal(b.state.profiles.length,7);assert.equal(new Set(b.state.profiles.map(p=>p.id)).size,7);
  b.$('import-mode').value='replace';b.context.confirm=()=>false;await b.$('import-file').fire('change');assert.equal(b.state.profiles.length,7);
  b.context.confirm=()=>true;await b.$('import-file').fire('change');assert.equal(b.state.profiles.length,1);
});
test('Unavailable Fullscreen API produces useful feedback and state persists',async()=>{
  const b=boot();await b.$('fullscreen').click();assert.match(b.$('toast').textContent,/não está disponível/);
  b.$('intensity').value='45';await b.$('intensity').fire('input');b.runTimers(120);assert.equal(b.context.LighterStorage.load().settings.intensity,45);
});
