const VERSION="1.7.160",BUILD="2026.08.29";
const defaults={Abs:["Cable Crunch","Hanging Leg Raise","Plank"],Back:["Lat Pulldown","Seated Cable Row","Single Arm Dumbbell Row","T-Bar Row"],Biceps:["Behind-the-Back Cable Curl","Cable Curl","Hammer Curl","Incline Dumbbell Curl"],Calves:["Calf Raise","Seated Calf Raise"],Cardio:["Cycling","Running","Walking"],Chest:["Flat Bench Press","Inclined Dumbbell Press","Pec Deck Fly","Wide Chest Press Machine"],Legs:["Leg Extension","Leg Press","Romanian Deadlift","Squat"],Shoulders:["Dumbbell Lateral Raise","Face Pull","Overhead Press","Rear Delt Fly"],Triceps:["Cable Pushdown","Overhead Cable Extension","Skull Crusher"]};
const STORE_KEY="wt_state";
const STORE_BACKUP_KEY="wt_state_backup";
const STORE_AT_KEY="wt_state_at";
const DEVICE_KEY="wt_device_id";
const IDB_NAME="workout-tracker";
function newId(){return globalThis.crypto?.randomUUID?crypto.randomUUID():`id-${Date.now()}-${Math.random().toString(36).slice(2)}`}

function looksLikeState(s){
 return !!(s&&Array.isArray(s.muscles)&&Array.isArray(s.exercises)&&Array.isArray(s.workouts));
}
function readLocalState(key){
 try{
  const parsed=JSON.parse(localStorage.getItem(key)||"null");
  return looksLikeState(parsed)?parsed:null;
 }catch(err){return null}
}
const BIN_KEEP_MS=30*24*60*60*1000;
function emptyBin(){return {workouts:[],exercises:[],muscles:[]}}
function ensureBin(s){
 if(!s)return s;
 if(!s.bin||typeof s.bin!=="object")s.bin=emptyBin();
 if(!Array.isArray(s.bin.workouts))s.bin.workouts=[];
 if(!Array.isArray(s.bin.exercises))s.bin.exercises=[];
 if(!Array.isArray(s.bin.muscles))s.bin.muscles=[];
 purgeExpiredBin(s);
 return s;
}
function purgeExpiredBin(s){
 if(!s?.bin)return;
 const cut=Date.now()-BIN_KEEP_MS;
 s.bin.workouts=s.bin.workouts.filter(x=>x&&Number(x.deletedAt)>cut);
 s.bin.exercises=s.bin.exercises.filter(x=>x&&Number(x.deletedAt)>cut);
 s.bin.muscles=s.bin.muscles.filter(x=>x&&Number(x.deletedAt)>cut);
}
function seedDefaults(){
 const next={muscles:Object.keys(defaults).map(name=>({id:newId(),name})),exercises:[],workouts:[],bin:emptyBin()};
 next.muscles.forEach(m=>(defaults[m.name]||[]).forEach(name=>next.exercises.push({id:newId(),name,muscleId:m.id})));
 return next;
}
function migrateState(s){
 s.workouts=(s.workouts||[]).map(w=>({...w,startTime:w.startTime||"",endTime:w.endTime||""}));
 if(s.activeWorkout&&!s.activeWorkout.date)delete s.activeWorkout;
 return ensureBin(s);
}
function readLocalAt(){
 try{return Number(localStorage.getItem(STORE_AT_KEY)||0)||0}catch(err){return 0}
}
function writeLocal(json,at){
 try{localStorage.setItem(STORE_KEY,json)}catch(err){}
 try{localStorage.setItem(STORE_BACKUP_KEY,json)}catch(err){}
 try{localStorage.setItem(STORE_AT_KEY,String(at))}catch(err){}
}
function getDeviceId(){
 try{
  let id=localStorage.getItem(DEVICE_KEY);
  if(!id){id=newId();localStorage.setItem(DEVICE_KEY,id)}
  return id;
 }catch(err){return newId()}
}
function requestPersistentStorage(){
 try{navigator.storage?.persist?.()}catch(err){}
}
function openIdb(){
 return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(new Error("no indexedDB"));return}
  const req=indexedDB.open(IDB_NAME,1);
  req.onupgradeneeded=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains("kv"))db.createObjectStore("kv");
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
 });
}
function unwrapIdb(raw){
 if(looksLikeState(raw))return{state:raw,at:0};
 if(raw&&looksLikeState(raw.state))return{state:raw.state,at:Number(raw.at)||0};
 return{state:null,at:0};
}
function pickNewerState(localState,localAt,idbState,idbAt){
 if(!localState)return idbState;
 if(!idbState)return localState;
 return idbAt>=localAt?idbState:localState;
}
function idbGetState(db){
 return new Promise((resolve,reject)=>{
  const req=db.transaction("kv","readonly").objectStore("kv").get("state");
  req.onsuccess=()=>resolve(unwrapIdb(req.result));
  req.onerror=()=>reject(req.error);
 });
}
function idbWriteState(db,next,at){
 return new Promise((resolve,reject)=>{
  let copy;
  try{copy=JSON.parse(JSON.stringify(next))}catch(err){reject(err);return}
  const tx=db.transaction("kv","readwrite");
  tx.objectStore("kv").put({at,state:copy},"state");
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error);
 });
}
async function persistAll(){
 purgeExpiredBin(state);
 let json;
 try{json=JSON.stringify(state)}catch(err){return}
 const at=Date.now();
 writeLocal(json,at);
 requestPersistentStorage();
 try{
  const db=await openIdb();
  await idbWriteState(db,state,at);
 }catch(err){}
}
function save(){persistAll()}
async function wipeStoredData(){
 try{localStorage.removeItem(STORE_KEY)}catch(err){}
 try{localStorage.removeItem(STORE_BACKUP_KEY)}catch(err){}
 try{localStorage.removeItem(STORE_AT_KEY)}catch(err){}
 await new Promise(resolve=>{
  if(!globalThis.indexedDB){resolve();return}
  const req=indexedDB.deleteDatabase(IDB_NAME);
  req.onsuccess=req.onerror=req.onblocked=()=>resolve();
  setTimeout(resolve,1500);
 });
}

let state=readLocalState(STORE_KEY)||readLocalState(STORE_BACKUP_KEY);
const storageReady=(async()=>{
 try{
  const db=await openIdb();
  const idb=await idbGetState(db);
  state=pickNewerState(state,readLocalAt(),idb.state,idb.at);
 }catch(err){}
 if(!state)state=seedDefaults();
 migrateState(state);
 getDeviceId();
 await persistAll();
})();
let selected=new Date();selected.setHours(0,0,0,0);let month=new Date(selected.getFullYear(),selected.getMonth(),1);
function esc(s){
  return String(s).replace(/[&<>"']/g,c=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}
function isValidDateString(value){
  if(typeof value!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))return false;
  const [y,m,d]=value.split("-").map(Number);
  const dt=new Date(y,m-1,d);
  return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;
}
function dateKey(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function muscle(id){return state.muscles.find(x=>x.id===id)?.name||"Unknown"}
