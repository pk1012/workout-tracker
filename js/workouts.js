let workoutDraft={date:"",muscles:[],exercises:[],unit:"kg"};

function renderCalendar(){
 const y=month.getFullYear(),m=month.getMonth(),first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),start=first.getDay();
 let h=`<div class="calendar-head"><button class="month-btn" onclick="monthMove(-1)">‹</button><div class="calendar-title">${month.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</div><button class="month-btn" onclick="monthMove(1)">›</button></div><div class="week">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<div>${x}</div>`).join("")}</div><div class="days">`;
 for(let i=0;i<start;i++)h+="<div></div>";
 for(let d=1;d<=days;d++){let dt=new Date(y,m,d),k=dateKey(dt),sel=k===dateKey(selected),has=state.workouts.some(w=>w.date===k);h+=`<button class="day ${sel?"selected":""} ${has?"has-workout":""}" onclick="selectDay(${y},${m},${d})">${d}</button>`}
 document.getElementById("calendar").innerHTML=h+"</div>";
 let ws=state.workouts.filter(w=>w.date===dateKey(selected));
 document.getElementById("summary").innerHTML=ws.length?ws.map(w=>`<div class="summary card"><div class="row"><div><strong>${selected.toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</strong><div class="muted" style="margin-top:5px">${w.muscles.map(muscle).join(" · ")} · ${w.exercises.length} exercises</div></div><button class="primary" style="padding:12px 16px" onclick="viewWorkout('${w.id}')">View</button></div></div>`).join(""):`<div class="summary card"><div class="row"><div><strong>${selected.toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</strong><div class="muted" style="margin-top:5px">No workout logged</div></div><button class="primary" style="padding:12px 16px" onclick="openWorkout()">Log</button></div></div>`;
}
function monthMove(n){month=new Date(month.getFullYear(),month.getMonth()+n,1);renderCalendar()}
function selectDay(y,m,d){selected=new Date(y,m,d);selected.setHours(0,0,0,0);month=new Date(y,m,1);renderCalendar()}

function openWorkout(muscleIds=[],dateValue=dateKey(selected)){
 let ms=sortedMuscles(),chosen=new Set(muscleIds),draftExercises=(muscleIds.length?((workoutDraft.exercises||[])):[]);
 if(!muscleIds.length)workoutDraft={date:dateValue,muscles:[],exercises:[],unit:"kg"};
 modal(`<div class="handle"></div><h2>Log Workout</h2><div class="muted">Choose the workout date and muscle groups.</div><div class="field"><label>Date</label><input id="workDate" class="input" type="date" value="${esc(dateValue)}"></div><div class="grid">${ms.map(m=>`<button class="pick ${chosen.has(m.id)?"selected":""}" data-muscle="${m.id}" onclick="this.classList.toggle('selected')">${esc(m.name)}</button>`).join("")}</div><div class="modal-actions"><button class="primary btn-wide" onclick="chooseExercises()">Next: Select Exercises</button><button class="outline btn-wide" onclick="closeModal()">Cancel</button></div>`)
}

function chooseExercises(){
 let ids=[...document.querySelectorAll("[data-muscle].selected")].map(x=>x.dataset.muscle),date=document.getElementById("workDate")?.value;
 if(!ids.length){alert("Select at least one muscle group.");return}
 if(!isValidDateString(date)){alert("Choose a valid workout date.");return}
 const validMuscles=ids.filter(id=>state.muscles.some(m=>m.id===id));
 const previousExercises=workoutDraft.exercises||[];
 workoutDraft={date,muscles:validMuscles,exercises:previousExercises.filter(e=>validMuscles.some(mid=>state.exercises.some(x=>x.id===e.exerciseId&&x.muscleId===mid))),unit:workoutDraft.unit||"kg"};
 if(!workoutDraft.muscles.length){alert("The selected muscle groups are no longer available.");return}
 renderExerciseSelection();
}

function renderExerciseSelection(){
 modal(`<div class="handle"></div><h2>Select Exercises</h2><div class="muted">Exercises are sorted alphabetically. Select the exercises you performed.</div>${workoutDraft.muscles.map(id=>{let ex=sortedExercisesForMuscle(id);return `<div class="field"><div class="section-title">${esc(muscle(id))}</div>${ex.length?ex.map(e=>`<button class="exercise-row exercise-pick pick ${workoutDraft.exercises.some(x=>x.exerciseId===e.id)?"selected":""}" data-exercise="${e.id}" onclick="this.classList.toggle('selected')"><span>${esc(e.name)}</span><span class="pick-plus" aria-hidden="true">+</span></button>`).join(""):`<div class="empty">No exercises in this group.</div>`}</div>`}).join("")}<div class="modal-actions"><button class="primary btn-wide" onclick="continueToSetDetails()">Next: Enter Weight & Reps</button><button class="outline btn-wide" onclick="openWorkout(workoutDraft.muscles,workoutDraft.date)">Back</button></div>`)
}

function continueToSetDetails(){
 const ids=[...document.querySelectorAll("[data-exercise].selected")].map(x=>x.dataset.exercise).filter(id=>state.exercises.some(e=>e.id===id));
 if(!ids.length){alert("Select at least one exercise.");return}
 const previous=new Map(workoutDraft.exercises.map(e=>[e.exerciseId,e]));
 workoutDraft.exercises=ids.map(id=>previous.get(id)||{exerciseId:id,sets:[{weight:"",reps:""}]});
 renderSetDetails();
}

function renderSetDetails(){
 const selectedNames=workoutDraft.exercises.map(e=>state.exercises.find(x=>x.id===e.exerciseId)?.name||"Deleted exercise");
 modal(`<div class="handle"></div><h2>Enter Workout Details</h2><div class="muted">Add the weight and reps for each set. Use 0 kg for bodyweight exercises.</div><div class="field unit-field"><label>Weight unit</label><div class="segment"><button class="unit-btn ${workoutDraft.unit==='kg'?'active':''}" onclick="setWorkoutUnit('kg')">kg</button><button class="unit-btn ${workoutDraft.unit==='lb'?'active':''}" onclick="setWorkoutUnit('lb')">lb</button></div></div>${workoutDraft.exercises.map((entry,i)=>{const name=selectedNames[i];return `<div class="set-editor card pad"><div class="set-editor-head"><strong>${esc(name)}</strong></div><div id="sets-${i}">${entry.sets.map((set,j)=>setRow(i,j,set)).join("")}</div><button class="add-set" onclick="addSet(${i})">+ Add Set</button></div>`}).join("")}<div class="modal-actions"><button class="primary btn-wide" onclick="saveWorkout()">Save Workout</button><button class="outline btn-wide" onclick="renderExerciseSelection()">Back</button></div>`)
}

function setRow(exIndex,setIndex,set){
 const remove=workoutDraft.exercises[exIndex].sets.length>1?`<button class="remove-set" aria-label="Remove set" onclick="removeSet(${exIndex},${setIndex})">×</button>`:`<span class="remove-placeholder"></span>`;
 return `<div class="set-row"><span class="set-number">${setIndex+1}</span><label class="set-field"><span>Weight</span><input class="input compact" type="number" min="0" step="0.1" inputmode="decimal" value="${esc(set.weight??"")}" oninput="updateSet(${exIndex},${setIndex},'weight',this.value)" placeholder="0"></label><label class="set-field"><span>Reps</span><input class="input compact" type="number" min="1" step="1" inputmode="numeric" value="${esc(set.reps??"")}" oninput="updateSet(${exIndex},${setIndex},'reps',this.value)" placeholder="0"></label>${remove}</div>`;
}
function updateSet(exIndex,setIndex,key,value){if(workoutDraft.exercises[exIndex]?.sets[setIndex])workoutDraft.exercises[exIndex].sets[setIndex][key]=value}
function addSet(exIndex){workoutDraft.exercises[exIndex].sets.push({weight:"",reps:""});renderSetDetails()}
function removeSet(exIndex,setIndex){if(workoutDraft.exercises[exIndex].sets.length<=1)return;workoutDraft.exercises[exIndex].sets.splice(setIndex,1);renderSetDetails()}
function setWorkoutUnit(unit){
 if(unit!=="kg"&&unit!=="lb")return;
 const from=workoutDraft.unit||"kg";
 if(from!==unit){
  const factor=from==="kg"?2.2046226218:0.45359237;
  workoutDraft.exercises.forEach(entry=>entry.sets.forEach(set=>{
   if(set.weight!==""&&Number.isFinite(Number(set.weight))){
    const converted=Number(set.weight)*factor;
    set.weight=String(Math.round(converted*100)/100);
   }
  }));
 }
 workoutDraft.unit=unit;
 renderSetDetails();
}

function saveWorkout(){
 const date=workoutDraft.date;
 const muscles=[...new Set(workoutDraft.muscles)].filter(id=>state.muscles.some(m=>m.id===id));
 const exercises=workoutDraft.exercises.filter(e=>state.exercises.some(x=>x.id===e.exerciseId));
 if(!muscles.length){alert("Please select at least one valid muscle group.");return}
 if(!isValidDateString(date)){alert("Please choose a valid workout date.");return}
 if(!exercises.length){alert("Select at least one exercise.");return}
 for(const entry of exercises){
   if(!entry.sets?.length){alert("Each exercise needs at least one set.");return}
   for(const set of entry.sets){
     const weight=Number(set.weight),reps=Number(set.reps);
     if(set.weight===""||!Number.isFinite(weight)||weight<0){alert("Enter a valid weight for every set.");return}
     if(set.reps===""||!Number.isInteger(reps)||reps<1){alert("Enter a valid whole-number rep count for every set.");return}
   }
 }
 const exIds=exercises.map(e=>e.exerciseId);
 const signature=workoutSignature({date,muscles,exercises,unit:workoutDraft.unit});
 const duplicate=state.workouts.some(w=>workoutSignature(w)===signature);
 if(duplicate&&!confirm("An identical workout is already logged for this date. Save another copy anyway?"))return;
 state.workouts.push({id:newId(),date,muscles,exercises:exercises.map(e=>({exerciseId:e.exerciseId,sets:e.sets.map(s=>({weight:Number(s.weight),reps:Number(s.reps)})),unit:workoutDraft.unit})),createdAt:Date.now()});
 save();
 selected=new Date(`${date}T00:00:00`);selected.setHours(0,0,0,0);month=new Date(selected.getFullYear(),selected.getMonth(),1);
 workoutDraft={date:"",muscles:[],exercises:[],unit:"kg"};closeModal();go("workouts");
}

function workoutSignature(w){
 const muscles=[...(w.muscles||[])].sort();
 const unit=w.unit||"kg";
 const exercises=(w.exercises||[]).map(entry=>{const e=normalizedEntry(entry,unit);return {exerciseId:e.exerciseId,unit:e.unit||unit,sets:(e.sets||[]).map(set=>({weight:Number(set.weight)||0,reps:Number(set.reps)||0}))};}).sort((a,b)=>a.exerciseId.localeCompare(b.exerciseId));
 return JSON.stringify({date:w.date,muscles,exercises});
}
function exerciseIdFromEntry(entry){return typeof entry==="string"?entry:entry?.exerciseId||""}
function normalizedEntry(entry,fallbackUnit="kg"){if(typeof entry==="string")return {exerciseId:entry,sets:[],unit:fallbackUnit}; const e=entry||{exerciseId:"",sets:[]}; return {...e,unit:e.unit||fallbackUnit};}
function formatSet(set,unit){if(!set||set.weight===""||set.reps==="")return "Details not recorded";return `${Number(set.weight)} ${unit||"kg"} × ${Number(set.reps)} reps`}

function viewWorkout(id){
 let w=state.workouts.find(x=>x.id===id);if(!w)return;
 const entries=(w.exercises||[]).map(entry=>normalizedEntry(entry,w.unit||"kg"));
 modal(`<div class="handle"></div><h2>${new Date(w.date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</h2><div class="muted">${w.muscles.map(muscle).join(" · ")}</div>${entries.map(entry=>{const ex=state.exercises.find(x=>x.id===entry.exerciseId);const unit=entry.unit||w.unit||"kg";return `<div class="workout-detail card"><strong>${esc(ex?.name||"Deleted exercise")}</strong>${entry.sets?.length?entry.sets.map((set,i)=>`<div class="detail-set"><span>Set ${i+1}</span><span>${esc(formatSet(set,unit))}</span></div>`).join(""):`<div class="muted detail-empty">No weight/reps recorded for this exercise.</div>`}</div>`}).join("")}<div class="modal-actions"><button class="outline btn-wide" onclick="deleteWorkout('${w.id}')">Delete Workout</button><button class="primary btn-wide" onclick="closeModal()">Done</button></div>`)
}
function deleteWorkout(id){if(confirm("Delete this workout?")){state.workouts=state.workouts.filter(w=>w.id!==id);save();closeModal();renderCalendar()}}
