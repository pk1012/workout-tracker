(function(root){
 function hasCompletedWorkouts(state){
  return !!(state&&Array.isArray(state.workouts)&&state.workouts.length>0);
 }

 function driveSnapshot(state,meta){
  const muscles=Array.isArray(state?.muscles)?state.muscles:[];
  const exercises=Array.isArray(state?.exercises)?state.exercises:[];
  const workouts=Array.isArray(state?.workouts)?state.workouts:[];
  return{
   format:"workout-tracker-drive",
   version:meta.version,
   savedAt:meta.savedAt,
   deviceId:meta.deviceId,
   state:JSON.parse(JSON.stringify({muscles,exercises,workouts}))
  };
 }

 function parseDriveBackup(payload){
  if(!payload||typeof payload!=="object")return null;
  if(payload.format!=="workout-tracker-drive")return null;
  const next=payload.state;
  if(!next||!Array.isArray(next.muscles)||!Array.isArray(next.exercises)||!Array.isArray(next.workouts))return null;
  const state=JSON.parse(JSON.stringify(next));
  delete state.activeWorkout;
  return{
   deviceId:typeof payload.deviceId==="string"?payload.deviceId:"",
   savedAt:typeof payload.savedAt==="string"?payload.savedAt:"",
   state
  };
 }

 /* sameWriter: this install last wrote the file, or there is no file yet.
    otherWriter: a different install wrote the file (or the file has no device id). */
 function drivePolicy(input){
  const hasLocalWorkouts=!!input.hasLocalWorkouts;
  const remoteExists=!!input.remoteExists;
  const restoreDeclined=!!input.restoreDeclined;
  const forceOverwrite=!!input.forceOverwrite;
  const adopted=!!input.adopted;
  const localDeviceId=input.localDeviceId||"";
  const remoteDeviceId=input.remoteDeviceId||"";
  const sameWriter=!remoteExists||adopted||(!!remoteDeviceId&&remoteDeviceId===localDeviceId);
  const otherWriter=remoteExists&&!adopted&&(!remoteDeviceId||remoteDeviceId!==localDeviceId);

  if(forceOverwrite)return{action:"upload",sameWriter,otherWriter};

  if(!hasLocalWorkouts&&remoteExists&&!restoreDeclined){
   return{action:"offer-restore",sameWriter,otherWriter};
  }
  if(!hasLocalWorkouts){
   return{action:"idle",sameWriter,otherWriter};
  }
  if(otherWriter)return{action:"need-confirm",sameWriter,otherWriter};
  return{action:"upload",sameWriter,otherWriter};
 }

 const api={hasCompletedWorkouts,driveSnapshot,parseDriveBackup,drivePolicy};
 if(typeof module==="object"&&module.exports)module.exports=api;
 else Object.assign(root,api);
})(typeof globalThis!=="undefined"?globalThis:this);
