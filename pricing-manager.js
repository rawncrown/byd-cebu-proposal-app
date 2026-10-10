import {validatePricing,activeCampaign,DRAFT_KEY,LOCAL_KEY,TIERS,TERMS,calculateMonthly} from './pricing-core.js';
const $=id=>document.getElementById(id);
const api='https://api.github.com/repos/rawncrown/byd-cebu-proposal-app/contents/pricing.json';
let data,month,vehicle,bank='BPI',dirty=false,baseRevision;
const status=(message,error=false)=>{$('status').textContent=message;$('status').className=error?'error':'';};
const campaign=()=>data.campaigns.find(c=>c.id===month);
const current=()=>campaign().vehicles.find(v=>v.key===vehicle);
function option(value,text){const el=document.createElement('option');el.value=value;el.textContent=text;return el;}
function amount(input,nullable=false){if(input.value.trim()===''){if(nullable)return null;throw Error('Complete all amounts for every enabled tier.');}const n=Number(input.value);if(!Number.isFinite(n)||n<0)throw Error('Amounts must be zero or greater.');return n;}
function render(){
 $('campaign').replaceChildren(...data.campaigns.map(c=>option(c.id,c.label)));$('campaign').value=month;
 $('label').value=campaign().label;const perk=campaign().perks?.[0];$('perk-label').value=perk?.label??'';$('perk-fee').value=perk?.regularPrice??'';$('active').textContent='Month used in quotations: '+activeCampaign(data).label;
 if(!campaign().vehicles.some(v=>v.key===vehicle))vehicle=campaign().vehicles[0].key;
 $('vehicle').replaceChildren(...campaign().vehicles.map(v=>option(v.key,v.name)));$('vehicle').value=vehicle;
 $('srp').value=current().srp;$('discount').value=current().cashDiscount??'';$('bank').value=bank;
 const terms=TERMS.filter(t=>t<=60||bank==='BPI');
 $('columns').replaceChildren();const tr=document.createElement('tr');
 for(const text of ['Available','DP tier','Cash-out (₱)',...terms.map(t=>`${t/12} years / month (₱)`)]){const th=document.createElement('th');th.textContent=text;tr.append(th);}$('columns').append(tr);
 $('quotes').replaceChildren();
 for(const tier of TIERS){const q=current().banks[bank]?.[tier];const row=document.createElement('tr');row.dataset.tier=tier;
  const available=document.createElement('input');available.type='checkbox';available.checked=!!q;available.setAttribute('aria-label',`${tier}% available`);
  const cell=document.createElement('td');cell.append(available);row.append(cell);const title=document.createElement('td');title.textContent=tier+'%';row.append(title);
  for(const field of ['cashOut',...terms]){const td=document.createElement('td');const input=document.createElement('input');input.type='number';input.min='0';input.step=field==='cashOut'?'0.01':'1';input.dataset.field=field;input.value=field==='cashOut'?(q?.cashOut??''):(q?.monthly[field]??'');input.disabled=!q;input.setAttribute('aria-label',`${tier}% ${field==='cashOut'?'cash-out':field+' month payment'}`);td.append(input);row.append(td);}
  available.onchange=()=>{row.querySelectorAll('input[type=number]').forEach(input=>input.disabled=!available.checked);dirty=true;};$('quotes').append(row);
 }
 $('rates').replaceChildren();
 for(const t of terms){const label=document.createElement('label');label.textContent=t/12+' years add-on %';const input=document.createElement('input');input.type='number';input.min='0';input.step='.01';input.dataset.term=t;input.placeholder='Approved rate';label.append(input);$('rates').append(label);}
}
function commit(){
 const v=current();const rows={};
 for(const row of $('quotes').rows){if(!row.querySelector('input[type=checkbox]').checked)continue;const inputs=[...row.querySelectorAll('input[type=number]')];rows[row.dataset.tier]={cashOut:amount(inputs[0]),monthly:Object.fromEntries(inputs.slice(1).map(i=>[i.dataset.field,amount(i)]))};}
 const next=structuredClone(data),c=next.campaigns.find(c=>c.id===month),nv=c.vehicles.find(v=>v.key===vehicle);
 c.label=$('label').value.trim();const perkLabel=$('perk-label').value.trim(),perkFee=amount($('perk-fee'),true);if(perkFee&&!perkLabel)throw Error('Enter the free service name.');if(perkLabel&&perkFee==null)throw Error('Enter the regular fee for the free service.');if(perkLabel&&perkFee)c.perks=[{id:c.perks?.[0]?.id||'perk-1',label:perkLabel,regularPrice:perkFee}];else delete c.perks;nv.srp=amount($('srp'));nv.cashDiscount=amount($('discount'),true);
 if(Object.keys(rows).length)nv.banks[bank]=rows;else delete nv.banks[bank];
 validatePricing(next);data=next;
}
const guard=fn=>async event=>{try{await fn(event);}catch(e){status(e.message,true);}};
function save(key){commit();data.updatedAt=new Date().toISOString();localStorage.setItem(key,JSON.stringify(data));dirty=false;}
$('campaign').onchange=guard(()=>{const next=$('campaign').value;try{commit();}catch(e){$('campaign').value=month;throw e;}month=next;render();});
$('vehicle').onchange=guard(()=>{const next=$('vehicle').value;try{commit();}catch(e){$('vehicle').value=vehicle;throw e;}vehicle=next;render();});
$('bank').onchange=guard(()=>{const next=$('bank').value;try{commit();}catch(e){$('bank').value=bank;throw e;}bank=next;render();});
document.querySelector('main').addEventListener('input',e=>{if(e.target.id!=='token')dirty=true;});
$('activate').onclick=guard(()=>{commit();data.activeCampaignId=month;dirty=true;render();status('Selected '+campaign().label+'. Save locally or publish to apply it.');});
$('duplicate').onclick=guard(()=>{commit();const id=$('new-month').value;if(!id)throw Error('Choose the new month first.');if(data.campaigns.some(c=>c.id===id))throw Error('That month already exists.');const copy=structuredClone(campaign());copy.id=id;copy.label=new Date(id+'-15T12:00:00').toLocaleDateString('en-PH',{month:'long',year:'numeric'})+' promo';data.campaigns.push(copy);month=id;dirty=true;render();status('Month copied. Edit the offers, then select “Use this month” before saving or publishing.');});
$('recalculate').onclick=guard(()=>{commit();const inputs=[...$('rates').querySelectorAll('input')];const factors=Object.fromEntries(inputs.map(i=>[i.dataset.term,1+amount(i)/100]));if(!confirm('Replace all monthly payments for this vehicle and bank using these rates?'))return;for(const [tier,q] of Object.entries(current().banks[bank]||{}))for(const term of Object.keys(q.monthly))q.monthly[term]=calculateMonthly(current().srp,Number(tier),Number(term),factors[term]);dirty=true;render();status('Monthly payments recalculated. Review before publishing.');});
$('save').onclick=guard(()=>{save(DRAFT_KEY);status('Draft saved on this device. Shared prices have not changed.');});
$('apply').onclick=guard(()=>{save(LOCAL_KEY);localStorage.setItem(DRAFT_KEY,JSON.stringify(data));status('Browser-only prices saved. Reload the generator to use them.');});
$('shared').onclick=guard(()=>{localStorage.removeItem(LOCAL_KEY);status('Browser override removed. Reload the generator to use shared prices. Your draft is retained.');});
$('export').onclick=guard(()=>{commit();const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download='byd-prices-'+data.activeCampaignId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Price backup downloaded.');});
$('import').onchange=guard(async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;if(file.size>2e6)throw Error('Price backup is too large.');const imported=validatePricing(JSON.parse(await file.text()));if(!confirm('Replace the current editor draft with this backup?'))return;data=imported;month=data.activeCampaignId;dirty=true;render();status('Backup loaded for review. Save or publish to apply.');});
async function github(token,options={}){const response=await fetch(api,{...options,headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...options.headers}});if(!response.ok)throw Error(response.status===409?'Shared prices changed. Reload and review the latest file before publishing.':response.status===401||response.status===403?'GitHub denied access. Check token expiry and Contents read/write permission for this repository.':'GitHub could not publish the price file ('+response.status+').');return response.json();}
$('publish').onclick=guard(async()=>{
 commit();const token=$('token').value.trim();if(!token)throw Error('Enter a GitHub repository access token to publish.');
 if(!confirm(`Publish ${activeCampaign(data).label} for everyone? This replaces the shared price file, including the saved monthly promos.`))return;
 $('publish').disabled=true;
 try {
  status('Checking the latest shared version…');const remote=await github(token);const decoded=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(remote.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
  if(decoded.updatedAt!==baseRevision)throw Error('Shared prices have changed since this editor was opened. Download your draft, then reload and review the latest prices before publishing.');
  data.updatedAt=new Date().toISOString();const bytes=new TextEncoder().encode(JSON.stringify(data,null,2)+'\n');let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  const result=await github(token,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Update BYD prices: '+activeCampaign(data).label,content:btoa(binary),sha:remote.sha,branch:'main'})});
  baseRevision=data.updatedAt;localStorage.setItem(DRAFT_KEY,JSON.stringify(data));localStorage.removeItem(LOCAL_KEY);dirty=false;
  status('Published to GitHub. Deployment may take 1–2 minutes. Reload the generator after deployment.');
  const link=document.createElement('a');link.href='https://github.com/rawncrown/byd-cebu-proposal-app/actions';link.textContent=' View deployment status';link.target='_blank';link.rel='noopener noreferrer';$('status').append(link);
 }finally{$('token').value='';$('publish').disabled=false;}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
try{const response=await fetch('./pricing.json',{cache:'no-store'});if(!response.ok)throw Error('Cannot load the shared price file.');data=validatePricing(await response.json());baseRevision=data.updatedAt;const draft=localStorage.getItem(DRAFT_KEY);if(draft&&confirm('Restore your saved pricing draft?'))data=validatePricing(JSON.parse(draft));month=data.activeCampaignId;vehicle=activeCampaign(data).vehicles[0].key;render();status('Prices loaded. Edits stay in this editor until saved or published.');}catch(e){status(e.message,true);document.querySelectorAll('button').forEach(b=>b.disabled=true);}
