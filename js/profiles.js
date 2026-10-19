(function (root) {
  'use strict';
  const defaults = {mode:'temperature', temperature:5600, customColor:'#FFFFFF', intensity:100};
  const id = () => globalThis.crypto?.randomUUID?.() || `light-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function settings(value = {}) {
    const number = (v, fallback, min, max) => typeof v === 'number' && Number.isFinite(v) ? Lighting.clamp(v, min, max) : fallback;
    return {mode:value.mode === 'custom' ? 'custom' : 'temperature', temperature:number(value.temperature, defaults.temperature, 2000, 7500), customColor:Lighting.validHex(value.customColor) ? value.customColor.toUpperCase() : defaults.customColor, intensity:number(value.intensity, 100, 0, 100)};
  }
  function validProfile(p) {
    return p && typeof p === 'object' && typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 200 && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 100 && ['temperature','custom'].includes(p.mode) && Number.isFinite(p.temperature) && p.temperature >= 2000 && p.temperature <= 7500 && Lighting.validHex(p.color) && Number.isFinite(p.intensity) && p.intensity >= 0 && p.intensity <= 100 && typeof p.createdAt === 'string' && Number.isFinite(Date.parse(p.createdAt)) && typeof p.updatedAt === 'string' && Number.isFinite(Date.parse(p.updatedAt));
  }
  function normalize(p) { return {...settings({...p,customColor:p.color}), id:p.id, name:p.name.trim(), color:p.color.toUpperCase(), favorite:p.favorite === true, createdAt:p.createdAt, updatedAt:p.updatedAt}; }
  function create(name, s) { const now = new Date().toISOString(); return {id:id(),name:name.trim().slice(0,100),...settings(s),color:s.customColor,favorite:false,createdAt:now,updatedAt:now}; }
  function initial() {
    return [['neutral','Branco neutro',5000,100],['daylight','Luz do dia',5600,100],['cool','Branco frio',6500,100],['warm','Branco quente',3200,80],['soft','Luz suave',4000,50],['night','Luz noturna',2700,25]].map(([key,name,temperature,intensity],i) => ({...create(name,{...defaults,temperature,intensity}),id:key,favorite:i<3}));
  }
  function parseImport(raw) {
    if (!raw || raw.version !== 1 || !Array.isArray(raw.profiles)) throw new Error('Arquivo incompatível. Use um backup JSON do Lighter (versão 1).');
    const ids = new Set();
    const profiles = raw.profiles.map(p => {if (!validProfile(p)) throw new Error('O arquivo contém um perfil inválido. Nenhuma alteração foi feita.'); if(ids.has(p.id)) throw new Error('O arquivo contém identificadores repetidos.'); ids.add(p.id); return normalize(p);});
    return {profiles, preferences:raw.preferences};
  }
  // Preserve imported IDs when possible; collisions get new IDs so neither profile is lost.
  function merge(existing, incoming) {
    const ids = new Set(existing.map(p=>p.id));
    return [...existing,...incoming.map(p=>{const copy={...p};if(ids.has(copy.id)) copy.id=id();ids.add(copy.id);return copy;})];
  }
  root.Profiles = {defaults,id,settings,validProfile,normalize,create,initial,parseImport,merge};
})(globalThis);
