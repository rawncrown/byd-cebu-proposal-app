export const DRAFT_KEY = 'byd-pricing-draft-v1';
export const LOCAL_KEY = 'byd-pricing-local-v1';
export const BANKS = ['BPI', 'BDO', 'Other Banks'];
export const TIERS = [15,20,25,30,35,40,45,50];
export const TERMS = [36,48,60,72,84];
export function validatePricing(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.campaigns) || !data.campaigns.length) throw Error('Invalid price file.');
  if (!data.campaigns.some(c => c.id === data.activeCampaignId)) throw Error('Choose an active month.');
  const ids = new Set();
  const number = (n, label, nullable=false) => {
    if (nullable && n === null) return;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1e9) throw Error(`${label} must be a valid non-negative amount.`);
  };
  for (const c of data.campaigns) {
    if (!/^\d{4}-\d{2}$/.test(c.id) || Number(c.id.slice(5))<1 || Number(c.id.slice(5))>12 || ids.has(c.id)) throw Error('Each month must be unique and valid.');
    ids.add(c.id);
    if (typeof c.label !== 'string' || !c.label.trim() || c.label.length>100) throw Error('Enter a month title (up to 100 characters).');
    if (c.perks !== undefined) {
      if (!Array.isArray(c.perks) || c.perks.length > 5) throw Error('Invalid free-service promos.');
      for (const p of c.perks) {
        if (typeof p?.label !== 'string' || !p.label.trim() || p.label.length > 80) throw Error('Enter the free service name (up to 80 characters).');
        number(p.regularPrice,'Regular fee'); if (!p.regularPrice) throw Error('Regular fee must be greater than zero.');
      }
    }
    if (!Array.isArray(c.vehicles) || !c.vehicles.length) throw Error('No vehicles in this month.');
    const keys = new Set();
    for (const v of c.vehicles) {
      if (typeof v.key !== 'string' || !/^[a-z0-9-]+:[a-z0-9-]+$/.test(v.key) || keys.has(v.key)) throw Error('Invalid or duplicate vehicle.');
      keys.add(v.key);
      if (typeof v.name !== 'string' || !v.name.trim() || v.name.length>150) throw Error('Invalid vehicle name.');
      number(v.srp,'SRP'); if (!v.srp) throw Error('SRP must be greater than zero.');
      number(v.cashDiscount,'Cash discount',true);
      if(v.cashDiscount>v.srp) throw Error('Discount cannot exceed SRP.');
      if (!v.banks || typeof v.banks!=='object' || !Object.keys(v.banks).length) throw Error('At least one bank is required.');
      for(const [bank,rows] of Object.entries(v.banks)) {
        if(!BANKS.includes(bank)) throw Error('Unknown bank.');
        for(const [tier,q] of Object.entries(rows)) {
          if(!TIERS.includes(Number(tier))) throw Error('Invalid down-payment tier.');
          number(q.cashOut,'Cash-out');
          for(const term of TERMS.filter(t=>t<=60||bank==='BPI')) {
            number(q.monthly?.[term],'Monthly payment');
            if(!Number.isInteger(q.monthly[term]) || q.monthly[term]<=0) throw Error('Monthly payments must be positive whole pesos.');
          }
          if(bank!=='BPI' && (q.monthly[72]!=null||q.monthly[84]!=null)) throw Error('6 and 7 years are BPI only.');
        }
      }
      if(!Object.values(v.banks).some(rows=>Object.keys(rows).length)) throw Error('Keep at least one available bank/tier for each vehicle.');
    }
  }
  return data;
}
export function activeCampaign(data) { return data.campaigns.find(c=>c.id===data.activeCampaignId); }
export function calculateMonthly(srp,tier,term,factor) {
  return Math.round(srp*(1-tier/100)*factor/term);
}
export async function loadPricing() {
  let shared;
  try { const response=await fetch(new URL('./pricing.json',import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(8000)}); if(!response.ok) throw Error('Price list unavailable'); shared=validatePricing(await response.json()); }
  catch { shared=null; }
  try { const local=localStorage.getItem(LOCAL_KEY); if(local) return {data:validatePricing(JSON.parse(local)),local:true}; } catch {}
  return shared ? {data:shared,local:false} : null;
}
