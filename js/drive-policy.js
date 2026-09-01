(function(root){
 function hasCompletedWorkouts(state){
  return !!(state&&Array.isArray(state.workouts)&&state.workouts.length>0);
 }

 function driveSnapshot(state,meta){
  const muscles=Array.isArray(state?.muscles)?state.muscles:[];
  const exercises=Array.isArray(state?.exercises)?state.exercises:[];
  const workouts=Array.isArray(state?.workouts)?state.workouts:[];
  const bin=state?.bin&&typeof state.bin==="object"?{
   workouts:Array.isArray(state.bin.workouts)?state.bin.workouts:[],
   exercises:Array.isArray(state.bin.exercises)?state.bin.exercises:[],
   muscles:Array.isArray(state.bin.muscles)?state.bin.muscles:[]
  }:{workouts:[],exercises:[],muscles:[]};
  return{
   format:"workout-tracker-drive",
   version:meta.version,
   savedAt:meta.savedAt,
   deviceId:meta.deviceId,
   state:JSON.parse(JSON.stringify({muscles,exercises,workouts,bin}))
  };
 }

 function parseDriveBackup(payload){
  if(!payload||typeof payload!=="object")return null;
  if(payload.format!=="workout-tracker-drive")return null;
  const next=payload.state;
  if(!next||!Array.isArray(next.muscles)||!Array.isArray(next.exercises)||!Array.isArray(next.workouts))return null;
  const state=JSON.parse(JSON.stringify(next));
  delete state.activeWorkout;
  if(!state.bin||typeof state.bin!=="object")state.bin={workouts:[],exercises:[],muscles:[]};
  if(!Array.isArray(state.bin.workouts))state.bin.workouts=[];
  if(!Array.isArray(state.bin.exercises))state.bin.exercises=[];
  if(!Array.isArray(state.bin.muscles))state.bin.muscles=[];
  return{
   deviceId:typeof payload.deviceId==="string"?payload.deviceId:"",
   savedAt:typeof payload.savedAt==="string"?payload.savedAt:"",
   state
  };
 }

 function driveContentHash(s){
  try{
   const snap=driveSnapshot(s,{version:"",savedAt:"",deviceId:""});
   const text=JSON.stringify(snap.state);
   let h=2166136261;
   for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
   return (h>>>0).toString(16);
  }catch(err){return ""}
 }

 /* sameWriter: this install last wrote the file, or there is no file yet.
    otherWriter: a different install wrote the file (or the file has no device id). */
 function drivePolicy(input){
  const hasLocalWorkouts=!!input.hasLocalWorkouts;
  const remoteExists=!!input.remoteExists;
  const restoreDeclined=!!input.restoreDeclined;
  const forceOverwrite=!!input.forceOverwrite;
  const flushEmpty=!!input.flushEmpty;
  const flushLibrary=!!input.flushLibrary;
  const adopted=!!input.adopted;
  const contentSame=!!input.contentSame;
  const localDeviceId=input.localDeviceId||"";
  const remoteDeviceId=input.remoteDeviceId||"";
  const sameWriter=!remoteExists||adopted||(!!remoteDeviceId&&remoteDeviceId===localDeviceId);
  const otherWriter=remoteExists&&!adopted&&(!remoteDeviceId||remoteDeviceId!==localDeviceId);

  if(forceOverwrite)return{action:"upload",sameWriter,otherWriter};
  if(contentSame&&remoteExists)return{action:"idle",sameWriter,otherWriter};
  if(flushEmpty){
   if(otherWriter)return{action:"need-confirm",sameWriter,otherWriter};
   return{action:"upload",sameWriter,otherWriter};
  }
  if(flushLibrary){
   if(otherWriter)return{action:"need-confirm",sameWriter,otherWriter};
   if(!hasLocalWorkouts&&remoteExists&&!restoreDeclined&&input.remoteHasWorkouts!==false){
    return{action:"offer-restore",sameWriter,otherWriter};
   }
   if(!hasLocalWorkouts&&remoteExists&&restoreDeclined)return{action:"need-confirm",sameWriter,otherWriter};
   return{action:"upload",sameWriter,otherWriter};
  }

  if(!hasLocalWorkouts&&remoteExists&&!restoreDeclined){
   if(input.remoteHasWorkouts===false)return{action:"idle",sameWriter,otherWriter};
   return{action:"offer-restore",sameWriter,otherWriter};
  }
  if(!hasLocalWorkouts){
   return{action:"idle",sameWriter,otherWriter};
  }
  if(otherWriter)return{action:"need-confirm",sameWriter,otherWriter};
  if(restoreDeclined&&remoteExists)return{action:"need-confirm",sameWriter,otherWriter};
  return{action:"upload",sameWriter,otherWriter};
 }

 const api={hasCompletedWorkouts,driveSnapshot,parseDriveBackup,driveContentHash,drivePolicy};
 if(typeof module==="object"&&module.exports)module.exports=api;
 else Object.assign(root,api);
})(typeof globalThis!=="undefined"?globalThis:this);
