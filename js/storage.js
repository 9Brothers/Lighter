(function (root) {
  'use strict';
  const key = 'lighter.v1';
  let failed = false;
  function preferences(p = {}) {p = p && typeof p === 'object' ? p : {};return {autoHideControls:p.autoHideControls !== false,autoHideDelay:3000,showTooltips:p.showTooltips !== false,smooth:p.smooth !== false};}
  function fresh() {return {version:1,settings:{...Profiles.defaults,defaultProfileId:null,lastProfileId:null,startupMode:'last-used'},preferences:preferences(),profiles:Profiles.initial()};}
  function validate(raw) {
    if (!raw || raw.version !== 1 || !Array.isArray(raw.profiles)) return fresh();
    const seen = new Set();
    const profiles = raw.profiles.filter(p=>Profiles.validProfile(p) && !seen.has(p.id) && seen.add(p.id)).map(Profiles.normalize);
    const s = raw.settings || {};
    const state = {version:1,settings:{...Profiles.settings(s),defaultProfileId:profiles.some(p=>p.id===s.defaultProfileId)?s.defaultProfileId:null,lastProfileId:profiles.some(p=>p.id===s.lastProfileId)?s.lastProfileId:null,startupMode:s.startupMode==='default-profile'?'default-profile':'last-used'},preferences:preferences(raw.preferences),profiles};
    if(state.settings.startupMode==='default-profile') {const p=profiles.find(p=>p.id===state.settings.defaultProfileId);if(p) Object.assign(state.settings,Profiles.settings({...p,customColor:p.color}),{lastProfileId:p.id});}
    return state;
  }
  function load() {try {const raw=localStorage.getItem(key);return raw?validate(JSON.parse(raw)):fresh();}catch {failed=true;return fresh();}}
  function save(state) {try {localStorage.setItem(key,JSON.stringify(state));failed=false;return true;}catch {failed=true;return false;}}
  root.LighterStorage = {key,load,save,validate,preferences,get failed(){return failed;}};
})(globalThis);
