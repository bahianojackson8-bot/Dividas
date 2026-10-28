'use strict';
window.CardColors=(()=>{
 const key=s=>String(s||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
 const colors={
  'nubank':['#6334c5','#8740c7','#ffffff'],
  'mercado pago':['#005d87','#007491','#ffffff'],
  'itaú':['#a44208','#bb4a0a','#ffffff'],
  'santander':['#b81825','#d0222c','#ffffff'],
  'pan':['#00649b','#006c9d','#ffffff'],
  'casas bahia pay':['#164ca4','#285ea9','#ffffff'],
  'shopee':['#ad3215','#c33d1e','#ffffff'],
  'bmg':['#a3450a','#ad4909','#ffffff'],
  'bradesco':['#a6193b','#c32647','#ffffff'],
  '99':['#f0c900','#ffe160','#352c00'],
  'c&a':['#163e76','#2566ab','#ffffff'],
  'pix':['#00675f','#007368','#ffffff'],
  'empréstimos':['#39485d','#536179','#ffffff'],
  'all':['#283d61','#466384','#ffffff'],
  'todos os lançamentos':['#283d61','#466384','#ffffff'],
  'todos os cartões':['#283d61','#466384','#ffffff']
 };
 const custom=[['#166154','#237965','#ffffff'],['#37548b','#5067a6','#ffffff'],['#843557','#a04268','#ffffff'],['#4c478e','#645aab','#ffffff'],['#58612b','#6b7333','#ffffff'],['#4c5966','#62717b','#ffffff']];
 function get(name){const normalized=key(name);if(colors[normalized])return colors[normalized];let hash=0;for(const ch of normalized)hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;return custom[hash%custom.length];}
 function apply(element,name){if(!element?.style)return;const [from,to,ink]=get(name);element.style.setProperty('--bank-from',from);element.style.setProperty('--bank-to',to);element.style.setProperty('--bank-ink',ink);}
 function mark(element,name){if(element?.style)element.style.setProperty('--bank-mark',get(name)[0]);}
 return{get,apply,mark};
})();


