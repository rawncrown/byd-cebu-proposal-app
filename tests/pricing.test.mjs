import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../pricing-core.js',import.meta.url),'utf8');
const {validatePricing,activeCampaign,calculateMonthly}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const data=JSON.parse(readFileSync(new URL('../pricing.json',import.meta.url),'utf8'));
assert.equal(validatePricing(data),data);
assert.equal(activeCampaign(data).vehicles.length,23);
const invalid=mutate=>{const d=structuredClone(data);mutate(d);assert.throws(()=>validatePricing(d));};
invalid(d=>d.activeCampaignId='missing');
invalid(d=>d.campaigns.push(structuredClone(d.campaigns[0])));
invalid(d=>d.campaigns[0].vehicles[0].srp=-1);
invalid(d=>d.campaigns[0].vehicles[0].cashDiscount=1e9);
invalid(d=>d.campaigns[0].vehicles[0].banks.BPI[20].monthly[60]=1.5);
invalid(d=>delete d.campaigns[0].vehicles[0].banks.BPI[20].monthly[36]);
const zero=structuredClone(data);zero.campaigns[0].vehicles[0].banks.BPI[20].cashOut=0;validatePricing(zero);
assert.equal(calculateMonthly(1398000,20,60,1.5788),29429);
const special=new Set([1008000,1028000,1108000,1318000,1338000,1398000,1618000,1918000]);
let checked=0;
for(const v of activeCampaign(data).vehicles)for(const rows of Object.values(v.banks))for(const [tier,q] of Object.entries(rows))for(const [term,payment] of Object.entries(q.monthly)){
 const factors={36:1.3823,48:1.4687,60:Number(tier)===20&&special.has(v.srp)?1.5788:1.559,72:1.6636,84:Number(tier)<=20?1.726:1.724};
 assert.equal(payment,calculateMonthly(v.srp,Number(tier),Number(term),factors[term]),`${v.key} ${tier}% ${term}`);checked++;
}
assert.equal(activeCampaign(data).vehicles.find(v=>v.name==='ATTO 3 · DYNAMIC').banks.BDO[40],undefined);
console.log(`Passed validation tests and ${checked} existing monthly-payment checks across 23 vehicles.`);
