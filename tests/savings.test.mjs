import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const baseline=fs.readFileSync(new URL('september-baseline.js',root),'utf8');
const helper=fs.readFileSync(new URL('dp-savings.js',root),'utf8');
const ctx={};vm.createContext(ctx);
vm.runInContext(baseline.replace('export const','const')+helper.replace(/^import[^;]+;/,'').replaceAll('export function','function'),ctx);
const get=(key,bank,tier,current,srp)=>ctx.getDpSavings('2026-10',key,bank,tier,current,srp);
assert.equal(get('atto2-dmi:dynamic','BPI',20,48000,1108000).saved,20000);
assert.equal(get('new-seal5-dmi:essential','BPI',20,38000,1008000).previous,58000);
assert.equal(get('atto2-ev:premium','BPI',20,178000,1398000),null); // October higher
assert.equal(get('han:han-bev','BPI',20,368000,3283000),null); // unchanged
assert.equal(get('new-seal5-dmi:essential','BPI',15,0,1008000),null); // dash, not zero
assert.equal(get('seagull:seagull-bev','BPI',20,38000,1028000),null); // ambiguous year
assert.equal(get('seagull:seagull-bev','BDO',20,38000,1028000),null); // no BDO row
assert.equal(get('atto2-dmi:dynamic','BPI',20,48000,999999),null); // different price
assert.equal(ctx.getDpSavings('2026-11','atto2-dmi:dynamic','BPI',20,48000,1108000),null);
assert.equal(get('atto2-dmi:dynamic','BPI',20,NaN,1108000),null);
const data=JSON.parse(fs.readFileSync(new URL('pricing.json',root),'utf8'));
const campaign=data.campaigns.find(c=>c.id===data.activeCampaignId);
let matched=0;
for(const v of campaign.vehicles)for(const [bank,rows] of Object.entries(v.banks))for(const [tier,q] of Object.entries(rows)){
 const result=get(v.key,bank,Number(tier),q.cashOut,v.srp);
 if(result){assert.ok(result.saved>0);assert.equal(result.previous-result.current,result.saved);matched++;}
}
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const path=html.match(/src="\.\/(assets\/index-[^"]+\.js)"/)[1];
const source=fs.readFileSync(new URL(path,root),'utf8');
const sample=get('atto2-dmi:dynamic','BPI',20,48000,1108000);
for(const renderer of ['Se','Oe']){
 const start=source.indexOf('[...(t.paymentType===`cash`?['+renderer+'(');
 const end=source.indexOf(',...managedPerks.map',start);
 const output=vm.runInNewContext(source.slice(start,end)+']',{t:{upfrontComparison:sample,srp:'₱1,108,000',bankNote:'BPI',downPaymentPercent:20,bpiCashOut:'₱48,000',monthly:'₱23,324'},[renderer]:(label,value)=>label+' '+value,savingsLabel:ctx.savingsLabel,savingsValue:ctx.savingsValue}).join('\n');
 assert.match(output,/September cash-out: ₱68,000/);assert.match(output,/₱20,000 less upfront/);
}
console.log(`Savings helper and export rows passed; ${matched} eligible October bank/tier offers have verified positive savings.`);
