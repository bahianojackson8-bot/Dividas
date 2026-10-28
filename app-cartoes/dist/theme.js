'use strict';
(()=>{
 const storageKey='meus-cartoes-tema-v1';let current='dark';
 try{const saved=localStorage.getItem(storageKey);if(saved==='light'||saved==='dark')current=saved;}catch{}
 function render(){document.documentElement.dataset.theme=current;document.documentElement.style.colorScheme=current;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',current==='dark'?'#11141d':'#f5f5fa');document.querySelectorAll('[data-theme-toggle]').forEach(button=>{button.textContent=current==='dark'?'☀ Modo claro':'☾ Modo escuro';button.setAttribute('aria-label',current==='dark'?'Ativar modo claro':'Ativar modo escuro');});}
 function setTheme(next,persist=true){current=next==='light'?'light':'dark';render();if(persist)try{localStorage.setItem(storageKey,current);}catch{}}
 function bind(){document.querySelectorAll('[data-theme-toggle]').forEach(button=>button.addEventListener('click',()=>setTheme(current==='dark'?'light':'dark')));render();}
 render();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
 window.addEventListener('storage',event=>{if(event.key===storageKey)setTheme(event.newValue,false);});
})();
