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
   if(!confirm("Restore this backup? Your current workout data will be replaced."))return;
   state=restored;
   save();
   if(parsed?.theme==="light"||parsed?.theme==="dark")theme(parsed.theme);
   selected=new Date();selected.setHours(0,0,0,0);month=new Date(selected.getFullYear(),selected.getMonth(),1);
   closeModal();go("workouts");
   alert("Backup restored successfully.");
  }catch(err){alert("Could not restore this backup. Please choose a valid Workout Tracker JSON backup.")}
 };
 reader.onerror=()=>alert("Could not read the backup file.");
 reader.readAsText(file);
}

function isValidState(s){
 return !!s&&Array.isArray(s.muscles)&&Array.isArray(s.exercises)&&Array.isArray(s.workouts)
   &&s.muscles.every(m=>m&&typeof m.id==="string"&&typeof m.name==="string")
   &&s.exercises.every(e=>e&&typeof e.id==="string"&&typeof e.name==="string"&&typeof e.muscleId==="string")
   &&s.workouts.every(w=>w&&typeof w.id==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(w.date)&&Array.isArray(w.muscles)&&Array.isArray(w.exercises));
}

function clearData(){if(confirm("Delete all workout data, exercises and muscle groups? This cannot be undone.")){localStorage.removeItem("wt_state");location.reload()}}

function about(){modal(`<div class="handle"></div><h2>About Workout Tracker</h2><div class="muted">Workout logging and exercise management.</div><div class="card pad" style="margin-top:20px"><div class="about-row"><span>Version</span><strong>${VERSION}</strong></div><div class="about-row"><span>Build</span><strong>${BUILD}</strong></div><div class="about-row"><span>App</span><strong>Workout Tracker</strong></div><div class="about-row"><span>Support</span><span class="link">support@workouttracker.app</span></div></div><div class="modal-actions"><button class="primary btn-wide" onclick="closeModal()">Done</button></div>`)}
