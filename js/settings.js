function theme(t){
 if(t!=="dark"&&t!=="light")t="light";
 const root=document.documentElement;
 root.dataset.theme=t;
 root.style.colorScheme=t;
 localStorage.setItem("wt_theme",t);
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.content=t==="dark"?"#111216":"#5b43f3";
 document.getElementById("lightBtn")?.classList.toggle("active",t==="light");
 document.getElementById("darkBtn")?.classList.toggle("active",t==="dark");
}

function applyUnitButtons(){
 const u=preferredUnit();
 document.getElementById("kgBtn")?.classList.toggle("active",u==="kg");
 document.getElementById("lbBtn")?.classList.toggle("active",u==="lb");
}

function setPreferredUnit(u){
 if(u!=="kg"&&u!=="lb")u="kg";
 const same=preferredUnit()===u;
 localStorage.setItem(UNIT_KEY,u);
 applyUnitButtons();
 if(!same&&typeof refreshAppViews==="function")refreshAppViews();
}

function backup(){
 const payload={format:"workout-tracker-backup",version:VERSION,exportedAt:new Date().toISOString(),theme:localStorage.getItem("wt_theme")||"light",unit:preferredUnit(),state};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=`workout-tracker-backup-${dateKey(new Date())}.json`;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function restoreBackup(){
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">Backup & Restore</h2>
   <div class="muted workout-form-description">Export a backup or restore one from a JSON file. Restoring replaces the current workout data.</div>
  </div>
  <div class="workout-entry-scroll"></div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="backup()">Export Backup</button>
   <button class="outline btn-wide workout-cancel-button" onclick="document.getElementById('restoreFile').click()">Choose Backup File</button>
   <input id="restoreFile" type="file" accept=".json,application/json" style="display:none" onchange="restoreFromFile(this.files[0])">
  </div>
 `,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
}

function restoreFromFile(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const parsed=JSON.parse(reader.result);
   const restored=parsed?.format==="workout-tracker-backup"?parsed.state:parsed;
   if(!isValidState(restored))throw new Error("Invalid backup format.");
   confirmAction("Restore this backup? Your current workout data will be replaced.",()=>applyRestore(restored,parsed),true);
   return;
  }catch(err){notify("Could not restore this backup. Please choose a valid Workout Tracker JSON backup.","error")}
 };
 reader.onerror=()=>notify("Could not read the backup file.","error");
 reader.readAsText(file);
}

function applyRestore(restored,parsed){state=migrateState(JSON.parse(JSON.stringify(restored)));save();if(parsed?.theme==="light"||parsed?.theme==="dark")theme(parsed.theme);if(parsed?.unit==="kg"||parsed?.unit==="lb")setPreferredUnit(parsed.unit);selected=new Date();selected.setHours(0,0,0,0);if(typeof monthStart==="function")selectedMonth=monthStart(selected);closeModal();go("workouts");notify("Backup restored successfully.","success");if(typeof driveAfterFileRestore==="function")driveAfterFileRestore()}
function clearData(){confirmAction("Delete all data on this phone? Google Drive will not be changed.",()=>{wipeStoredData().then(()=>{resetDriveAfterPhoneWipe();location.reload()})},true)}

function about(){
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">About Workout Tracker</h2>
   <div class="muted workout-form-description">Workout logging and exercise management.</div>
  </div>
  <div class="workout-entry-scroll">
   <div class="workout-detail card">
    <div class="detail-set"><span>Version</span><strong>${VERSION}</strong></div>
    <div class="detail-set"><span>Build</span><strong>${BUILD}</strong></div>
    <div class="detail-set"><span>App</span><strong>Workout Tracker</strong></div>
    <div class="detail-set"><span>Support</span><a class="about-link" href="mailto:support@workouttracker.app">support@workouttracker.app</a></div>
   </div>
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="closeModal()">Done</button>
  </div>
 `,"workout-entry-sheet about-sheet");
 document.body.classList.add("workout-form-open");
}
