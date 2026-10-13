import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const asset=html.match(/src="\.\/(assets\/index-[^"]+\.js)"/)[1];
const source=fs.readFileSync(new URL(asset,root),'utf8');
// Parse as plain JavaScript too: catches malformed JSX-runtime edits that
// Node's automatic syntax detection can otherwise interpret as type syntax.
new vm.Script(source.replace(/import\s*\{[^}]+\}\s*from\s*["'][^"']+["'];/g,'').replace('await loadPricing()','null').replaceAll('import.meta','({url:""})').replace(/export\{[^}]+\};?\s*$/,''));
const pricing=JSON.parse(fs.readFileSync(new URL('pricing.json',root),'utf8'));
const vehicles=pricing.campaigns.find(c=>c.id===pricing.activeCampaignId).vehicles;
const discounts=Object.fromEntries(vehicles.map(v=>[v.key,v.cashDiscount||0]));
const peso=n=>'₱'+n.toLocaleString('en-PH');
const context={pe:s=>Number(String(s).replace(/[^0-9.]/g,'')),he:peso,octoberCashDiscounts:discounts};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function cashQuote('),source.indexOf('function be({')),context);
for(const vehicle of vehicles){
 const q=context.cashQuote({srp:peso(vehicle.srp)},vehicle.key);
 assert.equal(q.cashPrice,peso(vehicle.srp-(vehicle.cashDiscount||0)));
 assert.equal(q.paymentType,'cash');
 assert.equal(q.monthly,undefined);
 for(const renderer of ['Se','Oe']){
  const start=source.indexOf('[...(t.paymentType===`cash`?['+renderer+'(');
  assert.ok(start>=0);
  const end=source.indexOf(',...managedPerks.map',start);
  const rows=vm.runInNewContext(source.slice(start,end)+']',{t:q,[renderer]:(label,value)=>label+': '+value,cashPromoLabel:'Cash promo'}).join('\n');
  assert.match(rows,/Final cash price/);
  assert.ok(rows.includes(q.cashPrice));
  assert.doesNotMatch(rows,/BPI|BDO|financed|monthly|cash-out|tier/i);
  const financed=vm.runInNewContext(source.slice(start,end)+']',{t:{srp:'₱1,000,000',bankNote:'BDO',downPaymentPercent:20,bpiCashOut:'₱100,000',amountFinanced:'₱800,000',monthly:'₱20,000'},[renderer]:(label,value)=>label+': '+value,cashPromoLabel:'Cash promo'}).join('\n');
  assert.match(financed,/BDO/);assert.match(financed,/Estimated monthly payment/);assert.doesNotMatch(financed,/Final cash price/);
 }
}
const textContext={managedPerks:[],_e:[],Ne:()=> 'Test vehicle'};vm.createContext(textContext);
vm.runInContext(source.slice(source.indexOf('function Pe({proposal:'),source.indexOf('function Fe(e,{')),textContext);
const body=textContext.Pe({proposal:{clientName:'TEST'},consultant:{},model:{},variant:context.cashQuote({srp:'₱1,108,000'},'atto2-dmi:dynamic')}).body;
assert.match(body,/Final cash price: ₱1,058,000/);assert.doesNotMatch(body,/BPI|BDO|financed|monthly payment|cash-out|tier|financing options/i);
console.log(`Cash calculations and email/PDF payment rows verified for ${vehicles.length} variants; financing rows preserved; plain-text cash output verified.`);
