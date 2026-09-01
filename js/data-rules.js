(function(root){
 function isValidDateString(value){
  if(typeof value!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))return false;
  const [y,m,d]=value.split("-").map(Number);
  const dt=new Date(y,m-1,d);
  return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;
 }
 function exerciseIdOf(raw){return typeof raw==="string"?raw:(raw&&raw.exerciseId)||""}
 function uniqueRestoredName(base,existing){
  const name=(base||"").trim()||"Restored";
  const used=new Set((existing||[]).map(x=>String(x||"").trim().toLowerCase()).filter(Boolean));
  const first=`${name} (Restored)`;
  if(!used.has(first.toLowerCase()))return first;
  let n=2;
  while(used.has(`${name} (Restored ${n})`.toLowerCase()))n++;
  return `${name} (Restored ${n})`;
 }
 function catalogExerciseMuscleId(id,s){
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
 function historicalWorkoutExerciseMuscleId(raw,w,s){
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
 function findWorkoutOnDate(workouts,date,exceptId){
  return (workouts||[]).find(w=>w.date===date&&w.id!==exceptId)||null;
 }
 function stampWorkoutExerciseMuscleIds(w,s){
  const exercises=(w?.exercises||[]).map(raw=>{
   const muscleId=historicalWorkoutExerciseMuscleId(raw,w,s);
   if(typeof raw==="string")return {exerciseId:raw,muscleId};
   return muscleId?{...raw,muscleId}:raw;
  });
  return {...w,exercises};
 }
 function looksLikeState(s){
  return !!(s&&Array.isArray(s.muscles)&&Array.isArray(s.exercises)&&Array.isArray(s.workouts));
 }
 function isValidState(s){
  if(!looksLikeState(s))return false;
  if(!s.muscles.every(m=>m&&typeof m.id==="string"&&typeof m.name==="string"&&m.name.trim()))return false;
  const muscleIds=new Set(s.muscles.map(m=>m.id));
  if(muscleIds.size!==s.muscles.length)return false;
  if(!s.exercises.every(e=>e&&typeof e.id==="string"&&typeof e.name==="string"&&e.name.trim()&&typeof e.muscleId==="string"&&muscleIds.has(e.muscleId)))return false;
  const exerciseIds=new Set(s.exercises.map(e=>e.id));
  if(exerciseIds.size!==s.exercises.length)return false;
  if(!s.workouts.every(w=>w&&typeof w.id==="string"))return false;
  const workoutIds=new Set(s.workouts.map(w=>w.id));
  if(workoutIds.size!==s.workouts.length)return false;
  const workoutDates=new Set(s.workouts.map(w=>w.date));
  if(workoutDates.size!==s.workouts.length)return false;
  return s.workouts.every(w=>{
   if(!w||typeof w.id!=="string"||!isValidDateString(w.date)||!Array.isArray(w.muscles)||!Array.isArray(w.exercises))return false;
   if(!w.muscles.every(id=>typeof id==="string"&&id))return false;
   const workoutUnit=w.unit==="lb"?"lb":"kg";
   return w.exercises.every(raw=>{
    const e=typeof raw==="string"?{exerciseId:raw,sets:[],unit:workoutUnit}:raw;
    if(!e||typeof e.exerciseId!=="string"||!Array.isArray(e.sets))return false;
    const unit=e.unit||workoutUnit;
    if(unit!=="kg"&&unit!=="lb")return false;
    return e.sets.every(set=>{
     if(!set||set.weight===""||set.reps==="")return false;
     const weight=Number(set.weight),reps=Number(set.reps);
     return Number.isFinite(weight)&&weight>=0&&Number.isInteger(reps)&&reps>=1;
    });
   });
  });
 }
 const api={isValidDateString,uniqueRestoredName,catalogExerciseMuscleId,historicalWorkoutExerciseMuscleId,findWorkoutOnDate,stampWorkoutExerciseMuscleIds,looksLikeState,isValidState};
 if(typeof module==="object"&&module.exports)module.exports=api;
 else Object.assign(root,api);
})(typeof globalThis!=="undefined"?globalThis:this);
