'use strict';
window.Ledger=(()=>{
 const banks=['Nubank','Mercado Pago','Itaú','Santander','PAN','Casas Bahia Pay','Shopee','BMG','Bradesco','99','C&A','PIX','Empréstimos'];
 const clean=s=>s.trim().replace(/\s+/g,' '),personKey=s=>clean(s).toLocaleLowerCase('pt-BR');
 const monthIndex=s=>{const[y,m]=s.split('-').map(Number);return y*12+m-1;};
 function valid(p){
  if(p?.kind==='settings')return typeof p.id==='string'&&!!p.id&&typeof p.bank==='string'&&!!p.bank.trim()&&p.bank.length<=60&&!['all','__custom__','PIX'].includes(p.bank)&&Number.isInteger(p.dueDay)&&p.dueDay>=1&&p.dueDay<=31;
  if(!(p&&typeof p.id==='string'&&p.id&&typeof p.description==='string'&&p.description.trim()&&p.description.length<=100&&typeof p.person==='string'&&p.person.trim()&&p.person.length<=60&&typeof p.bank==='string'&&!!p.bank.trim()&&p.bank.length<=60&&!['all','__custom__'].includes(p.bank)&&Number.isSafeInteger(p.cents)&&p.cents>0&&p.cents<=9999999999&&Number.isInteger(p.parts)&&p.parts>=1&&p.parts<=120&&/^\d{4}-(0[1-9]|1[0-2])$/.test(p.month)))return false;
  if(p.paidMonths!==undefined&&(!Array.isArray(p.paidMonths)||p.paidMonths.length>2400||new Set(p.paidMonths).size!==p.paidMonths.length||p.paidMonths.some(m=>!active(p,m))))return false;
  if(p.kind!==undefined&&!['card','pix','loan'].includes(p.kind))return false;
  if(p.dueDay!==undefined&&(!Number.isInteger(p.dueDay)||p.dueDay<1||p.dueDay>31))return false;
  if(p.principalCents!==undefined&&(p.kind!=='loan'||!Number.isSafeInteger(p.principalCents)||p.principalCents<=0||p.principalCents>p.loanTotal))return false;
  if(p.recurring!==undefined&&typeof p.recurring!=='boolean')return false;
  if(p.recurring&&(p.kind==='loan'||p.parts!==1||(p.endMonth!==undefined&&(!/^\d{4}-(0[1-9]|1[0-2])$/.test(p.endMonth)||p.endMonth<p.month))))return false;
  if(!p.recurring&&p.endMonth!==undefined)return false;
  if(p.kind==='loan')return p.bank!=='PIX'&&typeof p.loanId==='string'&&!!p.loanId&&Number.isSafeInteger(p.loanTotal)&&p.loanTotal>=p.cents&&p.loanTotal<=9999999999&&Number.isInteger(p.offset)&&p.offset>=0&&p.offset<p.parts&&['equal','custom','monthly'].includes(p.splitMode);
  return p.bank!=='Empréstimos'&&(p.bank!=='PIX'||p.parts===1)&&(p.kind!=='pix'||p.bank==='PIX');
 }
 function validRecords(data){
  if(!Array.isArray(data)||data.length>20000||!data.every(valid)||new Set(data.map(p=>p.id)).size!==data.length)return false;
  const settings=data.filter(p=>p.kind==='settings');if(new Set(settings.map(p=>p.bank)).size!==settings.length)return false;
  const groups=new Map();for(const p of data)if(p.kind==='loan'){if(!groups.has(p.loanId))groups.set(p.loanId,[]);groups.get(p.loanId).push(p);}
  for(const rows of groups.values()){
   const first=rows[0];if(rows.length<2||rows.length>10||new Set(rows.map(p=>personKey(p.person))).size!==rows.length||rows.reduce((s,p)=>s+p.cents,0)!==first.loanTotal)return false;
   let offset=0;for(const p of rows){if(['bank','description','month','parts','loanTotal','splitMode','principalCents','dueDay'].some(k=>p[k]!==first[k])||p.offset!==offset)return false;offset=(offset+p.cents%p.parts)%p.parts;}
   if(first.splitMode==='monthly'&&rows.some(p=>p.cents%p.parts!==0))return false;
   if(first.splitMode==='equal'){const base=Math.floor(first.loanTotal/rows.length),rem=first.loanTotal%rows.length;if(rows.some((p,i)=>p.cents!==base+(i<rem?1:0)))return false;}
  }
  return true;
 }
 function active(p,month){if(p.kind==='settings'||typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return false;const i=monthIndex(month)-monthIndex(p.month);return i>=0&&(p.recurring?(!p.endMonth||month<=p.endMonth):i<p.parts);}
 function markPaid(records,id,month,paid){const target=records.find(p=>p.id===id);if(!target||!active(target,month)||typeof paid!=='boolean')throw Error('invalid-payment');return records.map(p=>p.id===id?{...p,paidMonths:[...(p.paidMonths||[]).filter(m=>m!==month),...(paid?[month]:[])].sort()}:p);}
 function installment(p,index){const offset=p.kind==='loan'?p.offset:0;return Math.floor(p.cents/p.parts)+((index-offset+p.parts)%p.parts<p.cents%p.parts?1:0);}
 function items(records,month,bank='all'){const target=monthIndex(month);return records.filter(p=>p.kind!=='settings'&&(bank==='all'||p.bank===bank)).flatMap(p=>{const index=target-monthIndex(p.month);if(p.recurring)return index>=0&&(!p.endMonth||target<=monthIndex(p.endMonth))?[{p,index:0,cents:p.cents}]:[];return index>=0&&index<p.parts?[{p,index,cents:installment(p,index)}]:[];}).map(x=>({...x,dueDate:dueDate(records,x.p,month),paid:(x.p.paidMonths||[]).includes(month)}));}
 function dueDate(records,p,month){
  if(p.bank==='PIX')return '';const day=p.dueDay||records.find(x=>x.kind==='settings'&&x.bank===p.bank)?.dueDay;if(!day)return '';
  const[y,m]=month.split('-').map(Number),lastDay=new Date(Date.UTC(y,m,0)).getUTCDate();return month+'-'+String(Math.min(day,lastDay)).padStart(2,'0');
 }
 function splitLoan(input,names,amounts){
  const n=names.length;if(n<2||n>10||names.some(x=>typeof x!=='string'||!clean(x)||clean(x).length>60)||new Set(names.map(personKey)).size!==n)throw Error('names');
  const shares=input.splitMode==='equal'?names.map((_,i)=>Math.floor(input.loanTotal/n)+(i<input.loanTotal%n?1:0)):input.splitMode==='monthly'?amounts.map(x=>x*input.parts):amounts;
  if(!Array.isArray(shares)||shares.length!==n||shares.some(x=>!Number.isSafeInteger(x)||x<=0)||shares.reduce((s,x)=>s+x,0)!==input.loanTotal)throw Error('amounts');
  let offset=0;const rows=names.map((name,i)=>{const record={id:input.loanId+':'+i,kind:'loan',loanId:input.loanId,description:input.description,bank:input.bank,person:clean(name),cents:shares[i],parts:input.parts,month:input.month,loanTotal:input.loanTotal,splitMode:input.splitMode,offset,...(input.principalCents!==undefined?{principalCents:input.principalCents}:{}),...(input.dueDay!==undefined?{dueDay:input.dueDay}:{})};offset=(offset+shares[i]%input.parts)%input.parts;return record;});
  if(!validRecords(rows))throw Error('invalid');return rows;
 }
 return{banks,valid,validRecords,items,splitLoan,installment,personKey,dueDate,active,markPaid};
})();
