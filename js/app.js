(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = window.lighterInitial;
  let hideTimer, toastTimer, saveTimer, pointerActive = false, nameAction = null;
  let manuallyHidden = false;
  let storageWarned = LighterStorage.failed;
  const dialogs = [...document.querySelectorAll('dialog')];
  const isOpen = () => dialogs.some(d => d.open);
  const editing = el => el?.matches('input,select,textarea,[contenteditable="true"]');
  function toast(message) {
    if (document.body.classList.contains('controls-hidden')) return;
    $('toast').textContent = message; $('toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4200);
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!LighterStorage.save(state) && !storageWarned) {storageWarned = true; toast('Armazenamento indisponível ou cheio. Os ajustes funcionarão apenas nesta sessão.');}
    }, 120);
  }
  window.addEventListener('pagehide', () => LighterStorage.save(state));
  function apply() {
    document.documentElement.classList.toggle('smooth', state.preferences.smooth);
    document.documentElement.style.setProperty('--light', Lighting.displayColor(state.settings));
    const s=state.settings;
    $('temperature').value=s.temperature; $('intensity').value=s.intensity;
    $('temperature-value').textContent=`${s.temperature.toLocaleString('pt-BR')} K`;
    $('intensity-value').textContent=`${s.intensity}%`;
    $('color').value=s.customColor;
    if (document.activeElement !== $('hex')) $('hex').value=s.customColor;
    $('rgb-value').textContent=`RGB ${Lighting.baseRgb(s).join(' · ')}`;
    $('temperature-mode').setAttribute('aria-pressed',s.mode==='temperature');
    $('custom-mode').setAttribute('aria-pressed',s.mode==='custom');
    $('temperature-section').hidden=s.mode!=='temperature'; $('custom-section').hidden=s.mode!=='custom';
    document.querySelectorAll('[data-temperature]').forEach(b=>b.classList.toggle('active',s.temperature===+b.dataset.temperature));
    document.querySelectorAll('[data-intensity]').forEach(b=>b.classList.toggle('active',s.intensity===+b.dataset.intensity));
    const profile=state.profiles.find(p=>p.id===s.lastProfileId);
    const same=profile && profile.mode===s.mode && profile.temperature===s.temperature && profile.color===s.customColor && profile.intensity===s.intensity;
    $('current-profile').textContent=profile ? `${profile.name}${same?'':' · editado'}` : 'Ajuste livre';
    document.querySelectorAll('[data-apply]').forEach(b=>b.classList.toggle('active',same && b.dataset.apply===profile?.id));
    persist();
  }
  function change(values) {Object.assign(state.settings,values);apply();scheduleHide();}
  function scheduleHide() {
    clearTimeout(hideTimer);
    if(state.preferences.autoHideControls && !manuallyHidden) hideTimer=setTimeout(() => {
      if (pointerActive || isOpen() || editing(document.activeElement) || $('panel').matches(':hover') || $('panel').matches(':focus-within')) return;
      hideControls(false);
    },state.preferences.autoHideDelay);
  }
  function hideControls(manual = true) {
    if(isOpen()) return;
    manuallyHidden = manual;
    if($('panel').contains(document.activeElement)) document.activeElement.blur();
    document.body.classList.add('controls-hidden');$('panel').inert=true;$('toast').hidden=true;clearTimeout(hideTimer);
  }
  function showControls() {manuallyHidden=false;document.body.classList.remove('controls-hidden');$('panel').inert=false;scheduleHide();}
  function toggleControls() {document.body.classList.contains('controls-hidden') ? showControls() : hideControls();}
  function openDialog(id) {showControls();if(!$(id).open) $(id).showModal();clearTimeout(hideTimer);}
  function button(label, action, className='') {const b=document.createElement('button');b.type='button';b.textContent=label;b.className=className;b.addEventListener('click',action);return b;}
  function profileSettings(p) {return Profiles.settings({...p,customColor:p.color});}
  function useProfile(p) {Object.assign(state.settings,profileSettings(p),{lastProfileId:p.id});renderProfiles();apply();}
  function askName(title,value,action) {$('name-title').textContent=title;$('profile-name').value=value;$('profile-name').setCustomValidity('');nameAction=action;openDialog('name-dialog');$('profile-name').focus();$('profile-name').select();}
  function renderProfiles() {
    $('favorite-profiles').replaceChildren();$('profile-list').replaceChildren();
    const favorites=state.profiles.filter(p=>p.favorite);
    (favorites.length?favorites:state.profiles.slice(0,3)).forEach(p=>{
      const b=button(p.name,()=>useProfile(p));b.dataset.apply=p.id;
      const dot=document.createElement('span');dot.className='profile-dot';dot.style.background=Lighting.displayColor(profileSettings(p));b.prepend(dot);$('favorite-profiles').append(b);
    });
    if(!state.profiles.length) {const p=document.createElement('p');p.className='muted';p.textContent='Sua biblioteca está vazia. Salve sua primeira configuração.';$('profile-list').append(p);}
    state.profiles.forEach(p=>{
      const row=document.createElement('article');row.className='profile-row';
      const summary=document.createElement('div');summary.className='profile-summary';
      const use=button(p.name,()=>useProfile(p),'apply-profile');use.dataset.apply=p.id;
      const detail=document.createElement('small');detail.textContent=`${p.mode==='temperature'?`${p.temperature} K`:p.color} · ${p.intensity}%${state.settings.defaultProfileId===p.id?' · Padrão':''}`;use.append(detail);
      summary.append(use,button(p.favorite?'★':'☆',()=>{p.favorite=!p.favorite;p.updatedAt=new Date().toISOString();renderProfiles();persist();},p.favorite?'active':''));summary.lastChild.setAttribute('aria-label',`${p.favorite?'Remover dos':'Adicionar aos'} favoritos: ${p.name}`);
      const actions=document.createElement('div');actions.className='profile-actions';
      actions.append(button('Renomear',()=>askName('Renomear perfil',p.name,name=>{p.name=name;p.updatedAt=new Date().toISOString();renderProfiles();apply();})),
        button('Atualizar',()=>{if(confirm(`Salvar os ajustes atuais em “${p.name}”?`)){Object.assign(p,profileSettingsFromCurrent(),{updatedAt:new Date().toISOString()});renderProfiles();apply();toast('Perfil atualizado.');}}),
        button('Duplicar',()=>{const copy=Profiles.create(`${p.name.slice(0,90)} (cópia)`,profileSettings(p));state.profiles.push(copy);renderProfiles();persist();toast('Perfil duplicado.');}),
        button(state.settings.defaultProfileId===p.id?'Remover padrão':'Definir padrão',()=>{state.settings.defaultProfileId=state.settings.defaultProfileId===p.id?null:p.id;renderProfiles();persist();}),
        button('Excluir',()=>{if(confirm(`Excluir o perfil “${p.name}”?`)){state.profiles=state.profiles.filter(x=>x.id!==p.id);if(state.settings.defaultProfileId===p.id)state.settings.defaultProfileId=null;if(state.settings.lastProfileId===p.id)state.settings.lastProfileId=null;renderProfiles();apply();}}));
      row.append(summary,actions);$('profile-list').append(row);
    });
    const def=state.profiles.find(p=>p.id===state.settings.defaultProfileId);
    $('default-description').textContent=def?`Perfil padrão: ${def.name}.`:'Nenhum perfil padrão definido. Nesse caso, os últimos ajustes serão restaurados.';
  }
  function profileSettingsFromCurrent() {return {...Profiles.settings(state.settings),color:state.settings.customColor};}
  [2700,3200,4000,5600,6500].forEach(t=>{const b=button(`${t}K`,()=>change({temperature:t}));b.dataset.temperature=t;$('temperature-presets').append(b);});
  [25,50,75,100].forEach(i=>{const b=button(`${i}%`,()=>change({intensity:i}));b.dataset.intensity=i;$('intensity-presets').append(b);});
  [['Branco puro','#FFFFFF'],['Branco quente','#FFD6AA'],['Branco frio','#DCE8FF'],['Vermelho','#FF0000'],['Verde','#00FF00'],['Azul','#0000FF'],['Amarelo','#FFFF00'],['Laranja','#FF8000'],['Rosa','#FF80BF'],['Roxo','#A855F7']].forEach(([name,color])=>{const b=button('',()=>change({customColor:color}));b.style.background=color;b.title=name;b.setAttribute('aria-label',name);$('color-presets').append(b);});
  $('temperature').addEventListener('input',e=>change({temperature:+e.target.value}));
  $('intensity').addEventListener('input',e=>change({intensity:+e.target.value}));
  $('color').addEventListener('input',e=>change({customColor:e.target.value.toUpperCase()}));
  $('hex').addEventListener('input',e=>{const valid=Lighting.validHex(e.target.value);e.target.setCustomValidity(valid?'':'Digite uma cor no formato #RRGGBB.');e.target.setAttribute('aria-invalid',!valid);if(valid)change({customColor:e.target.value.toUpperCase()});});
  $('hex').addEventListener('blur',()=>{if(!Lighting.validHex($('hex').value)){toast('Cor inválida. Use #RRGGBB, por exemplo #FFAA00.');$('hex').value=state.settings.customColor;$('hex').setCustomValidity('');$('hex').setAttribute('aria-invalid','false');}});
  $('temperature-mode').onclick=()=>change({mode:'temperature'});$('custom-mode').onclick=()=>change({mode:'custom'});
  $('save-profile').onclick=()=>askName('Salvar perfil','Minha luz',name=>{const p=Profiles.create(name,state.settings);state.profiles.push(p);state.settings.lastProfileId=p.id;renderProfiles();apply();toast('Perfil salvo.');});
  $('name-form').onsubmit=e=>{e.preventDefault();const name=$('profile-name').value.trim();if(!name){$('profile-name').setCustomValidity('Informe um nome.');$('profile-name').reportValidity();return;}nameAction?.(name);$('name-dialog').close();};
  $('profile-name').oninput=()=>$('profile-name').setCustomValidity('');
  $('manage').onclick=()=>openDialog('profiles-dialog');
  $('preferences-button').onclick=()=>{renderProfiles();openDialog('preferences-dialog');};
  document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  dialogs.forEach(d=>d.addEventListener('close',scheduleHide));
  $('hide').onclick=()=>hideControls();$('clean').onclick=()=>hideControls();
  async function fullscreen() {
    try {
      if(document.fullscreenElement) await document.exitFullscreen();
      else if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast('Tela cheia não está disponível neste navegador. Use a opção do navegador, se houver.');
    } catch {toast('Não foi possível ativar a tela cheia. Tente novamente pelo botão.');}
  }
  $('fullscreen').onclick=fullscreen;
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').querySelector('span').textContent=document.fullscreenElement?'Sair da tela cheia':'Tela cheia';});
  $('auto-hide').checked=state.preferences.autoHideControls;$('smooth').checked=state.preferences.smooth;$('startup').value=state.settings.startupMode;
  $('auto-hide').onchange=e=>{state.preferences.autoHideControls=e.target.checked;persist();scheduleHide();};
  $('smooth').onchange=e=>{state.preferences.smooth=e.target.checked;apply();};
  $('startup').onchange=e=>{state.settings.startupMode=e.target.value;persist();};
  $('export').onclick=()=>{
    const data={version:1,profiles:state.profiles.map(({customColor,...p})=>p),preferences:state.preferences};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='lighter-perfis.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exportado com perfis e preferências.');
  };
  $('import-file').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>5*1024*1024)throw new Error('Arquivo muito grande. O limite de importação é 5 MB.');
      const data=Profiles.parseImport(JSON.parse(await file.text()));
      const replace=$('import-mode').value==='replace';
      if(replace&&!confirm('Substituir todos os seus perfis e preferências pelo backup? Esta ação não pode ser desfeita.'))return;
      state.profiles=replace?data.profiles:Profiles.merge(state.profiles,data.profiles);
      if(replace){state.settings.defaultProfileId=null;state.settings.lastProfileId=null;if(data.preferences) state.preferences=LighterStorage.preferences(data.preferences);}
      $('auto-hide').checked=state.preferences.autoHideControls;$('smooth').checked=state.preferences.smooth;
      renderProfiles();apply();toast(`${data.profiles.length} perfil(is) importado(s).`);
    }catch(err){toast(err instanceof SyntaxError?'JSON inválido. Nenhuma alteração foi feita.':err.message);}
    finally{e.target.value='';}
  };
  document.addEventListener('pointerdown',()=>{pointerActive=true;showControls();},{passive:true});
  document.addEventListener('pointerup',()=>{pointerActive=false;scheduleHide();},{passive:true});
  document.addEventListener('pointercancel',()=>{pointerActive=false;scheduleHide();},{passive:true});
  // Manual hiding stays latched through incidental mouse/focus events.
  // A deliberate click/tap or keyboard command still restores the panel.
  document.addEventListener('pointermove',()=>{if(!manuallyHidden)showControls();},{passive:true});
  $('panel').addEventListener('pointerleave',scheduleHide);
  document.addEventListener('focusin',()=>{if(!manuallyHidden){showControls();clearTimeout(hideTimer);}});
  document.addEventListener('focusout',scheduleHide);
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing) return;
    if(e.key==='Escape') {if(isOpen())return;if(!document.body.classList.contains('controls-hidden'))hideControls();else showControls();return;}
    if(editing(e.target))return;
    if(e.key==='Tab'){showControls();return;}
    if(isOpen())return;
    const key=e.key.toLowerCase();
    if(key==='h'){e.preventDefault();toggleControls();return;}
    if(key==='f'){e.preventDefault();showControls();fullscreen();return;}
    if(key==='s'){e.preventDefault();openDialog('profiles-dialog');return;}
    const updates={ArrowUp:{intensity:Lighting.clamp(state.settings.intensity+5,0,100)},ArrowDown:{intensity:Lighting.clamp(state.settings.intensity-5,0,100)},ArrowRight:{mode:'temperature',temperature:Lighting.clamp(state.settings.temperature+100,2000,7500)},ArrowLeft:{mode:'temperature',temperature:Lighting.clamp(state.settings.temperature-100,2000,7500)}};
    if(updates[e.key]){e.preventDefault();showControls();change(updates[e.key]);return;}
    if(/^[1-5]$/.test(key)){const p=state.profiles.filter(p=>p.favorite)[+key-1];if(p){e.preventDefault();showControls();useProfile(p);}}
  });
  renderProfiles();apply();scheduleHide();
  if(storageWarned) toast('Não foi possível recuperar o armazenamento. Usando ajustes padrão.');
})();
