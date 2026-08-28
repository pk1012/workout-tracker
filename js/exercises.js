function sortedMuscles(){
 return [...state.muscles].sort((a,b)=>a.name.localeCompare(b.name));
}
function sortedExercisesForMuscle(muscleId){
 return state.exercises.filter(e=>e.muscleId===muscleId).sort((a,b)=>a.name.localeCompare(b.name));
}

/* --------------------------------------------------------------------------
 * Exercises screen
 * --------------------------------------------------------------------------
 * The management/library functions below are intentionally unchanged in
 * behaviour. The public Exercises screen is rendered separately so its UI
 * can evolve without changing the Exercise Library in Settings.
 */
let exerciseScreenState={search:"",filter:"All",historyFilter:"all"};

function exerciseMuscleName(exercise){
 return state.muscles.find(m=>m.id===exercise.muscleId)?.name||"";
}

function exerciseCategoryMatches(exercise,filter){
 if(filter==="All")return true;
 const group=exerciseMuscleName(exercise).toLowerCase();
 if(filter==="Arms")return group==="biceps"||group==="triceps"||group==="forearms";
 if(filter==="Core")return group==="abs"||group==="core";
 return group===filter.toLowerCase();
}

function exerciseHistory(exerciseId){
 let latest=null;
 for(const workout of state.workouts||[]){
  for(const raw of workout.exercises||[]){
   const entry=normalizedEntry(raw,workout.unit||"kg");
   if(entry.exerciseId!==exerciseId)continue;
   const sets=Array.isArray(entry.sets)?entry.sets:[];
   const validSets=sets.filter(s=>Number.isFinite(Number(s?.weight))&&Number.isFinite(Number(s?.reps)));
   if(!validSets.length)continue;
   const candidate={
    date:workout.date||"",
    createdAt:Number(workout.createdAt)||0,
    unit:entry.unit||workout.unit||"kg",
    set:validSets[validSets.length-1]
   };
   if(!latest || candidate.date>latest.date || (candidate.date===latest.date&&candidate.createdAt>latest.createdAt)){
    latest=candidate;
   }
  }
 }
 return latest;
}

function exerciseDisplayWeight(history){
 if(!history)return "No history";
 const weight=Number(history.set.weight);
 if(weight===0)return "Bodyweight";
 const unit=history.unit||"kg";
 const text=Number.isInteger(weight)?String(weight):String(Math.round(weight*10)/10);
 return `${text} ${unit}`;
}

function exerciseDisplayDate(history){
 if(!history?.date)return "";
 return new Date(`${history.date}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}

function exerciseScreenItems(){
 const search=exerciseScreenState.search.trim().toLowerCase();
 return state.exercises
  .filter(e=>exerciseCategoryMatches(e,exerciseScreenState.filter))
  .filter(e=>!search||e.name.toLowerCase().includes(search)||exerciseMuscleName(e).toLowerCase().includes(search))
  .filter(e=>{
   const history=exerciseHistory(e.id);
   if(exerciseScreenState.historyFilter==="logged")return !!history;
   if(exerciseScreenState.historyFilter==="never")return !history;
   return true;
  })
  .map(e=>({exercise:e,history:exerciseHistory(e.id)}))
  .sort((a,b)=>{
   const ad=a.history?.date||"";
   const bd=b.history?.date||"";
   if(ad!==bd)return bd.localeCompare(ad);
   const ac=a.history?.createdAt||0;
   const bc=b.history?.createdAt||0;
   if(ac!==bc)return bc-ac;
   return a.exercise.name.localeCompare(b.exercise.name);
  });
}

function exerciseCategoryButtons(){
 const names=["All","Chest","Back","Legs","Shoulders","Arms","Core","Calves","Cardio"];
 return names.map(name=>`<button type="button" class="exercise-chip ${exerciseScreenState.filter===name?"active":""}" onclick="setExerciseFilter('${name}')">${name}</button>`).join("");
}

function exerciseHistoryLine(history){
 if(!history)return "No history yet";
 const date=exerciseDisplayDate(history);
 return date?`${exerciseDisplayWeight(history)} • ${date}`:exerciseDisplayWeight(history);
}

function renderExerciseScreenRows(items){
 if(!items.length){
  return `<div class="exercise-screen-empty"><svg class="icon" aria-hidden="true"><use href="#dumbbell"/></svg><strong>No exercises found</strong><span>Try another search or filter.</span></div>`;
 }
 return `<div class="exercise-screen-list">${items.map(({exercise,history})=>`
  <button type="button" class="exercise-screen-row" onclick="openExerciseHistory('${esc(exercise.id)}')">
   <span class="exercise-screen-avatar" aria-hidden="true"><svg class="icon"><use href="#dumbbell"/></svg></span>
   <span class="exercise-screen-copy">
    <strong>${esc(exercise.name)}</strong>
    <span>${esc(exerciseMuscleName(exercise)||"Unassigned")}</span>
    <span>${esc(exerciseHistoryLine(history))}</span>
   </span>
   <span class="exercise-screen-arrow" aria-hidden="true"><svg class="icon"><use href="#chevron-right"/></svg></span>
  </button>
 `).join("")}</div>`;
}

function renderExercises(){
 const target=document.getElementById("exerciseList");
 if(!target)return;
 const items=exerciseScreenItems();
 target.innerHTML=`
  <div class="exercise-screen-toolbar">
   <label class="exercise-search">
    <svg class="icon" aria-hidden="true"><use href="#search"/></svg>
    <input id="exerciseSearch" type="search" value="${esc(exerciseScreenState.search)}" placeholder="Search exercises" autocomplete="off" oninput="setExerciseSearch(this.value)">
   </label>
   <button type="button" class="exercise-filter-button" onclick="openExerciseFilter()">
    <svg class="icon" aria-hidden="true"><use href="#filter"/></svg><span>Filter</span>
   </button>
  </div>
  <div class="exercise-chip-scroller" role="tablist" aria-label="Exercise muscle groups">${exerciseCategoryButtons()}</div>
  ${renderExerciseScreenRows(items)}
 `;
}

function setExerciseSearch(value){
 exerciseScreenState.search=value;
 const target=document.getElementById("exerciseList");
 if(target)renderExercises();
 const input=document.getElementById("exerciseSearch");
 if(input){input.focus();input.setSelectionRange(value.length,value.length)}
}

function setExerciseFilter(filter){
 exerciseScreenState.filter=filter;
 renderExercises();
}

function openExerciseFilter(){
 modal(`
  <div class="exercise-filter-sheet">
   <div class="handle"></div>
   <h2>Filter Exercises</h2>
   <p class="muted">Choose which exercise history to show.</p>
   <div class="exercise-filter-options">
    <button class="${exerciseScreenState.historyFilter==="all"?"selected":""}" onclick="setExerciseHistoryFilter('all')"><span>All exercises</span><svg class="icon"><use href="#check"/></svg></button>
    <button class="${exerciseScreenState.historyFilter==="logged"?"selected":""}" onclick="setExerciseHistoryFilter('logged')"><span>Logged exercises</span><svg class="icon"><use href="#check"/></svg></button>
    <button class="${exerciseScreenState.historyFilter==="never"?"selected":""}" onclick="setExerciseHistoryFilter('never')"><span>Never logged</span><svg class="icon"><use href="#check"/></svg></button>
   </div>
   <button class="primary btn-wide" onclick="closeModal();renderExercises()">Done</button>
  </div>
 `);
}

function setExerciseHistoryFilter(filter){
 exerciseScreenState.historyFilter=filter;
 closeModal();
 renderExercises();
}

function openExerciseHistory(id){
 const exercise=state.exercises.find(e=>e.id===id);
 if(!exercise)return;
 const history=[];
 for(const workout of state.workouts||[]){
  for(const raw of workout.exercises||[]){
   const entry=normalizedEntry(raw,workout.unit||"kg");
   if(entry.exerciseId!==id)continue;
   history.push({workout,entry});
  }
 }
 history.sort((a,b)=>{
  const d=(b.workout.date||"").localeCompare(a.workout.date||"");
  return d||(Number(b.workout.createdAt)||0)-(Number(a.workout.createdAt)||0);
 });
 const latest=history[0]?.entry;
 const unit=latest?.unit||history[0]?.workout?.unit||"kg";
 const body=history.length?history.slice(0,8).map(({workout,entry})=>`
   <div class="exercise-history-entry">
    <strong>${esc(new Date(`${workout.date}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}))}</strong>
    <span>${(entry.sets||[]).map(s=>esc(`${s.weight===0?"Bodyweight":`${s.weight} ${entry.unit||unit}`} × ${s.reps}`)).join("  •  ")||"No sets recorded"}</span>
   </div>`).join(""):`<div class="exercise-screen-empty compact"><svg class="icon"><use href="#chart"/></svg><strong>No history yet</strong><span>Complete this exercise in a workout to see its history.</span></div>`;
 modal(`
  <div class="exercise-history-sheet">
   <div class="handle"></div>
   <h2>${esc(exercise.name)}</h2>
   <p class="muted">${esc(exerciseMuscleName(exercise))} · Exercise history</p>
   <div class="exercise-history-list">${body}</div>
   <button class="outline btn-wide" onclick="closeModal()">Close</button>
  </div>
 `);
}

/* Exercise Library / Settings management */
function renderLibrary(){
 const target=document.getElementById("library");
 if(!target)return;
 target.innerHTML=sortedMuscles().map(m=>{
  const ex=sortedExercisesForMuscle(m.id);
  return `<div class="section card pad library-group"><div class="row"><div class="section-title">${esc(m.name)}</div><div class="actions"><button class="edit" onclick="openExercise('', '${m.id}')"><svg class="icon"><use href="#plus"/></svg> Add</button><button class="edit" onclick="openMuscle('${m.id}')">Edit</button><button class="delete" onclick="deleteMuscle('${m.id}')">Delete</button></div></div>${ex.length?ex.map(e=>`<div class="exercise-row"><span>${esc(e.name)}</span><span class="actions"><span class="action-spacer" aria-hidden="true"></span><button class="edit" onclick="openExercise('${e.id}')">Edit</button><button class="delete" onclick="deleteExercise('${e.id}')">Delete</button></span></div>`).join(""):`<div class="empty">No exercises in this group.</div>`}</div>`;
 }).join("");
}

function openExercise(id="",muscleId=""){
 let e=id?state.exercises.find(x=>x.id===id):null,ms=sortedMuscles();
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">${e?"Edit Exercise":"Add Exercise"}</h2>
  </div>
  <div class="workout-entry-scroll">
   <div class="field"><label>Exercise name</label><input id="exerciseName" class="input" value="${e?esc(e.name):""}" placeholder="Exercise name"></div>
   <div class="field"><label>Muscle group</label><select id="exerciseMuscle" class="input">${ms.map(m=>`<option value="${m.id}" ${((e&&e.muscleId)||muscleId)===m.id?"selected":""}>${esc(m.name)}</option>`).join("")}</select></div>
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="saveExercise('${id}')">Save Exercise</button>
   <button class="outline btn-wide workout-cancel-button" onclick="closeModal()">Cancel</button>
  </div>
 `,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
}
function saveExercise(id){
 let name=document.getElementById("exerciseName")?.value.trim(),mid=document.getElementById("exerciseMuscle")?.value;
 if(!name){notify("Enter an exercise name.");return}
 if(!mid||!state.muscles.some(m=>m.id===mid)){notify("Choose a valid muscle group.");return}
 if(state.exercises.some(e=>e.name.toLowerCase()===name.toLowerCase()&&e.muscleId===mid&&e.id!==id)){notify("That exercise already exists in this muscle group.");return}
 if(id){let e=state.exercises.find(x=>x.id===id);if(!e){notify("Exercise not found.");return}e.name=name;e.muscleId=mid}else state.exercises.push({id:newId(),name,muscleId:mid});
 save();closeModal();
 if(document.getElementById("library-management")?.classList.contains("active"))renderLibrary();
 if(document.getElementById("exercises")?.classList.contains("active"))renderExercises();
}
function deleteExercise(id){
 let e=state.exercises.find(x=>x.id===id);if(!e)return;
 confirmAction(`Delete “${e.name}”? Existing workout history will remain.`,()=>{state.exercises=state.exercises.filter(x=>x.id!==id);save();renderLibrary();renderExercises();},true)
}
function openMuscle(id=""){
 let m=id?state.muscles.find(x=>x.id===id):null;
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">${m?"Edit Muscle Group":"Add Muscle Group"}</h2>
  </div>
  <div class="workout-entry-scroll">
   <div class="field"><label>Name</label><input id="muscleName" class="input" value="${m?esc(m.name):""}" placeholder="e.g. Forearms"></div>
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="saveMuscle('${id}')">Save Muscle Group</button>
   <button class="outline btn-wide workout-cancel-button" onclick="closeModal()">Cancel</button>
  </div>
 `,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
}
function saveMuscle(id){
 let name=document.getElementById("muscleName")?.value.trim();
 if(!name){notify("Enter a name.");return}
 if(state.muscles.some(m=>m.name.toLowerCase()===name.toLowerCase()&&m.id!==id)){notify("That muscle group already exists.");return}
 if(id){let m=state.muscles.find(x=>x.id===id);if(!m){notify("Muscle group not found.");return}m.name=name}else state.muscles.push({id:newId(),name});
 save();closeModal();renderLibrary();renderExercises();
}
function deleteMuscle(id){
 let m=state.muscles.find(x=>x.id===id),n=state.exercises.filter(e=>e.muscleId===id).length;if(!m)return;
 confirmAction(`Delete “${m.name}”? ${n?`Its ${n} exercise(s) will also be removed from the library.`:""}`,()=>{state.muscles=state.muscles.filter(x=>x.id!==id);state.exercises=state.exercises.filter(e=>e.muscleId!==id);save();renderLibrary();renderExercises();},true)
}
