let workoutDraft={date:"",muscles:[],exercises:[],unit:"kg",startTime:"",endTime:""};
let selectedWeekStart=weekStart(new Date());


function workoutIconName(type){
  const map={
    completed:"check",
    rest:"minus",
    active:"play",
    inProgress:"play",
    notStarted:"calendar"
  };
  return map[type]||"dumbbell";
}
function workoutIcon(type, cls="icon"){
  return `<svg class="${cls}" aria-hidden="true"><use href="#${workoutIconName(type)}"/></svg>`;
}

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
 // App week numbering follows the approved UI baseline: Aug 25–31, 2025 is #46.
 const anchor=new Date("2025-08-25T00:00:00");
 const current=weekStart(d);
 return 46 + Math.round((current-anchor)/604800000);
}
function rangeLabel(start){let end=weekEnd(start),a=start.toLocaleDateString("en-IN",{month:"short",day:"numeric"}),b=end.toLocaleDateString("en-IN",{month:"short",day:"numeric"});return `${a} – ${b}`}
function weekKey(d){return dateKey(weekStart(d))}
function weekDates(start){return Array.from({length:7},(_,i)=>{let d=new Date(start);d.setDate(d.getDate()+i);return d})}
function isToday(d){return dateKey(d)===dateKey(new Date())}

function renderHome(){
 const today=new Date();today.setHours(0,0,0,0);
 const k=dateKey(today);
 const todays=[...state.workouts].filter(w=>w.date===k).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const latest=todays[0];
 // Home intentionally exposes only two status states: completed or no workout yet.
 // An unfinished draft remains available to the workout flow, but is not presented as a third home status.
 const status=latest?homeCompleted(latest):homeNotStarted();
 const ws=weekStart(selectedWeekStart), days=weekDates(ws), workouts=days.filter(d=>state.workouts.some(w=>w.date===dateKey(d))).length;
 document.getElementById("homeView").innerHTML=heroCard()+status+weeklyCard(ws,workouts)+quickProgress();
}
function heroCard(){return `<section class="hero-card"><div class="hero-copy"><h2>Start Workout</h2><p>Log your workout and<br>Keep your streak alive!</p><button class="hero-btn" onclick="openWorkout()">Start Workout <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button></div><img class="hero-art" src="assets/workout-hero.png" alt="Dumbbell and shaker illustration" aria-hidden="true"></section>`}
function homeNotStarted(){return `<section class="home-status card"><h2>Today's Status</h2><div class="status-main"><div class="status-icon neutral"><svg class="icon"><use href="#activity"/></svg></div><div class="status-copy"><strong>No workout yet</strong><span>Ready when you are.</span></div><button class="outline status-action" onclick="openWorkout()">Start Workout</button></div></section>`}
function homeCompleted(w){
 const dur=durationMinutes(w), pct=dur==null?0:Math.round(dur/90*100);
 return `<section class="home-status card"><h2>Today's Status</h2><div class="status-main"><div class="status-icon complete"><svg class="icon" aria-hidden="true"><use href="#check"/></svg></div><div class="status-copy green-text"><strong>Workout completed</strong><span>Great job! You crushed it.</span></div><button class="outline status-action" onclick="viewWorkout('${w.id}')">View Workout</button></div><div class="meter-label"><span>Duration</span><b>${durationLabel(dur)}</b><span>Target: 90 min</span></div><div class="meter"><i style="width:${Math.min(100,pct)}%"></i><span>◎</span></div><div class="target-badge">${pct}% of your target</div></section>`;
}

function weeklyCard(start,count){
 const days=weekDates(start);
 const restCount=days.filter(d=>!state.workouts.some(w=>w.date===dateKey(d))).length;
 const remaining=remainingDays(days);
 return `<section class="weekly-card card"><div class="section-head"><h2>Weekly Activity</h2><button class="week-select" onclick="openWeekPicker()" aria-label="Select week"><b>#${weekNumber(start)}</b><span>${rangeLabel(start)}</span><i><svg class="icon" aria-hidden="true"><use href="#chevron-down"/></svg></i></button></div><div class="week-days">${days.map(d=>{const has=state.workouts.some(w=>w.date===dateKey(d)),today=isToday(d);return `<button type="button" onclick="goToWeekDay('${dateKey(d)}')" class="week-day"><span>${d.toLocaleDateString("en-IN",{weekday:"short"})}</span><i class="${has?"workout":today?"today":"rest"}">${has?'<svg class="icon" aria-hidden="true"><use href="#check"/></svg>':today?'':'<svg class="icon" aria-hidden="true"><use href="#minus"/></svg>'}</i></button>`}).join("")}</div><div class="legend"><span><i class="dot workout"></i>Workout</span><span><i class="dot rest"></i>Rest</span><span><i class="dot today"></i>Today</span></div><div class="week-stats"><span><svg class="icon" aria-hidden="true"><use href="#calendar-icon"/></svg><b>${count} workout${count===1?"":"s"}</b></span><span><svg class="icon" aria-hidden="true"><use href="#activity"/></svg><b>${restCount} rest days</b></span><span><svg class="icon" aria-hidden="true"><use href="#target"/></svg><b>${remaining} day${remaining===1?"":"s"} remaining</b></span></div><button class="full-week" onclick="go('workouts')">View full week <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button></section>`;
}

function remainingDays(days){
 const today=new Date();today.setHours(0,0,0,0);
 const todayKey=dateKey(today);
 const inWeek=days.some(d=>dateKey(d)===todayKey);
 if(!inWeek)return 0;
 const todayCompleted=state.workouts.some(w=>w.date===todayKey);
 return days.filter(d=>d>=today && (!isToday(d) || !todayCompleted)).length;
}
function quickProgress(){let ws=weekStart(selectedWeekStart),we=weekEnd(ws),w=state.workouts.filter(x=>x.date>=dateKey(ws)&&x.date<=dateKey(we));let volume=0;w.forEach(x=>(x.exercises||[]).forEach(raw=>{let e=normalizedEntry(raw,x.unit||"kg");(e.sets||[]).forEach(s=>volume+=(Number(s.weight)||0)*(Number(s.reps)||0)*(e.unit==="lb"?0.45359237:1))}));return `<section class="quick card"><div class="section-head"><h2>Quick Progress</h2><button onclick="go('progress')">View full progress <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button></div><div class="quick-grid"><div><i><svg class="icon"><use href="#activity"/></svg></i><b>${w.length}</b><span>Workouts</span><small>This Week</small></div><div><i><svg class="icon"><use href="#layers"/></svg></i><b>${Math.round(volume).toLocaleString()} kg</b><span>Volume</span><small>This Week</small></div><div><i><svg class="icon"><use href="#chart"/></svg></i><b>${countPRs()}</b><span>PRs</span><small>This Month</small></div><div><i><svg class="icon"><use href="#target"/></svg></i><b>${calcProgress()}</b><span>Day Progress</span><small>Keep it up!</small></div></div></section>`}
function countPRs(){
 const now=new Date(),monthStart=new Date(now.getFullYear(),now.getMonth(),1),seen=new Map(),prs=[];
 const workouts=[...state.workouts].sort((a,b)=>String(a.date).localeCompare(String(b.date))||(a.createdAt||0)-(b.createdAt||0));
 workouts.forEach(w=>{
  (w.exercises||[]).forEach(raw=>{
   const e=normalizedEntry(raw,w.unit||"kg"),key=e.exerciseId;
   (e.sets||[]).forEach(set=>{
    const weight=Number(set.weight);if(!Number.isFinite(weight))return;
    const kg=e.unit==="lb"?weight*0.45359237:weight;
    const best=seen.get(key)||0;
    if(kg>best){
      seen.set(key,kg);
      const dt=new Date(w.date+"T00:00:00");
      if(dt>=monthStart&&dt<=now)prs.push({exerciseId:key,date:w.date,weight:kg});
    }
   });
  });
 });
 return prs.length;
}
function calcProgress(){let n=0,d=new Date();d.setHours(0,0,0,0);if(!state.workouts.some(w=>w.date===dateKey(d)))d.setDate(d.getDate()-1);while(state.workouts.some(w=>w.date===dateKey(d))){n++;d.setDate(d.getDate()-1)}return n}

function renderCalendar(){
 const start=weekStart(selectedWeekStart),days=weekDates(start),sel=dateKey(selected);
 const count=days.filter(d=>state.workouts.some(w=>w.date===dateKey(d))).length;
 document.getElementById("workoutView").innerHTML=`<section class="workout-week card"><div class="workout-week-head"><button aria-label="Previous week" onclick="moveWeek(-1)"><svg class="icon"><use href="#chevron-left"/></svg></button><div><strong>#${weekNumber(start)}</strong><span>${rangeLabel(start)}</span></div><button aria-label="Next week" onclick="moveWeek(1)"><svg class="icon"><use href="#chevron-right"/></svg></button></div><div class="workout-days">${days.map(d=>{let k=dateKey(d),has=state.workouts.some(w=>w.date===k),today=isToday(d);return `<button class="${k===sel?"selected ":""}${today?"is-today":""}" onclick="selectWorkoutDay('${k}')"><span>${d.toLocaleDateString("en-IN",{weekday:"short"})}</span><i class="${has?"workout":today?"today":"rest"}">${has?"<svg class=\"icon\"><use href=\"#check\"/></svg>":today?"":"<svg class=\"icon\"><use href=\"#minus\"/></svg>"}</i><small>${d.getDate()}</small></button>`}).join("")}</div><div class="legend"><span><i class="dot workout"></i>Workout</span><span><i class="dot rest"></i>Rest</span><span><i class="dot today"></i>Today</span></div><button class="week-picker-link" onclick="openWeekPicker()">Select Week <svg class="icon"><use href="#chevron-down"/></svg></button></section>${renderSelectedDay(sel)}${renderRecentWorkouts()}`;
}
function renderSelectedDay(k){
 let d=new Date(k+"T00:00:00"),ws=state.workouts.filter(w=>w.date===k);
 if(!ws.length)return `<section class="day-section"><div class="selected-date">${d.toLocaleDateString("en-IN",{weekday:"long",month:"short",day:"numeric"})}</div><div class="workout-card rest-card card"><div class="workout-avatar rest-avatar"><svg class="icon"><use href="#moon"/></svg></div><div class="workout-card-copy"><strong>Rest Day</strong><span>Recovery day — let your muscles recover and come back stronger.</span></div></div></section>`;
 return `<section class="day-section"><div class="selected-date">${d.toLocaleDateString("en-IN",{weekday:"long",month:"short",day:"numeric"})}</div>${ws.map(w=>workoutCard(w)).join("")}</section>`
}
function workoutCard(w){let dur=durationMinutes(w),ex=w.exercises?.length||0,sets=(w.exercises||[]).reduce((n,e)=>n+(e.sets?.length||0),0);return `<button class="workout-card card" onclick="viewWorkout('${w.id}')"><div class="workout-avatar"><svg class="icon"><use href="#dumbbell"/></svg></div><div class="workout-card-copy"><strong>${esc(w.muscles.map(muscle).join(" + "))}</strong><span><svg class="inline-icon"><use href="#calendar-icon"/></svg> ${formatTime(w.startTime)} ${w.endTime?`– ${formatTime(w.endTime)}`:""}</span><div class="workout-metrics"><b><svg class="inline-icon"><use href="#dumbbell"/></svg> ${ex}<small>Exercises</small></b><b><svg class="inline-icon"><use href="#layers"/></svg> ${sets}<small>Sets</small></b><b><svg class="inline-icon"><use href="#clock"/></svg> ${durationLabel(dur)}<small>Duration</small></b></div></div><span class="card-arrow" aria-hidden="true"><svg class="icon"><use href="#chevron-right"/></svg></span></button>`}
function renderRecentWorkouts(){let ws=[...state.workouts].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5);return `<section class="recent-section"><div class="section-head"><h2>Recent Workouts</h2></div>${ws.length?ws.map(workoutCard).join(""):`<div class="empty card">No workouts logged yet.</div>`}</section>`}
function moveWeek(n){selectedWeekStart=new Date(selectedWeekStart);selectedWeekStart.setDate(selectedWeekStart.getDate()+n*7);selected=new Date(selectedWeekStart);renderCalendar();renderHome()}
function selectWorkoutDay(k){selected=new Date(k+"T00:00:00");selectedWeekStart=weekStart(selected);renderCalendar();renderHome()}
function goToWeekDay(k){go("workouts");selectWorkoutDay(k)}
function openWeekPicker(){
 let s=weekStart(new Date()),items=[];for(let i=0;i<52;i++){let d=new Date(s);d.setDate(d.getDate()-i*7);items.push(d)}
 modal(`<div class="handle"></div><div class="picker-title"><h2>Select Week</h2><button aria-label="Close" onclick="closeModal()"><svg class="icon"><use href="#close"/></svg></button></div><div class="week-list">${items.map(d=>`<button onclick="chooseWeek('${dateKey(d)}')" class="${dateKey(d)===dateKey(selectedWeekStart)?"chosen":""}"><b>#${weekNumber(d)}</b><span>${rangeLabel(d)}</span>${iAmThisWeek(d)?'<em>This Week <svg class="icon"><use href="#check"/></svg></em>':""}</button>`).join("")}</div><button class="outline btn-wide" onclick="closeModal()">Close</button>`)
}
function iAmThisWeek(d){return dateKey(d)===dateKey(weekStart(new Date()))}
function chooseWeek(k){selectedWeekStart=weekStart(new Date(k+"T00:00:00"));selected=new Date(selectedWeekStart);closeModal();renderCalendar();renderHome()}

function openWorkout(muscleIds=[],dateValue=dateKey(selected),resume=false){
 let ms=sortedMuscles(), chosen=new Set(muscleIds), existing=resume&&state.activeWorkout;
 if(!muscleIds.length&&!resume)workoutDraft={date:dateValue,muscles:[],exercises:[],unit:"kg",startTime:localTimeValue(),endTime:""};
 else workoutDraft={date:existing?.date||dateValue,muscles:existing?.muscles||muscleIds,exercises:existing?.exercises||[],unit:existing?.unit||"kg",startTime:existing?.startTime||localTimeValue(),endTime:existing?.endTime||""};
 modal(`<div class="sheet workout-entry-sheet"><div class="handle"></div><h2>${resume?"Start Workout":"Start Workout"}</h2><div class="muted workout-entry-subtitle">Choose the date, start time and muscle groups.</div><div class="field workout-date-field"><label>Date</label><div class="workout-input-wrap"><svg class="workout-field-icon icon" aria-hidden="true"><use href="#calendar-icon"/></svg><input id="workDate" class="input" type="date" value="${esc(workoutDraft.date)}"></div></div><div class="time-grid workout-time-grid"><div class="field"><label>Start time</label><div class="workout-input-wrap"><svg class="workout-field-icon icon" aria-hidden="true"><use href="#clock"/></svg><input id="startTime" class="input" type="time" value="${esc(workoutDraft.startTime)}"></div></div><div class="field"><label>End time <span class="muted">(enter when completed)</span></label><div class="workout-input-wrap"><svg class="workout-field-icon icon" aria-hidden="true"><use href="#clock"/></svg><input id="endTime" class="input" type="time" value="${esc(workoutDraft.endTime)}"></div></div></div><div class="field workout-muscle-field"><label>Muscle groups</label><div class="grid">${ms.map(m=>`<button class="pick workout-muscle-pick ${chosen.has(m.id)?"selected":""}" data-muscle="${m.id}" onclick="this.classList.toggle('selected')"><span class="workout-muscle-icon" aria-hidden="true"><svg class="icon"><use href="#dumbbell"/></svg></span><span>${esc(m.name)}</span></button>`).join("")}</div></div><div class="workout-selection-hint"><svg class="icon" aria-hidden="true"><use href="#info"/></svg><span>You can select multiple muscle groups</span></div><div class="modal-actions workout-modal-actions"><button class="primary btn-wide" onclick="chooseExercises()">Next: Select Exercises <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button><button class="outline btn-wide" onclick="closeModal()">Cancel</button></div></div>`)
}
function chooseExercises(){
 let ids=[...document.querySelectorAll("[data-muscle].selected")].map(x=>x.dataset.muscle),date=document.getElementById("workDate")?.value,start=document.getElementById("startTime")?.value,end=document.getElementById("endTime")?.value;
 if(!ids.length){notify("Select at least one muscle group.");return}
 if(!isValidDateString(date)){notify("Choose a valid workout date.");return}
 if(!start){notify("Enter a start time.");return}
 if(end && end===start){notify("End time must be different from start time.");return}
 const validMuscles=ids.filter(id=>state.muscles.some(m=>m.id===id));
 workoutDraft.date=date;workoutDraft.startTime=start;workoutDraft.endTime=end;workoutDraft.muscles=validMuscles;
 workoutDraft.exercises=(workoutDraft.exercises||[]).filter(e=>validMuscles.some(mid=>state.exercises.some(x=>x.id===e.exerciseId&&x.muscleId===mid)));
 state.activeWorkout={date,startTime:start,endTime:end||"",muscles:validMuscles,unit:workoutDraft.unit,exercises:workoutDraft.exercises};save();
 renderExerciseSelection();
}
function renderExerciseSelection(){
 modal(`<div class="handle"></div><h2>Select Exercises</h2><div class="muted">Exercises are sorted alphabetically. Select the exercises you performed.</div>${workoutDraft.muscles.map(id=>{let ex=sortedExercisesForMuscle(id);return `<div class="field"><div class="section-title">${esc(muscle(id))}</div>${ex.length?ex.map(e=>`<button class="exercise-row exercise-pick pick ${workoutDraft.exercises.some(x=>x.exerciseId===e.id)?"selected":""}" data-exercise="${e.id}" onclick="this.classList.toggle('selected')"><span>${esc(e.name)}</span><span class="pick-plus"><svg class="icon" aria-hidden="true"><use href="#plus"/></svg></span></button>`).join(""):`<div class="empty">No exercises in this group.</div>`}</div>`}).join("")}<div class="modal-actions"><button class="primary btn-wide" onclick="continueToSetDetails()">Next: Enter Weight & Reps</button><button class="outline btn-wide" onclick="openWorkout(workoutDraft.muscles,workoutDraft.date,true)">Back</button></div>`)
}
function continueToSetDetails(){
 const ids=[...document.querySelectorAll("[data-exercise].selected")].map(x=>x.dataset.exercise).filter(id=>state.exercises.some(e=>e.id===id));
 if(!ids.length){notify("Select at least one exercise.");return}
 const previous=new Map((workoutDraft.exercises||[]).map(e=>[e.exerciseId,e]));
 workoutDraft.exercises=ids.map(id=>previous.get(id)||{exerciseId:id,sets:[{weight:"",reps:""}]});
 state.activeWorkout={...state.activeWorkout,endTime:workoutDraft.endTime||state.activeWorkout?.endTime||"",exercises:workoutDraft.exercises};save();renderSetDetails();
}
function renderSetDetails(){
 const selectedNames=workoutDraft.exercises.map(e=>state.exercises.find(x=>x.id===e.exerciseId)?.name||"Deleted exercise");
 modal(`<div class="handle"></div><h2>Enter Workout Details</h2><div class="muted">Add the weight and reps for each set.</div><div class="field unit-field"><label>Weight unit</label><div class="segment"><button class="unit-btn ${workoutDraft.unit==='kg'?'active':''}" onclick="setWorkoutUnit('kg')">kg</button><button class="unit-btn ${workoutDraft.unit==='lb'?'active':''}" onclick="setWorkoutUnit('lb')">lb</button></div></div>${workoutDraft.exercises.map((entry,i)=>{const name=selectedNames[i];return `<div class="set-editor card pad"><div class="set-editor-head"><strong>${esc(name)}</strong></div><div id="sets-${i}">${entry.sets.map((set,j)=>setRow(i,j,set)).join("")}</div><button class="add-set" onclick="addSet(${i})"><svg class="icon"><use href="#plus"/></svg> Add Set</button></div>`}).join("")}<div class="modal-actions"><button class="primary btn-wide" onclick="saveWorkout()">Complete Workout</button><button class="outline btn-wide" onclick="renderExerciseSelection()">Back</button></div>`)
}
function setRow(exIndex,setIndex,set){const remove=workoutDraft.exercises[exIndex].sets.length>1?`<button class="remove-set" aria-label="Remove set" onclick="removeSet(${exIndex},${setIndex})"><svg class="icon"><use href="#close"/></svg></button>`:`<span class="remove-placeholder"></span>`;return `<div class="set-row"><span class="set-number">${setIndex+1}</span><label class="set-field"><span>Weight</span><input class="input compact" type="number" min="0" step="0.1" value="${esc(set.weight??"")}" oninput="updateSet(${exIndex},${setIndex},'weight',this.value)"></label><label class="set-field"><span>Reps</span><input class="input compact" type="number" min="1" step="1" value="${esc(set.reps??"")}" oninput="updateSet(${exIndex},${setIndex},'reps',this.value)"></label>${remove}</div>`}
function updateSet(i,j,k,v){if(workoutDraft.exercises[i]?.sets[j])workoutDraft.exercises[i].sets[j][k]=v}
function addSet(i){workoutDraft.exercises[i].sets.push({weight:"",reps:""});renderSetDetails()}
function removeSet(i,j){if(workoutDraft.exercises[i].sets.length>1)workoutDraft.exercises[i].sets.splice(j,1);renderSetDetails()}
function setWorkoutUnit(unit){if(unit!==workoutDraft.unit){let f=workoutDraft.unit==="kg"?2.2046226218:0.45359237;workoutDraft.exercises.forEach(e=>e.sets.forEach(s=>{if(s.weight!=="")s.weight=String(Math.round(Number(s.weight)*f*100)/100)}));workoutDraft.unit=unit}renderSetDetails()}

function saveWorkout(){
 const date=workoutDraft.date,muscles=[...new Set(workoutDraft.muscles)].filter(id=>state.muscles.some(m=>m.id===id)),exercises=workoutDraft.exercises.filter(e=>state.exercises.some(x=>x.id===e.exerciseId));
 if(!muscles.length||!isValidDateString(date)||!workoutDraft.startTime){notify("Complete the workout date, start time and muscle groups.");return}
 if(!workoutDraft.endTime){notify("Enter the end time to complete the workout.");return}
 let startMinutes=Number(workoutDraft.startTime.split(":")[0])*60+Number(workoutDraft.startTime.split(":")[1]);
 let endMinutes=Number(workoutDraft.endTime.split(":")[0])*60+Number(workoutDraft.endTime.split(":")[1]);
 if(endMinutes===startMinutes){notify("Start and end time cannot be the same.");return}
 if(!exercises.length){notify("Select at least one exercise.");return}
 for(const e of exercises)for(const s of e.sets||[]){let weight=Number(s.weight),reps=Number(s.reps);if(s.weight===""||!Number.isFinite(weight)||weight<0||s.reps===""||!Number.isInteger(reps)||reps<1){notify("Enter valid weight and reps for every set.");return}}
 let record={id:state.activeWorkout?.id||newId(),date,muscles,startTime:workoutDraft.startTime,endTime:workoutDraft.endTime,unit:workoutDraft.unit,exercises:exercises.map(e=>({exerciseId:e.exerciseId,sets:e.sets.map(s=>({weight:Number(s.weight),reps:Number(s.reps)})),unit:workoutDraft.unit})),createdAt:Date.now()};
 let old=record.id&&state.workouts.find(w=>w.id===record.id);if(old)Object.assign(old,record);else state.workouts.push(record);
 delete state.activeWorkout;save();selected=new Date(date+"T00:00:00");selectedWeekStart=weekStart(selected);workoutDraft={date:"",muscles:[],exercises:[],unit:"kg",startTime:"",endTime:""};closeModal();go("home");
}
function workoutSignature(w){const muscles=[...(w.muscles||[])].sort();const exercises=(w.exercises||[]).map(e=>normalizedEntry(e,w.unit||"kg")).sort((a,b)=>a.exerciseId.localeCompare(b.exerciseId));return JSON.stringify({date:w.date,muscles,exercises})}
function normalizedEntry(entry,fallbackUnit="kg"){if(typeof entry==="string")return {exerciseId:entry,sets:[],unit:fallbackUnit};const e=entry||{exerciseId:"",sets:[]};return {...e,unit:e.unit||fallbackUnit}}
function formatSet(set,unit){return `${Number(set.weight)} ${unit||"kg"} · ${Number(set.reps)} reps`}
function viewWorkout(id){let w=state.workouts.find(x=>x.id===id);if(!w)return;let entries=(w.exercises||[]).map(e=>normalizedEntry(e,w.unit||"kg"));modal(`<div class="handle"></div><h2>${esc(w.muscles.map(muscle).join(" + "))}</h2><div class="muted">${new Date(w.date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · ${formatTime(w.startTime)} – ${formatTime(w.endTime)} · ${durationLabel(durationMinutes(w))}</div>${entries.map(e=>{let ex=state.exercises.find(x=>x.id===e.exerciseId);return `<div class="workout-detail card"><strong>${esc(ex?.name||"Deleted exercise")}</strong>${(e.sets||[]).map((s,i)=>`<div class="detail-set"><span>Set ${i+1}</span><span>${esc(formatSet(s,e.unit))}</span></div>`).join("")}</div>`}).join("")}<div class="modal-actions"><button class="outline btn-wide" onclick="deleteWorkout('${w.id}')">Delete Workout</button><button class="primary btn-wide" onclick="closeModal()">Done</button></div>`)}
function deleteWorkout(id){confirmAction("Delete this workout?",()=>{state.workouts=state.workouts.filter(w=>w.id!==id);save();closeModal();renderCalendar();renderHome()})}
