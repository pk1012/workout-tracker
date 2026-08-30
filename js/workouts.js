function emptyWorkoutDraft(){return {date:"",muscles:[],exercises:[],unit:"kg",startTime:"",endTime:"",goneMuscles:[],goneExercises:[],muscleNames:[]}}
let workoutDraft=emptyWorkoutDraft();
function isEditingWorkout(){return !!workoutDraft.editId}
function cancelWorkoutForm(){
 if(isEditingWorkout())workoutDraft=emptyWorkoutDraft();
 closeModal();
}
function exerciseMuscleId(id){
 const live=state.exercises.find(x=>x.id===id);
 if(live)return live.muscleId;
 const bin=(state.bin&&Array.isArray(state.bin.exercises)?state.bin.exercises:[]).find(x=>x.id===id);
 if(bin?.muscleId)return bin.muscleId;
 for(const g of state.bin&&Array.isArray(state.bin.muscles)?state.bin.muscles:[]){
  if((g.exercises||[]).some(x=>x.id===id))return g.id;
 }
 return "";
}
function inferWorkoutExerciseMuscleId(entry,w){
 const stored=typeof entry?.muscleId==="string"?entry.muscleId:"";
 if(stored&&(w.muscles||[]).includes(stored))return stored;
 const known=exerciseMuscleId(entry.exerciseId);
 if(known)return known;
 const gone=(w.muscles||[]).filter(id=>!isLiveMuscle(id));
 if(gone.length)return gone[0];
 return (w.muscles||[])[0]||"";
}
function keepDraftMuscle(id){
 return isLiveMuscle(id)||(workoutDraft.goneMuscles||[]).includes(id);
}
function draftMuscleLabel(id){
 const live=state.muscles.find(m=>m.id===id)?.name;
 if(live)return live;
 const ids=workoutDraft.muscles||[];
 const names=workoutDraft.muscleNames||[];
 const i=ids.indexOf(id);
 if(i>=0&&names[i])return names[i];
 return muscleNameFromState(state,id)||"Unknown";
}
function isLiveMuscle(id){return state.muscles.some(m=>m.id===id)}
function isLiveExercise(id){return state.exercises.some(e=>e.id===id)}
function musclePickButton(id,name,gone){
 const slug=String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
 const chosen=(workoutDraft.muscles||[]).includes(id);
 return `<button type="button" class="pick workout-muscle-button workout-muscle-${slug}${chosen?" selected":""}${gone?" library-gone":""}" data-muscle="${id}" onclick="this.classList.toggle('selected')"><span class="workout-muscle-icon" aria-hidden="true"><svg class="icon"><use href="#dumbbell"/></svg></span><span>${esc(name)}</span></button>`;
}
function exercisePickButton(id,name,gone){
 const on=(workoutDraft.exercises||[]).some(x=>x.exerciseId===id);
 return `<button type="button" class="exercise-row exercise-pick pick${on?" selected":""}${gone?" library-gone":""}" data-exercise="${id}" onclick="this.classList.toggle('selected')"><span>${esc(name)}</span><span class="pick-plus"><svg class="icon" aria-hidden="true"><use href="#plus"/></svg></span></button>`;
}
let selectedWeekStart=weekStart(new Date());
let selectedMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);

function localTimeValue(d=new Date()){return d.toTimeString().slice(0,5)}
function formatTime(t){if(!t)return "—";let [h,m]=t.split(":").map(Number);let ap=h>=12?"PM":"AM",hh=h%12||12;return `${hh}:${String(m).padStart(2,"0")} ${ap}`}
function durationMinutes(w){
 if(!w?.startTime||!w?.endTime)return null;
 let a=w.startTime.split(":").map(Number),b=w.endTime.split(":").map(Number);
 let x=a[0]*60+a[1],y=b[0]*60+b[1]; if(y<x)y+=1440; return y-x;
}
function durationLabel(n){if(n==null)return "—";let h=Math.floor(n/60),m=n%60;return h?`${h}h ${String(m).padStart(2,"0")}m`:`${m} min`}
function weekStart(d){let x=new Date(d);x.setHours(0,0,0,0);let day=x.getDay();let mondayOffset=(day+6)%7;x.setDate(x.getDate()-mondayOffset);return x}
function weekEnd(d){let x=weekStart(d);x.setDate(x.getDate()+6);return x}
function weekNumber(d){
 // Use ISO-8601 week numbers so the label matches the calendar week.
 // Examples: 2–8 Feb 2025 = #06, 5–11 May 2025 = #19,
 // 24–30 Aug 2026 = #35, 13–19 Sep 2027 = #37.
 const x=new Date(d);
 x.setHours(0,0,0,0);
 // ISO week: Thursday determines the ISO year.
 const day=x.getDay() || 7;
 x.setDate(x.getDate() + 4 - day);
 const yearStart=new Date(x.getFullYear(),0,1);
 return Math.ceil((((x-yearStart)/86400000)+1)/7);
}
function rangeLabel(start){
 let end=weekEnd(start);
 const part=d=>`${pad2(d.getDate())} ${d.toLocaleDateString("en-IN",{month:"short"})}`;
 return `${part(start)} – ${part(end)}`;
}
function pad2(n){return String(n).padStart(2,"0")}
function weekNumberChip(d){return `#${pad2(weekNumber(d))}`}
function monthNumberChip(month){return `#${pad2(monthStart(month).getMonth()+1)}`}
function monthRangeLabel(month){
 const start=monthStart(month);
 const end=new Date(start.getFullYear(),start.getMonth()+1,0);
 const part=d=>`${pad2(d.getDate())} ${d.toLocaleDateString("en-IN",{month:"short"})}`;
 return `${part(start)} – ${part(end)}`;
}
function weekDates(start){return Array.from({length:7},(_,i)=>{let d=new Date(start);d.setDate(d.getDate()+i);return d})}
function isToday(d){return dateKey(d)===dateKey(new Date())}
function monthStart(d){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(1);return x}
function monthGrid(d){
 const first=monthStart(d);
 const start=weekStart(first);
 return Array.from({length:42},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);return day});
}
function monthDates(d){
 const first=monthStart(d);
 const last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
 return Array.from({length:last},(_,i)=>{const day=new Date(first);day.setDate(i+1);return day});
}
function inSelectedMonth(d){return d.getFullYear()===selectedMonth.getFullYear()&&d.getMonth()===selectedMonth.getMonth()}
function iAmThisMonth(d){const n=new Date();return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()}
function weekdayHeads(){return weekDates(weekStart(new Date())).map(d=>d.toLocaleDateString("en-IN",{weekday:"short"}))}

function renderCalendar(){
 const month=monthStart(selectedMonth);
 const days=monthGrid(month);
 const inMonth=monthDates(month);
 const count=inMonth.filter(d=>state.workouts.some(w=>w.date===dateKey(d))).length;
 const restCount=inMonth.filter(d=>!state.workouts.some(w=>w.date===dateKey(d))).length;
 const remaining=remainingDays(inMonth);
 const sel=dateKey(selected);
 const heads=weekdayHeads();
 document.getElementById("workoutView").innerHTML=`<section class="workout-week workout-month card"><div class="section-head"><h2>Monthly Activity</h2><button class="week-select" type="button" onclick="openMonthPicker()" aria-label="Select month"><b>${monthNumberChip(month)}</b><span>${monthRangeLabel(month)}</span><i><svg class="icon" aria-hidden="true"><use href="#chevron-down"/></svg></i></button></div><div class="workout-month-weekdays">${heads.map(h=>`<span>${h}</span>`).join("")}</div><div class="workout-days workout-month-days">${days.map(d=>{const k=dateKey(d),has=state.workouts.some(w=>w.date===k),today=isToday(d),out=inSelectedMonth(d)?"":" out-month";return `<button type="button" class="${k===sel?"selected ":""}${today?"is-today":""}${out}" aria-label="${d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}" onclick="selectWorkoutDay('${k}')"><small>${d.getDate()}</small><i class="${has?"workout":today?"today":"rest"}">${has?"<svg class=\"icon\"><use href=\"#check\"/></svg>":today?"":"<svg class=\"icon\"><use href=\"#minus\"/></svg>"}</i></button>`}).join("")}</div><div class="legend"><span><i class="dot workout"></i>Workout</span><span><i class="dot rest"></i>Rest</span><span><i class="dot today"></i>Today</span></div><div class="week-stats"><span><svg class="icon" aria-hidden="true"><use href="#calendar-icon"/></svg><b>${count} workout${count===1?"":"s"}</b></span><i class="week-stats-rule" aria-hidden="true"></i><span><svg class="icon" aria-hidden="true"><use href="#activity"/></svg><b>${restCount} rest days</b></span><i class="week-stats-rule" aria-hidden="true"></i><span><svg class="icon" aria-hidden="true"><use href="#target"/></svg><b>${remaining} day${remaining===1?"":"s"} remaining</b></span></div></section>${renderSelectedDay(sel)}`;
}
function renderSelectedDay(k){
 let d=new Date(k+"T00:00:00"),ws=state.workouts.filter(w=>w.date===k);
 if(!ws.length)return `<section class="day-section"><div class="selected-date">${d.toLocaleDateString("en-IN",{weekday:"long",month:"short",day:"numeric"})}</div><div class="workout-card rest-card card"><div class="workout-avatar rest-avatar"><svg class="icon"><use href="#moon"/></svg></div><div class="workout-card-copy"><strong>Rest Day</strong><span>Recovery day — let your muscles recover and come back stronger.</span></div></div></section>`;
 return `<section class="day-section"><div class="selected-date">${d.toLocaleDateString("en-IN",{weekday:"long",month:"short",day:"numeric"})}</div>${ws.map(w=>workoutCard(w)).join("")}</section>`
}
function workoutCardDate(w){
 if(!w.date||!isValidDateString(w.date))return "";
 const d=new Date(w.date+"T00:00:00");
 const weekday=d.toLocaleDateString("en-IN",{weekday:"long"});
 const month=d.toLocaleDateString("en-IN",{month:"long"});
 return `${weekday}, ${d.getDate()} ${month} ${d.getFullYear()}`;
}
function workoutCard(w){
 const dur=durationMinutes(w);
 const ex=w.exercises?.length||0;
 const sets=(w.exercises||[]).reduce((n,e)=>n+(e.sets?.length||0),0);
 const date=workoutCardDate(w);
 return `<button class="workout-card card" onclick="viewWorkout('${w.id}')"><div class="workout-avatar"><svg class="icon"><use href="#dumbbell"/></svg></div><div class="workout-card-copy"><strong>${esc(workoutMuscleLabel(w))}</strong>${date?`<span class="workout-card-date"><svg class="inline-icon"><use href="#calendar-icon"/></svg><span>${esc(date)}</span></span>`:""}<div class="workout-metrics"><b><svg class="inline-icon"><use href="#dumbbell"/></svg><span>${ex}</span><small>Exercises</small></b><b><svg class="inline-icon"><use href="#layers"/></svg><span>${sets}</span><small>Sets</small></b><b><svg class="inline-icon"><use href="#clock"/></svg><span>${durationLabel(dur)}</span></b></div></div><span class="card-arrow" aria-hidden="true"><svg class="icon"><use href="#chevron-right"/></svg></span></button>`;
}
function renderRecentWorkouts(){ /* Progress page. */ const ws=[...state.workouts].sort((a,b)=>{const dateDiff=(b.date||"").localeCompare(a.date||"");return dateDiff||(b.createdAt||0)-(a.createdAt||0)});return `<section class="recent-section"><div class="section-head"><h2>Workout History</h2></div>${ws.length?ws.map(workoutCard).join(""):`<div class="empty card">No workouts logged yet.</div>`}</section>`}
function selectWorkoutDay(k){selected=new Date(k+"T00:00:00");selectedWeekStart=weekStart(selected);selectedMonth=monthStart(selected);renderCalendar();renderHome()}
function goToWeekDay(k){go("workouts");selectWorkoutDay(k)}
function openWeekPicker(){
 let s=weekStart(new Date()),items=[];for(let i=0;i<52;i++){let d=new Date(s);d.setDate(d.getDate()-i*7);items.push(d)}
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <div class="picker-title">
    <h2 class="workout-form-title">Select Week</h2>
    <button aria-label="Close" onclick="closeModal()"><svg class="icon"><use href="#close"/></svg></button>
   </div>
  </div>
  <div class="workout-entry-scroll">
   <div class="week-list">${items.map(d=>`<button onclick="chooseWeek('${dateKey(d)}')" class="${dateKey(d)===dateKey(selectedWeekStart)?"chosen":""}"><b>${weekNumberChip(d)}</b><span>${rangeLabel(d)}</span>${iAmThisWeek(d)?'<em>This Week <svg class="icon"><use href="#check"/></svg></em>':""}</button>`).join("")}</div>
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="outline btn-wide workout-cancel-button" onclick="closeModal()">Close</button>
  </div>
 `,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
}
function iAmThisWeek(d){return dateKey(d)===dateKey(weekStart(new Date()))}
function chooseWeek(k){selectedWeekStart=weekStart(new Date(k+"T00:00:00"));selected=new Date(selectedWeekStart);selectedMonth=monthStart(selected);closeModal();renderCalendar();renderHome()}
function openMonthPicker(){
 const now=monthStart(new Date());
 const items=[];
 for(let i=0;i<24;i++){const d=monthStart(now);d.setMonth(d.getMonth()-i);items.push(new Date(d))}
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <div class="picker-title">
    <h2 class="workout-form-title">Select Month</h2>
    <button aria-label="Close" onclick="closeModal()"><svg class="icon"><use href="#close"/></svg></button>
   </div>
  </div>
  <div class="workout-entry-scroll">
   <div class="week-list">${items.map(d=>`<button type="button" onclick="chooseMonth('${dateKey(d)}')" class="${dateKey(d)===dateKey(monthStart(selectedMonth))?"chosen":""}"><b>${d.toLocaleDateString("en-IN",{month:"short"})}</b><span>${d.getFullYear()}</span>${iAmThisMonth(d)?'<em>This Month <svg class="icon"><use href="#check"/></svg></em>':""}</button>`).join("")}</div>
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="outline btn-wide workout-cancel-button" onclick="closeModal()">Close</button>
  </div>
 `,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
}
function chooseMonth(k){
 selectedMonth=monthStart(new Date(k+"T00:00:00"));
 const same=selected.getFullYear()===selectedMonth.getFullYear()&&selected.getMonth()===selectedMonth.getMonth();
 if(!same){
  const today=new Date();today.setHours(0,0,0,0);
  selected=iAmThisMonth(selectedMonth)?today:new Date(selectedMonth);
 }
 selectedWeekStart=weekStart(selected);
 closeModal();renderCalendar();renderHome();
}

function draftFromWorkout(w){
 const unit=w.unit||"kg";
 const names=workoutMuscleNames(w);
 const muscles=[...(w.muscles||[])];
 const exercises=(w.exercises||[]).map(e=>{
  const entry=normalizedEntry(e,unit);
  const muscleId=inferWorkoutExerciseMuscleId({...entry,muscleId:entry.muscleId},w);
  return {exerciseId:entry.exerciseId,name:workoutExerciseName(e),muscleId,sets:(entry.sets||[]).map(s=>({weight:s.weight===""||s.weight==null?"":String(s.weight),reps:s.reps===""||s.reps==null?"":String(s.reps)}))};
 });
 return {
  editId:w.id,
  createdAt:w.createdAt,
  date:w.date,
  muscles,
  muscleNames:names,
  unit,
  startTime:w.startTime||"",
  endTime:w.endTime||"",
  exercises,
  goneMuscles:muscles.filter(id=>!isLiveMuscle(id)),
  goneExercises:exercises.filter(e=>!isLiveExercise(e.exerciseId))
 };
}
function renderWorkoutBasicsSheet(){
 const ms=sortedMuscles();
 const liveIds=new Set(ms.map(m=>m.id));
 const gone=(workoutDraft.goneMuscles||[]).filter(id=>!liveIds.has(id));
 const editing=isEditingWorkout();
 const picks=[...ms.map(m=>musclePickButton(m.id,m.name,false)),...gone.map(id=>musclePickButton(id,draftMuscleLabel(id),true))].join("");
 modal(`<div class="workout-entry-header"><div class="handle"></div><h2 class="workout-form-title">${editing?"Edit Workout":"Start Workout"}</h2><div class="muted workout-form-description">Choose the date, start time and muscle groups.</div></div><div class="workout-entry-scroll"><div class="field workout-date-section"><label class="workout-date-label">Date</label><div class="workout-date-field workout-input-wrap"><svg class="workout-date-icon workout-field-icon icon" aria-hidden="true"><use href="#calendar-icon"/></svg><input id="workDate" class="input workout-date-input" type="date" value="${esc(workoutDraft.date)}"></div></div><div class="time-grid workout-time-section"><div class="field workout-start-time-section"><label class="workout-start-time-label">Start time</label><div class="workout-start-time-field workout-input-wrap"><svg class="workout-start-time-icon workout-field-icon icon" aria-hidden="true"><use href="#clock"/></svg><input id="startTime" class="input workout-start-time-input" type="time" value="${esc(workoutDraft.startTime)}"></div></div><div class="field workout-end-time-section"><label class="workout-end-time-label">End time</label><div class="workout-end-time-field workout-input-wrap"><svg class="workout-end-time-icon workout-field-icon icon" aria-hidden="true"><use href="#clock"/></svg><input id="endTime" class="input workout-end-time-input" type="time" value="${esc(workoutDraft.endTime)}"></div></div></div><div class="field workout-muscle-groups-section"><label class="workout-muscle-groups-label">Muscle groups</label><div class="grid workout-muscle-groups-grid">${picks}</div></div><div class="workout-selection-hint"><svg class="icon" aria-hidden="true"><use href="#info"/></svg><span>You can select multiple muscle groups</span></div></div><div class="modal-actions workout-modal-actions"><button class="primary btn-wide workout-next-button" onclick="chooseExercises()">Next: Select Exercises <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button><button class="outline btn-wide workout-cancel-button" onclick="cancelWorkoutForm()">Cancel</button></div>`,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
}
function todayDateKey(){const d=new Date();d.setHours(0,0,0,0);return dateKey(d)}
function workoutOnDate(date,exceptId){
 return (state.workouts||[]).find(w=>w.date===date&&w.id!==exceptId)||null;
}
function dateTakenMessage(){return "A workout already exists for this day."}
function openWorkout(){
 workoutDraft={...emptyWorkoutDraft(),date:todayDateKey(),startTime:localTimeValue()};
 renderWorkoutBasicsSheet();
}
function editWorkout(id){
 const w=state.workouts.find(x=>x.id===id);
 if(!w)return;
 workoutDraft=draftFromWorkout(w);
 renderWorkoutBasicsSheet();
}
function chooseExercises(){
 let ids=[...document.querySelectorAll("[data-muscle].selected")].map(x=>x.dataset.muscle),date=document.getElementById("workDate")?.value,start=document.getElementById("startTime")?.value,end=document.getElementById("endTime")?.value;
 if(!ids.length){notify("Select at least one muscle group.");return}
 if(!isValidDateString(date)){notify("Choose a valid workout date.");return}
 if(workoutOnDate(date,workoutDraft.editId)){notify(dateTakenMessage());return}
 if(!start){notify("Enter a start time.");return}
 if(end && end===start){notify("End time must be different from start time.");return}
 const prevIds=workoutDraft.muscles||[];
 const prevNames=workoutDraft.muscleNames||[];
 const validMuscles=ids.filter(keepDraftMuscle);
 const nextNames=validMuscles.map(id=>{
  const i=prevIds.indexOf(id);
  if(i>=0&&prevNames[i])return prevNames[i];
  return muscleNameFromState(state,id)||"Unknown";
 });
 workoutDraft.date=date;workoutDraft.startTime=start;workoutDraft.endTime=end;workoutDraft.muscles=validMuscles;workoutDraft.muscleNames=nextNames;
 workoutDraft.exercises=(workoutDraft.exercises||[]).filter(e=>validMuscles.includes(e.muscleId));
 renderExerciseSelection();
}
function renderExerciseSelection(){
 const exerciseContent=workoutDraft.muscles.map(id=>{
   const live=sortedExercisesForMuscle(id);
   const liveIds=new Set(live.map(e=>e.id));
   const ghosts=[];
   const seen=new Set();
   for(const e of workoutDraft.goneExercises||[]){
    if(e.muscleId!==id||liveIds.has(e.exerciseId)||seen.has(e.exerciseId))continue;
    seen.add(e.exerciseId);
    ghosts.push(e);
   }
   const rows=[...live.map(e=>exercisePickButton(e.id,e.name,false)),...ghosts.map(e=>exercisePickButton(e.exerciseId,e.name||"Deleted exercise",true))].join("");
   return `<div class="field"><div class="section-title">${esc(draftMuscleLabel(id))}</div>${rows||`<div class="empty">No exercises in this group.</div>`}</div>`;
 }).join("");

 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2>Select Exercises</h2>
   <div class="muted workout-form-description">Select the exercises you performed.</div>
  </div>
  <div class="workout-entry-scroll">
   ${exerciseContent}
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="continueToSetDetails()">Next: Enter Weight &amp; Reps <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button>
   <button class="outline btn-wide workout-cancel-button" onclick="renderWorkoutBasicsSheet()">Back</button>
  </div>
 `,"workout-entry-sheet");
}

function continueToSetDetails(){
 const ids=[...document.querySelectorAll("[data-exercise].selected")].map(x=>x.dataset.exercise);
 if(!ids.length){notify("Select at least one exercise.");return}
 const previous=new Map((workoutDraft.exercises||[]).map(e=>[e.exerciseId,e]));
 const gone=new Map((workoutDraft.goneExercises||[]).map(e=>[e.exerciseId,e]));
 workoutDraft.exercises=ids.map(id=>{
  if(previous.has(id))return previous.get(id);
  const live=state.exercises.find(e=>e.id===id);
  if(live)return {exerciseId:id,name:live.name,muscleId:live.muscleId,sets:[{weight:"",reps:""}]};
  const ghost=gone.get(id);
  if(ghost)return {exerciseId:id,name:ghost.name||"Deleted exercise",muscleId:ghost.muscleId,sets:ghost.sets?.length?ghost.sets.map(s=>({...s})):[{weight:"",reps:""}]};
  return null;
 }).filter(Boolean);
 if(!workoutDraft.exercises.length){notify("Select at least one exercise.");return}
 renderSetDetails();
}
function renderSetDetails(){
 const selectedNames=workoutDraft.exercises.map(e=>e.name||state.exercises.find(x=>x.id===e.exerciseId)?.name||"Deleted exercise");
 const content=`
   <div class="field unit-field">
     <label>Weight unit</label>
     <div class="segment">
       <button class="unit-btn ${workoutDraft.unit==='kg'?'active':''}" onclick="setWorkoutUnit('kg')">kg</button>
       <button class="unit-btn ${workoutDraft.unit==='lb'?'active':''}" onclick="setWorkoutUnit('lb')">lb</button>
     </div>
   </div>
   ${workoutDraft.exercises.map((entry,i)=>{
     const name=selectedNames[i];
     return `<div class="set-editor card pad">
       <div class="set-editor-head"><strong>${esc(name)}</strong></div>
       <div id="sets-${i}">${entry.sets.map((set,j)=>setRow(i,j,set)).join("")}</div>
       <button class="add-set" onclick="addSet(${i})">
         <svg class="icon"><use href="#plus"></use></svg> Add Set
       </button>
     </div>`;
   }).join("")}
 `;

 modal(`
   <div class="workout-entry-header">
     <div class="handle"></div>
     <h2>Enter Workout Details</h2>
     <div class="muted workout-form-description">Add the weight and reps for each set.</div>
   </div>
   <div class="workout-entry-scroll">
     ${content}
   </div>
   <div class="modal-actions workout-modal-actions">
     <button class="primary btn-wide workout-next-button" onclick="saveWorkout()">${isEditingWorkout()?"Save Changes":"Complete Workout"}</button>
     <button class="outline btn-wide workout-cancel-button" onclick="renderExerciseSelection()">Back</button>
   </div>
 `,"workout-entry-sheet");
}

function setRow(exIndex,setIndex,set){const remove=workoutDraft.exercises[exIndex].sets.length>1?`<button class="remove-set" aria-label="Remove set" onclick="removeSet(${exIndex},${setIndex})"><svg class="icon"><use href="#close"/></svg></button>`:`<span class="remove-placeholder"></span>`;return `<div class="set-row"><span class="set-number">${setIndex+1}</span><label class="set-field"><span>Weight</span><input class="input compact" type="number" min="0" step="0.1" value="${esc(set.weight??"")}" oninput="updateSet(${exIndex},${setIndex},'weight',this.value)"></label><label class="set-field"><span>Reps</span><input class="input compact" type="number" min="1" step="1" value="${esc(set.reps??"")}" oninput="updateSet(${exIndex},${setIndex},'reps',this.value)"></label>${remove}</div>`}
function updateSet(i,j,k,v){if(workoutDraft.exercises[i]?.sets[j])workoutDraft.exercises[i].sets[j][k]=v}
function addSet(i){workoutDraft.exercises[i].sets.push({weight:"",reps:""});renderSetDetails()}
function removeSet(i,j){if(workoutDraft.exercises[i].sets.length>1)workoutDraft.exercises[i].sets.splice(j,1);renderSetDetails()}
function setWorkoutUnit(unit){if(unit!==workoutDraft.unit){let f=workoutDraft.unit==="kg"?2.2046226218:0.45359237;workoutDraft.exercises.forEach(e=>e.sets.forEach(s=>{if(s.weight!=="")s.weight=String(Math.round(Number(s.weight)*f*100)/100)}));workoutDraft.unit=unit}renderSetDetails()}

function saveWorkout(){
 const date=workoutDraft.date,muscles=[...new Set(workoutDraft.muscles)].filter(keepDraftMuscle);
 const editing=isEditingWorkout();
 const id=editing?workoutDraft.editId:newId();
 const old=state.workouts.find(w=>w.id===id);
 const exercises=workoutDraft.exercises.filter(e=>e.exerciseId&&(isLiveExercise(e.exerciseId)||(workoutDraft.goneExercises||[]).some(g=>g.exerciseId===e.exerciseId)||(old&&(old.exercises||[]).some(x=>exerciseIdOf(x)===e.exerciseId))));
 if(!muscles.length||!isValidDateString(date)||!workoutDraft.startTime){notify("Complete the workout date, start time and muscle groups.");return}
 if(workoutOnDate(date,workoutDraft.editId)){notify(dateTakenMessage());return}
 if(!workoutDraft.endTime){notify("Enter the end time to complete the workout.");return}
 let startMinutes=Number(workoutDraft.startTime.split(":")[0])*60+Number(workoutDraft.startTime.split(":")[1]);
 let endMinutes=Number(workoutDraft.endTime.split(":")[0])*60+Number(workoutDraft.endTime.split(":")[1]);
 if(endMinutes===startMinutes){notify("Start and end time cannot be the same.");return}
 if(!exercises.length){notify("Select at least one exercise.");return}
 for(const e of exercises)for(const s of e.sets||[]){let weight=Number(s.weight),reps=Number(s.reps);if(s.weight===""||!Number.isFinite(weight)||weight<0||s.reps===""||!Number.isInteger(reps)||reps<1){notify("Enter valid weight and reps for every set.");return}}
 const createdAt=editing?(Number(workoutDraft.createdAt)||Date.now()):Date.now();
 const record={id,date,muscles,muscleNames:muscleNamesForIds(muscles,{muscles:workoutDraft.muscles,muscleNames:workoutDraft.muscleNames}),startTime:workoutDraft.startTime,endTime:workoutDraft.endTime,unit:workoutDraft.unit,exercises:exercises.map(e=>({exerciseId:e.exerciseId,name:nameForWorkoutExercise(e,old),sets:e.sets.map(s=>({weight:Number(s.weight),reps:Number(s.reps)})),unit:workoutDraft.unit})),createdAt};
 if(old){record.createdAt=old.createdAt||createdAt;record.updatedAt=Date.now();Object.assign(old,record)}
 else state.workouts.push(record);
 delete state.activeWorkout;
 save();
 if(typeof driveAfterWorkoutChange==="function")driveAfterWorkoutChange();
 selected=new Date(date+"T00:00:00");selectedWeekStart=weekStart(selected);selectedMonth=monthStart(selected);
 workoutDraft=emptyWorkoutDraft();
 closeModal();
 if(editing){renderCalendar();renderHome();if(typeof renderNotificationBell==="function")renderNotificationBell()}
 else go("home");
}
function normalizedEntry(entry,fallbackUnit="kg"){if(typeof entry==="string")return {exerciseId:entry,sets:[],unit:fallbackUnit};const e=entry||{exerciseId:"",sets:[]};return {...e,unit:e.unit||fallbackUnit}}
function formatSet(set,unit){return `${Number(set.weight)} ${unit||"kg"} · ${Number(set.reps)} reps`}
function viewWorkout(id){
 let w=state.workouts.find(x=>x.id===id);if(!w)return;
 let entries=(w.exercises||[]).map(e=>normalizedEntry(e,w.unit||"kg"));
 const details=entries.map((e,i)=>{
  const name=workoutExerciseName((w.exercises||[])[i]||e);
  return `<div class="workout-detail card"><strong>${esc(name)}</strong>${(e.sets||[]).map((s,j)=>`<div class="detail-set"><span>Set ${j+1}</span><span>${esc(formatSet(s,e.unit))}</span></div>`).join("")}</div>`;
 }).join("");
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">${esc(workoutMuscleLabel(w))}</h2>
   <div class="muted workout-form-description">${new Date(w.date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · ${formatTime(w.startTime)} – ${formatTime(w.endTime)} · ${durationLabel(durationMinutes(w))}</div>
  </div>
  <div class="workout-entry-scroll">
   ${details}
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="editWorkout('${w.id}')">Edit Workout</button>
   <button class="outline btn-wide workout-cancel-button" onclick="deleteWorkout('${w.id}')">Delete Workout</button>
   <button class="outline btn-wide workout-cancel-button" onclick="closeModal()">Done</button>
  </div>
 `,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
}
function deleteWorkout(id){confirmAction("Delete this workout? It will stay in Recycle Bin for 30 days.",()=>{moveWorkoutToBin(id);save();if(typeof driveAfterWorkoutChange==="function")driveAfterWorkoutChange();closeModal();renderCalendar();renderHome()},true)}
