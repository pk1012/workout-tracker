const VERSION="1.7.239",BUILD="2026.08.30";
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
 ensureBin(s);
 s.workouts=(s.workouts||[]).map(w=>{
  const next={...w,startTime:w.startTime||"",endTime:w.endTime||""};
  next.muscleNames=workoutMuscleNames(next,s);
  next.exercises=(next.exercises||[]).map(raw=>withWorkoutExerciseHistory(raw,next,s));
  return next;
 });
 if(s.activeWorkout&&!s.activeWorkout.date)delete s.activeWorkout;
 return s;
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
let selected=new Date();selected.setHours(0,0,0,0);
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
const UNIT_KEY="wt_unit";
function preferredUnit(){return localStorage.getItem(UNIT_KEY)==="lb"?"lb":"kg"}
function convertWeight(value,from,to){
 from=from==="lb"?"lb":"kg";
 to=to==="lb"?"lb":"kg";
 if(value===""||value==null)return value;
 const n=Number(value);
 if(!Number.isFinite(n))return value;
 if(from===to||n===0)return n;
 const next=from==="kg"?n*2.2046226218:n*0.45359237;
 return Math.round(next*100)/100;
}
function displayWeight(value,from){return convertWeight(value,from||"kg",preferredUnit())}
function muscleNameFromState(s,id){
 const live=(s?.muscles||[]).find(x=>x.id===id)?.name;
 if(live)return live;
 const bin=(s?.bin&&Array.isArray(s.bin.muscles)?s.bin.muscles:[]).find(x=>x.id===id)?.name;
 return bin||"";
}
function muscle(id){return muscleNameFromState(state,id)||"Unknown"}
function workoutMuscleNames(w,s=state){
 const ids=Array.isArray(w?.muscles)?w.muscles:[];
 const stored=Array.isArray(w?.muscleNames)?w.muscleNames:[];
 return ids.map((id,i)=>{
  const kept=typeof stored[i]==="string"?stored[i].trim():"";
  if(kept&&kept!=="Unknown")return kept;
  return muscleNameFromState(s,id)||kept||"Unknown";
 });
}
function muscleNamesForIds(ids,previous,s=state){
 return (ids||[]).map(id=>{
  const live=muscleNameFromState(s,id);
  if(live)return live;
  const i=(previous?.muscles||[]).indexOf(id);
  const kept=i>=0&&typeof previous?.muscleNames?.[i]==="string"?previous.muscleNames[i].trim():"";
  return (kept&&kept!=="Unknown")?kept:"Unknown";
 });
}
function workoutMuscleLabel(w){
 const names=workoutMuscleNames(w).filter(Boolean);
 return names.length?names.join(" + "):"Workout";
}
function exerciseIdOf(raw){return typeof raw==="string"?raw:(raw&&raw.exerciseId)||""}
function keptExerciseName(raw){
 if(!raw||typeof raw==="string")return "";
 const n=typeof raw.name==="string"?raw.name.trim():"";
 return (n&&n!=="Deleted exercise")?n:"";
}
function exerciseNameFromState(s,id){
 if(!id)return "";
 const live=(s?.exercises||[]).find(x=>x.id===id)?.name;
 if(live)return live;
 const binEx=(s?.bin&&Array.isArray(s.bin.exercises)?s.bin.exercises:[]).find(x=>x.id===id)?.name;
 if(binEx)return binEx;
 const groups=s?.bin&&Array.isArray(s.bin.muscles)?s.bin.muscles:[];
 for(const g of groups){
  const hit=(g.exercises||[]).find(x=>x.id===id);
  if(hit?.name)return hit.name;
 }
 return "";
}
function workoutExerciseName(raw,s=state){
 return keptExerciseName(raw)||exerciseNameFromState(s,exerciseIdOf(raw))||"Deleted exercise";
}
function withWorkoutExerciseName(raw,s=state){
 const id=exerciseIdOf(raw);
 const name=keptExerciseName(raw)||exerciseNameFromState(s,id)||"";
 if(typeof raw==="string")return {exerciseId:raw,sets:[],name};
 return {...raw,exerciseId:id,name};
}
function catalogExerciseMuscleId(id,s=state){
 if(!id)return "";
 const live=(s?.exercises||[]).find(x=>x.id===id);
 if(live?.muscleId)return live.muscleId;
 const bin=(s?.bin&&Array.isArray(s.bin.exercises)?s.bin.exercises:[]).find(x=>x.id===id);
 if(bin?.muscleId)return bin.muscleId;
 for(const g of s?.bin&&Array.isArray(s.bin.muscles)?s.bin.muscles:[]){
  if((g.exercises||[]).some(x=>x.id===id))return g.id;
 }
 return "";
}
function historicalWorkoutExerciseMuscleId(raw,w,s=state){
 const entry=typeof raw==="string"?{exerciseId:raw}:(raw||{});
 const muscles=Array.isArray(w?.muscles)?w.muscles:[];
 const stored=typeof entry.muscleId==="string"?entry.muscleId:"";
 if(stored&&muscles.includes(stored))return stored;
 const known=catalogExerciseMuscleId(exerciseIdOf(entry),s);
 if(known&&muscles.includes(known))return known;
 if(stored)return stored;
 if(muscles.length===1)return muscles[0];
 const gone=muscles.filter(id=>!(s?.muscles||[]).some(m=>m.id===id));
 if(gone.length)return gone[0];
 return muscles[0]||known||"";
}
function withWorkoutExerciseHistory(raw,w,s=state){
 const named=withWorkoutExerciseName(raw,s);
 const muscleId=historicalWorkoutExerciseMuscleId(named,w,s);
 return muscleId?{...named,muscleId}:named;
}
function nameForWorkoutExercise(raw,previous,s=state){
 const id=exerciseIdOf(raw);
 const live=exerciseNameFromState(s,id);
 if(live)return live;
 const kept=keptExerciseName(raw);
 if(kept)return kept;
 const prev=(previous?.exercises||[]).find(x=>exerciseIdOf(x)===id);
 return keptExerciseName(prev)||"Deleted exercise";
}
