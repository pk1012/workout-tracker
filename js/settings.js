function theme(t){document.documentElement.dataset.theme=t;localStorage.setItem("wt_theme",t);document.getElementById("lightBtn")?.classList.toggle("active",t==="light");document.getElementById("darkBtn")?.classList.toggle("active",t==="dark")}

function backup(){
 const payload={format:"workout-tracker-backup",version:VERSION,exportedAt:new Date().toISOString(),theme:localStorage.getItem("wt_theme")||"light",state};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=`workout-tracker-backup-${dateKey(new Date())}.json`;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function restoreBackup(){
 modal(`<div class="handle"></div><h2>Backup & Restore</h2><div class="muted">Export a backup or restore one from a JSON file. Restoring replaces the current workout data.</div><div class="modal-actions"><button class="primary btn-wide" onclick="backup()">Export Backup</button><button class="outline btn-wide" onclick="document.getElementById('restoreFile').click()">Choose Backup File</button><input id="restoreFile" type="file" accept=".json,application/json" style="display:none" onchange="restoreFromFile(this.files[0])"></div>`)
}

function restoreFromFile(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const parsed=JSON.parse(reader.result);
   const restored=parsed?.format==="workout-tracker-backup"?parsed.state:parsed;
   if(!isValidState(restored))throw new Error("Invalid backup format.");
   confirmAction("Restore this backup? Your current workout data will be replaced.",()=>applyRestore(restored,parsed));
   return;
  }catch(err){notify("Could not restore this backup. Please choose a valid Workout Tracker JSON backup.","error")}
 };
 reader.onerror=()=>notify("Could not read the backup file.","error");
 reader.readAsText(file);
}

function isValidState(s){
 if(!s||!Array.isArray(s.muscles)||!Array.isArray(s.exercises)||!Array.isArray(s.workouts))return false;
 if(!s.muscles.every(m=>m&&typeof m.id==="string"&&typeof m.name==="string"&&m.name.trim()))return false;
 const muscleIds=new Set(s.muscles.map(m=>m.id));
 if(muscleIds.size!==s.muscles.length)return false;
 if(!s.exercises.every(e=>e&&typeof e.id==="string"&&typeof e.name==="string"&&e.name.trim()&&typeof e.muscleId==="string"&&muscleIds.has(e.muscleId)))return false;
 const exerciseIds=new Set(s.exercises.map(e=>e.id));
 if(exerciseIds.size!==s.exercises.length)return false;
 return s.workouts.every(w=>{
  if(!w||typeof w.id!=="string"||!isValidDateString(w.date)||!Array.isArray(w.muscles)||!Array.isArray(w.exercises))return false;
  if(!w.muscles.every(id=>typeof id==="string"&&muscleIds.has(id)))return false;
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

function applyRestore(restored,parsed){state=restored;save();if(parsed?.theme==="light"||parsed?.theme==="dark")theme(parsed.theme);selected=new Date();selected.setHours(0,0,0,0);month=new Date(selected.getFullYear(),selected.getMonth(),1);closeModal();go("workouts");notify("Backup restored successfully.","success")}
function clearData(){confirmAction("Delete all workout data, exercises and muscle groups? This cannot be undone.",()=>{localStorage.removeItem("wt_state");location.reload()})}

function about(){
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">About Workout Tracker</h2>
   <div class="muted workout-form-description">Workout logging and exercise management.</div>
  </div>
  <div class="workout-entry-scroll">
   <div class="card pad about-card"><div class="about-row"><span>Version</span><strong>${VERSION}</strong></div><div class="about-row"><span>Build</span><strong>${BUILD}</strong></div><div class="about-row"><span>App</span><strong>Workout Tracker</strong></div><div class="about-row"><span>Support</span><span class="link">support@workouttracker.app</span></div></div>
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="closeModal()">Done</button>
  </div>
 `,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
}
