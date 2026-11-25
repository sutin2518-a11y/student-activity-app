export const REGISTRATION_SPORTS = [
 {key:'football',prefix:'FB',name:'ฟุตบอล',icon:'⚽',color:'#087f5b',special:true},
 {key:'futsal',prefix:'FS',name:'ฟุตซอล',icon:'⚽',color:'#0891b2',special:true},
 {key:'basketball',prefix:'BB',name:'บาสเกตบอล',icon:'🏀',color:'#c2410c',special:true},
 {key:'volleyball',prefix:'VB',name:'วอลเลย์บอล',icon:'🏐',color:'#0755ce',special:false},
 {key:'takraw',prefix:'ST',name:'เซปักตะกร้อ',icon:'🏐',color:'#7c3aed',special:false},
 {key:'petanque',prefix:'PT',name:'เปตอง',icon:'🔴',color:'#be123c',special:false},
 {key:'table-tennis',prefix:'TT',name:'เทเบิลเทนนิส',icon:'🏓',color:'#db2777',special:false},
 {key:'esports',prefix:'ES',name:'E-Sport (RoV)',icon:'🎮',color:'#4338ca',special:false},
 {key:'boxing',prefix:'BX',name:'มวยสากลสมัครเล่น',icon:'🥊',color:'#b91c1c',special:false},
 {key:'athletics',prefix:'AT',name:'กรีฑา',icon:'🏃',color:'#00866a',special:false},
] as const;
export type RegistrationSport = typeof REGISTRATION_SPORTS[number]['key'];
export type RegistrationEvent = {id:string;event_code?:string|null;sport_name:string;event_type:string};
export function registrationSport(key:string|null) {return REGISTRATION_SPORTS.find(s=>s.key===key);}
export function eventRegistrationSport(event:RegistrationEvent):RegistrationSport|undefined {
 const code=event.event_code||'';
 const byCode=REGISTRATION_SPORTS.find(s=>code.startsWith(`GS3-${s.prefix}-`));
 if(byCode)return byCode.key;
 if(event.event_type==='athletics'||/^(กรีฑา|วิ่ง|กระโดด|ขว้าง|ทุ่ม|พุ่ง)/.test(event.sport_name))return 'athletics';
 if(/RoV|E-Sport|อีสปอร์ต/i.test(event.sport_name))return 'esports';
 return REGISTRATION_SPORTS.find(s=>event.sport_name.startsWith(s.name))?.key;
}
export function allowsRegistrationPhotos(event?: RegistrationEvent) {
 return !!event && eventRegistrationSport(event) !== "boxing";
}
export function registrationHref(s:typeof REGISTRATION_SPORTS[number]) {
 return `/group-sports/${s.key}?tab=registration`;
}
export function normalizedName(name:string){return name.normalize('NFKC').replace(/^(เด็กชาย|เด็กหญิง|นาย|นางสาว)\s*/,'').replace(/\s+/g,'').trim();}
export function duplicateNames(names:string[]){const keys=names.map(normalizedName).filter(Boolean);return [...new Set(keys.filter((k,i)=>keys.indexOf(k)!==i))];}
export function sameAthlete(a:{student_code?:string|null;full_name:string}, b:{student_code?:string|null;full_name:string}){
 const ac=a.student_code?.trim(),bc=b.student_code?.trim();
 if(ac&&bc)return ac===bc?'code':null;
 const an=normalizedName(a.full_name);return an&&an===normalizedName(b.full_name)?'name':null;
}
