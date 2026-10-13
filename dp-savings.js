import {septemberBaseline} from './september-baseline.js';
const names={
 'atto2-ev:premium':'ATTO 2 EV',
 'atto2-dmi:dynamic':'ATTO 2 DM-I DYNAMIC',
 'atto2-dmi:premium':'ATTO 2 DM-I PREMIUM',
 'new-seal5-dmi:dynamic':'SEAL 05 DYNAMIC',
 'new-seal5-dmi:essential':'SEAL 05 ESSENTIAL',
 'seagull:seagull-bev':'SEAGULL',
 'seal5-dmi:dynamic':'SEAL 5 DYNAMIC',
 'seal5-dmi:premium':'SEAL 5 PREMIUM',
 'sealion5-dmi:sealion5':'SEALION 5',
 'sealion6-dmi:sealion6':'SEALION 6',
 'emax7:standard':'EMAX 7 STANDARD',
 'emax7:superior-captain':'EMAX 7 SUPERIOR CAPTAIN',
 'atto3:dynamic':'ATTO 3 DYNAMIC',
 'atto3:premium':'ATTO 3 PREMIUM',
 'tang-dmi:tang-dmi':'TANG DMI (ALL COLORS)',
 'shark6-dmo:advance':'SHARK 6 ADVANCED',
 'shark6-dmo:premium':'SHARK 6 PREMIUM',
 'sealion7:sealion7':'SEALION 7',
 'seal:performance':'SEAL PERFORMANCE',
 'emax9-dmi:advance':'EMAX 9 ADVANCED',
 'emax9-dmi:premium':'EMAX 9 PREMIUM',
 'han:han-bev':'HAN','tang:tang-bev':'TANG'
};
export function getDpSavings(month,key,bank,tier,current,srp){
 // October only: copying a campaign into November must not reuse this baseline.
 if(month!=='2026-10'||!Number.isFinite(current)||current<0)return null;
 const name=names[key],rows=septemberBaseline.banks[bank];
 // No model-year selector exists in the generator. Do not guess which BPI
 // schedule applies when September lists a separate 2026-and-up schedule.
 if(!rows||!name||rows[name+' - 2026 AND UP'])return null;
 const row=rows[name],previous=row?.cashOut[String(tier)];
 if(row?.srp!==srp||!Number.isFinite(previous)||previous<=current)return null;
 return {previous,current,saved:previous-current,bank,tier:Number(tier)};
}
const peso=n=>'₱'+n.toLocaleString('en-PH',{maximumFractionDigits:2});
export function savingsLabel(s){return `September cash-out: ${peso(s.previous)} · Same bank / ${s.tier}% tier`;}
export function savingsValue(s){return `${peso(s.saved)} less upfront`;}
