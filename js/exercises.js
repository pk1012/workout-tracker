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
let exerciseHistoryUi={id:"",view:"list",zoom:"day"};

function exerciseMuscleName(exercise){
 const live=state.muscles.find(m=>m.id===exercise.muscleId)?.name;
 if(live)return live;
 if(exercise.muscleName)return exercise.muscleName;
 return muscleNameFromState(state,exercise.muscleId)||"";
}
function heaviestSet(sets){
 const valid=(sets||[]).filter(s=>Number.isFinite(Number(s?.weight))&&Number.isFinite(Number(s?.reps)));
 if(!valid.length)return null;
 return valid.reduce((best,s)=>Number(s.weight)>Number(best.weight)?s:best);
}
function formatExerciseLoad(weight,fromUnit){
 const n=Number(displayWeight(weight,fromUnit));
 if(n===0)return "Bodyweight";
 const text=Number.isInteger(n)?String(n):String(Math.round(n*10)/10);
 return `${text} ${preferredUnit()}`;
}
function goneExerciseMuscleId(id){
 const known=typeof exerciseMuscleId==="function"?exerciseMuscleId(id):"";
 if(known)return known;
 for(const w of state.workouts||[]){
  if(!(w.exercises||[]).some(raw=>exerciseIdOf(raw)===id))continue;
  const gone=(w.muscles||[]).filter(mid=>!(state.muscles||[]).some(m=>m.id===mid));
  if(gone.length)return gone[0];
  return (w.muscles||[])[0]||"";
 }
 return "";
}
function goneExerciseMuscleName(id,muscleId){
 const fromState=muscleNameFromState(state,muscleId);
 if(fromState)return fromState;
 for(const w of state.workouts||[]){
  if(!(w.exercises||[]).some(raw=>exerciseIdOf(raw)===id))continue;
  const i=(w.muscles||[]).indexOf(muscleId);
  const kept=i>=0&&typeof w.muscleNames?.[i]==="string"?w.muscleNames[i].trim():"";
  if(kept&&kept!=="Unknown")return kept;
 }
 return "";
}
function exerciseScreenCatalog(){
 const live=(state.exercises||[]).map(e=>({id:e.id,name:e.name,muscleId:e.muscleId,muscleName:"",gone:false}));
 const seen=new Set(live.map(e=>e.id));
 const gone=[];
 for(const w of state.workouts||[]){
  for(const raw of w.exercises||[]){
   const id=exerciseIdOf(raw);
   if(!id||seen.has(id))continue;
   seen.add(id);
   const muscleId=goneExerciseMuscleId(id);
   gone.push({id,name:workoutExerciseName(raw),muscleId,muscleName:goneExerciseMuscleName(id,muscleId),gone:true});
  }
 }
 return live.concat(gone);
}
function exerciseSessionHistory(exerciseId){
 const history=[];
 for(const workout of state.workouts||[]){
  for(const raw of workout.exercises||[]){
   const entry=normalizedEntry(raw,workout.unit||"kg");
   if(entry.exerciseId!==exerciseId)continue;
   history.push({workout,entry,heavy:heaviestSet(entry.sets)});
  }
 }
 history.sort((a,b)=>{
  const d=(b.workout.date||"").localeCompare(a.workout.date||"");
  return d||(Number(b.workout.createdAt)||0)-(Number(a.workout.createdAt)||0);
 });
 return history;
}
function exerciseProgressLadder(sessionsNewestFirst){
 const to=preferredUnit();
 const steps=[...sessionsNewestFirst].reverse().map(s=>{
  if(!s.heavy)return null;
  const from=s.entry.unit||s.workout.unit||"kg";
  const n=Number(displayWeight(s.heavy.weight,from));
  return {n,unit:to,body:Number(s.heavy.weight)===0};
 }).filter(Boolean);
 if(!steps.length)return "";
 const parts=steps.map(s=>{
  if(s.body)return "Bodyweight";
  const text=Number.isInteger(s.n)?String(s.n):String(s.n);
  return text;
 });
 const joined=parts.join(" → ");
 if(steps.some(s=>!s.body))return `${joined} ${to}`;
 return joined;
}

function exerciseCategoryMatches(exercise,filter){
 if(filter==="All")return true;
 const group=exerciseMuscleName(exercise).toLowerCase();
 if(filter==="Arms")return group==="biceps"||group==="triceps"||group==="forearms";
 if(filter==="Core")return group==="abs"||group==="core";
 return group===filter.toLowerCase();
}

function exerciseHistory(exerciseId){
 const latest=exerciseSessionHistory(exerciseId).find(s=>s.heavy);
 if(!latest)return null;
 return {
  date:latest.workout.date||"",
  createdAt:Number(latest.workout.createdAt)||0,
  unit:latest.entry.unit||latest.workout.unit||"kg",
  set:latest.heavy
 };
}

function exerciseDisplayWeight(history){
 if(!history)return "No history";
 return formatExerciseLoad(history.set.weight,history.unit||"kg");
}

function exerciseDisplayDate(history){
 if(!history?.date)return "";
 return new Date(`${history.date}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}

function exerciseScreenItems(){
 const search=exerciseScreenState.search.trim().toLowerCase();
 return exerciseScreenCatalog()
  .filter(e=>exerciseCategoryMatches(e,exerciseScreenState.filter))
  .filter(e=>!search||e.name.toLowerCase().includes(search)||exerciseMuscleName(e).toLowerCase().includes(search))
  .map(e=>{
   const latest=exerciseHistory(e.id);
   return {exercise:e,history:latest};
  })
  .filter(({history})=>{
   if(exerciseScreenState.historyFilter==="logged")return !!history;
   if(exerciseScreenState.historyFilter==="never")return !history;
   return true;
  })
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

function renderExerciseScreenRows(items){
 if(!items.length){
  return `<div class="exercise-screen-panel card exercise-screen-empty"><svg class="icon" aria-hidden="true"><use href="#dumbbell"/></svg><strong>No exercises found</strong><span>Try another search or filter.</span></div>`;
 }
 return `<div class="exercise-screen-panel card">${items.map(({exercise,history})=>`
  <button type="button" class="exercise-screen-row${exercise.gone?" library-gone":""}" onclick="openExerciseHistory('${esc(exercise.id)}')">
   <span class="exercise-screen-name">${esc(exercise.name)}</span>
   <span class="exercise-screen-side">
    <span class="exercise-screen-chart" aria-hidden="true"><svg class="icon"><use href="#chart"/></svg></span>
    <span class="exercise-screen-stats">
     <strong>${history?esc(exerciseDisplayWeight(history)):"—"}</strong>
     <span>${history?esc(exerciseDisplayDate(history)):"No history"}</span>
    </span>
   </span>
  </button>
 `).join("")}</div>`;
}

function renderExerciseScreenToolbar(){
 return `
  <div class="exercise-screen-toolbar">
   <label class="exercise-search">
    <svg class="icon" aria-hidden="true"><use href="#search"/></svg>
    <input id="exerciseSearch" type="search" value="${esc(exerciseScreenState.search)}" placeholder="Search exercises" autocomplete="off" oninput="setExerciseSearch(this.value)">
   </label>
   <button type="button" class="exercise-filter-button" onclick="openExerciseFilter()">
    <svg class="icon" aria-hidden="true"><use href="#filter"/></svg><span>Filter</span>
   </button>
  </div>
  <div class="exercise-chip-scroller" role="tablist" aria-label="Exercise muscle groups">${exerciseCategoryButtons()}</div>`;
}

function refreshExerciseScreenRows(){
 const rows=document.getElementById("exerciseScreenRows");
 if(!rows){renderExercises();return}
 rows.innerHTML=renderExerciseScreenRows(exerciseScreenItems());
}

function renderExercises(){
 const target=document.getElementById("exerciseList");
 if(!target)return;
 target.innerHTML=`${renderExerciseScreenToolbar()}<div id="exerciseScreenRows">${renderExerciseScreenRows(exerciseScreenItems())}</div>`;
}

function setExerciseSearch(value){
 exerciseScreenState.search=value;
 refreshExerciseScreenRows();
}

function setExerciseFilter(filter){
 exerciseScreenState.filter=filter;
 renderExercises();
}

function exerciseHistoryFilterOption(id,label){
 const selected=exerciseScreenState.historyFilter===id;
 return `<button type="button" data-history-filter="${id}" class="${selected?"chosen":""}" onclick="setExerciseHistoryFilter('${id}')"><span>${label}</span>${selected?'<em><svg class="icon" aria-hidden="true"><use href="#check"/></svg></em>':""}</button>`;
}

function openExerciseFilter(){
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">Filter Exercises</h2>
   <div class="muted workout-form-description">Choose which exercise history to show.</div>
  </div>
  <div class="workout-entry-scroll">
   <div class="week-list exercise-history-filter-list">
    ${exerciseHistoryFilterOption("all","All exercises")}
    ${exerciseHistoryFilterOption("logged","Logged exercises")}
    ${exerciseHistoryFilterOption("never","Never logged")}
   </div>
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="applyExerciseHistoryFilter()">Done</button>
  </div>
 `,"workout-entry-sheet exercise-filter-sheet");
 document.body.classList.add("workout-form-open");
}

function setExerciseHistoryFilter(filter){
 exerciseScreenState.historyFilter=filter;
 document.querySelectorAll("[data-history-filter]").forEach(btn=>{
  const on=btn.dataset.historyFilter===filter;
  btn.classList.toggle("chosen",on);
  const check=btn.querySelector("em");
  if(on&&!check){
   btn.insertAdjacentHTML("beforeend",'<em><svg class="icon" aria-hidden="true"><use href="#check"/></svg></em>');
  }else if(!on&&check){
   check.remove();
  }
 });
}

function applyExerciseHistoryFilter(){
 closeModal();
 renderExercises();
}

function graphWeightText(n){
 const x=Number(n);
 if(!Number.isFinite(x))return "";
 return Number.isInteger(x)?String(x):String(Math.round(x*10)/10);
}
function graphDayLabel(date){
 const d=new Date(`${date}T00:00:00`);
 const day=d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
 return `${day} ${String(d.getFullYear()).slice(-2)}`;
}
function graphMonthLabel(d){
 return `${d.toLocaleDateString("en-IN",{month:"short"})} ${String(d.getFullYear()).slice(-2)}`;
}
function exerciseWeightedPoints(sessionsNewestFirst){
 const to=preferredUnit();
 const byDate=new Map();
 for(const s of sessionsNewestFirst||[]){
  if(!s?.heavy||Number(s.heavy.weight)===0)continue;
  const date=s.workout?.date||"";
  if(!date)continue;
  const from=s.entry?.unit||s.workout?.unit||"kg";
  const n=Number(displayWeight(s.heavy.weight,from));
  if(!Number.isFinite(n)||n<=0)continue;
  const prev=byDate.get(date);
  if(!prev||n>prev.n)byDate.set(date,{date,n,unit:to});
 }
 return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function exerciseGraphBuckets(points,zoom){
 const list=points||[];
 if(zoom==="day")return list.map(p=>({key:p.date,n:p.n,label:graphDayLabel(p.date)}));
 const map=new Map();
 for(const p of list){
  const d=new Date(`${p.date}T00:00:00`);
  if(Number.isNaN(d.getTime()))continue;
  let key="",label="";
  if(zoom==="week"){
   const start=weekStart(d);
   key=dateKey(start);
   label=rangeLabel(start);
  }else if(zoom==="month"){
   key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
   label=graphMonthLabel(d);
  }else{
   key=String(d.getFullYear());
   label=key;
  }
  const prev=map.get(key);
  if(!prev||p.n>prev.n)map.set(key,{key,n:p.n,label});
 }
 return [...map.values()].sort((a,b)=>a.key.localeCompare(b.key));
}
function exerciseGraphAxisLabel(label){
 const parts=String(label||"").split(" – ");
 if(parts.length===2){
  return `<tspan x="0" dy="0">${esc(parts[0])}</tspan><tspan x="0" dy="11">${esc(parts[1])}</tspan>`;
 }
 return esc(label);
}
function exerciseGraphSvg(buckets,zoom,plotH){
 const slot=zoom==="week"?112:zoom==="month"?68:zoom==="year"?56:100;
 const h=Math.max(220,Math.floor(plotH||228));
 const padT=Math.round(h*0.3);
 const padL=40,padR=40,padB=zoom==="week"?54:44;
 const innerMin=200;
 const w=Math.max(innerMin+padL+padR,(buckets.length-1)*slot+padL+padR);
 const innerW=Math.max(innerMin,w-padL-padR);
 const innerH=Math.max(40,h-padT-padB);
 const ns=buckets.map(b=>b.n);
 const min=Math.min(...ns);
 const max=Math.max(...ns);
 const xAt=i=>padL+(buckets.length===1?innerW/2:i*(innerW/Math.max(1,buckets.length-1)));
 const yAt=n=>max===min?padT+innerH/2:padT+((max-n)/(max-min))*innerH;
 const pts=buckets.map((b,i)=>`${xAt(i).toFixed(1)},${yAt(b.n).toFixed(1)}`);
 const line=buckets.length>1?`<polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts.join(" ")}"/>`:"";
 const dots=buckets.map((b,i)=>`<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(b.n).toFixed(1)}" r="4" fill="currentColor"/>`).join("");
 const values=buckets.map((b,i)=>`<text class="graph-dot-label" x="${xAt(i).toFixed(1)}" y="${(yAt(b.n)-10).toFixed(1)}" text-anchor="middle">${esc(graphWeightText(b.n))}</text>`).join("");
 const xLabels=buckets.map((b,i)=>{
  const x=xAt(i).toFixed(1);
  const y=h-padB+22;
  const inner=exerciseGraphAxisLabel(b.label);
  return `<g transform="translate(${x} ${y})"><text class="graph-axis graph-x" text-anchor="middle">${inner}</text></g>`;
 }).join("");
 return `<svg class="exercise-history-plot" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-hidden="true">${line}${dots}${values}${xLabels}</svg>`;
}
function exerciseHistoryListBody(history,unit){
 return history.map(({workout,entry})=>{
  const dateLabel=new Date(`${workout.date}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
  const sets=entry.sets||[];
  const rows=sets.length
   ?sets.map((s,i)=>`<div class="detail-set"><span>Set ${i+1}</span><span>${Number(s.weight)===0?`Bodyweight · ${Number(s.reps)} reps`:esc(formatSet(s,entry.unit||unit))}</span></div>`).join("")
   :`<div class="detail-set"><span>No sets recorded</span></div>`;
  return `<div class="workout-detail card"><strong>${esc(dateLabel)}</strong>${rows}</div>`;
 }).join("");
}
function exerciseHistoryGraphBody(history,zoom){
 const buckets=exerciseGraphBuckets(exerciseWeightedPoints(history),zoom);
 if(!buckets.length){
  return `<div class="card empty-panel"><svg class="icon" aria-hidden="true"><use href="#chart"/></svg><strong>No weighted sets</strong><span>Log a weighted set to see a graph.</span></div>`;
 }
 const zooms=["day","week","month","year"];
 const zoomBar=`<div class="segment exercise-history-zoom">${zooms.map(z=>`<button type="button" class="${zoom===z?"active":""}" onclick="setExerciseHistoryZoom('${z}')">${z[0].toUpperCase()+z.slice(1)}</button>`).join("")}</div>`;
 return `<div class="exercise-history-graph">${zoomBar}<div class="card exercise-history-graph-card" data-zoom="${esc(zoom)}"><div class="exercise-history-graph-plot"><div class="exercise-history-graph-scroll">${exerciseGraphSvg(buckets,zoom)}</div></div></div></div>`;
}
function setExerciseHistoryView(view){
 exerciseHistoryUi.view=view==="graph"?"graph":"list";
 renderExerciseHistorySheet();
}
function setExerciseHistoryZoom(zoom){
 exerciseHistoryUi.zoom=["day","week","month","year"].includes(zoom)?zoom:"day";
 renderExerciseHistorySheet();
}
function openExerciseHistory(id){
 exerciseHistoryUi={id,view:"list",zoom:"day"};
 renderExerciseHistorySheet();
}
function renderExerciseHistorySheet(){
 const id=exerciseHistoryUi.id;
 const exercise=exerciseScreenCatalog().find(e=>e.id===id)||state.exercises.find(e=>e.id===id);
 if(!exercise)return;
 const history=exerciseSessionHistory(id);
 const latest=history[0]?.entry;
 const unit=latest?.unit||history[0]?.workout?.unit||"kg";
 const hasHistory=history.length>0;
 const view=hasHistory&&exerciseHistoryUi.view==="graph"?"graph":"list";
 const zoom=exerciseHistoryUi.zoom;
 const ladder=view==="list"?exerciseProgressLadder(history):"";
 const group=exerciseMuscleName(exercise)||"Unknown";
 const toggle=hasHistory?`<span class="segment exercise-history-view"><button type="button" class="${view==="list"?"active":""}" onclick="setExerciseHistoryView('list')">List</button><button type="button" class="${view==="graph"?"active":""}" onclick="setExerciseHistoryView('graph')">Graph</button></span>`:"";
 const body=!hasHistory
  ?`<div class="card empty-panel"><svg class="icon" aria-hidden="true"><use href="#dumbbell"/></svg><strong>No history</strong><span>Complete this exercise in a workout to see its history.</span></div>`
  :view==="graph"?exerciseHistoryGraphBody(history,zoom):exerciseHistoryListBody(history,unit);
 const fill=!hasHistory||(view==="graph"&&!exerciseWeightedPoints(history).length);
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <div class="exercise-history-head">
    <div class="exercise-history-titles">
     <h2 class="workout-form-title">${esc(exercise.name)}</h2>
     <div class="muted workout-form-description">${esc(group)} · Exercise history</div>
    </div>
    ${toggle}
   </div>
   ${ladder?`<div class="exercise-progress-ladder">${esc(ladder)}</div>`:""}
  </div>
  <div class="workout-entry-scroll${fill?" exercise-history-empty-scroll":""}${view==="graph"?" exercise-history-graph-scroll-host":""}">${body}</div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="closeModal()">Done</button>
  </div>
 `,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
 const pin=el=>{
  if(!el)return;
  const go=()=>{el.scrollLeft=el.scrollWidth};
  go();
  requestAnimationFrame(go);
 };
 pin(document.querySelector(".exercise-progress-ladder"));
 layoutExerciseHistoryGraph();
}
function layoutExerciseHistoryGraph(){
 const run=()=>{
  const scroll=document.querySelector(".exercise-history-graph-scroll");
  if(!scroll)return;
  const h=Math.max(220,Math.floor(scroll.clientHeight||0));
  const history=exerciseSessionHistory(exerciseHistoryUi.id);
  const zoom=exerciseHistoryUi.zoom;
  const buckets=exerciseGraphBuckets(exerciseWeightedPoints(history),zoom);
  if(buckets.length)scroll.innerHTML=exerciseGraphSvg(buckets,zoom,h);
  scroll.scrollLeft=scroll.scrollWidth;
 };
 run();
 requestAnimationFrame(run);
}

/* Exercise Library / Settings management */
function renderLibrary(){
 const target=document.getElementById("library");
 if(!target)return;
 target.innerHTML=sortedMuscles().map(m=>{
  const ex=sortedExercisesForMuscle(m.id);
  return `<div class="section card pad library-group"><div class="row"><div class="section-title">${esc(m.name)}</div><div class="actions"><button class="edit" type="button" aria-label="Edit" onclick="openMuscle('${m.id}')">-</button><button class="delete" type="button" aria-label="Delete" onclick="deleteMuscle('${m.id}')">-</button></div></div>${ex.length?ex.map(e=>`<div class="exercise-row"><span>${esc(e.name)}</span><span class="actions"><button class="edit" type="button" aria-label="Edit" onclick="openExercise('${e.id}')">-</button><button class="delete" type="button" aria-label="Delete" onclick="deleteExercise('${e.id}')">-</button></span></div>`).join(""):`<div class="empty">No exercises in this group.</div>`}</div>`;
 }).join("");
}

function workoutsNewestFirst(list){
 return [...list].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(Number(b.createdAt)||0)-(Number(a.createdAt)||0));
}
function workoutsUsingMuscle(id){
 return workoutsNewestFirst((state.workouts||[]).filter(w=>(w.muscles||[]).includes(id)));
}
function workoutsUsingExercise(id){
 return workoutsNewestFirst((state.workouts||[]).filter(w=>(w.exercises||[]).some(raw=>exerciseIdOf(raw)===id)));
}
function confirmHistoryUse(title,used,head,tail,proceed,onCancel){
 const cap=8;
 const shown=used.slice(0,cap);
 const extra=used.length-shown.length;
 const when=w=>{
  if(!w.date||!isValidDateString(w.date))return "Unknown date";
  return new Date(w.date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
 };
 const lines=shown.map(w=>`• ${when(w)} — ${workoutMuscleLabel(w)}`);
 if(extra)lines.push(`• and ${extra} more`);
 pendingConfirm=proceed;
 pendingHistoryBack=typeof onCancel==="function"?onCancel:null;
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <div class="confirm-icon"><svg class="icon"><use href="#info"/></svg></div>
   <h2 class="workout-form-title confirm-title">${esc(title)}</h2>
   <p class="muted workout-form-description confirm-copy">${esc(head)}<br><br>${lines.map(esc).join("<br>")}<br><br>${esc(tail)}</p>
  </div>
  <div class="workout-entry-scroll"></div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="continueHistoryUse()">Continue</button>
   <button class="outline btn-wide workout-cancel-button" onclick="cancelHistoryUse()">Cancel</button>
  </div>
 `,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
}
let pendingHistoryBack=null;
function continueHistoryUse(){
 const fn=pendingConfirm;
 pendingConfirm=null;
 pendingHistoryBack=null;
 closeModal();
 fn&&fn();
}
function cancelHistoryUse(){
 pendingConfirm=null;
 const back=pendingHistoryBack;
 pendingHistoryBack=null;
 if(back)back();
 else closeModal();
}

function openExercise(id="",muscleId="",draftName){
 let e=id?state.exercises.find(x=>x.id===id):null,ms=sortedMuscles();
 const name=draftName!=null?draftName:(e?e.name:"");
 const group=muscleId||(e&&e.muscleId)||"";
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">${e?"Edit Exercise":"Add Exercise"}</h2>
  </div>
  <div class="workout-entry-scroll">
   <div class="field"><label>Exercise name</label><input id="exerciseName" class="input" value="${esc(name)}" placeholder="Exercise name"></div>
   <div class="field"><label>Muscle group</label><select id="exerciseMuscle" class="input">${ms.map(m=>`<option value="${m.id}" ${group===m.id?"selected":""}>${esc(m.name)}</option>`).join("")}</select></div>
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
 const apply=()=>{
  if(id){
   let e=state.exercises.find(x=>x.id===id);if(!e){notify("Exercise not found.");return}
   const fromId=e.muscleId;
   e.name=name;e.muscleId=mid;
   (state.workouts||[]).forEach(w=>{
    w.exercises=(w.exercises||[]).map(raw=>{
     if(exerciseIdOf(raw)!==id)return raw;
     const next=typeof raw==="string"?{exerciseId:raw,sets:[],name}:raw;
     next.name=name;
     if(!next.muscleId)next.muscleId=fromId;
     return next;
    });
   });
  }else state.exercises.push({id:newId(),name,muscleId:mid});
  save();if(typeof driveAfterLibraryChange==="function")driveAfterLibraryChange();closeModal();
  if(document.getElementById("library-management")?.classList.contains("active"))renderLibrary();
  if(document.getElementById("exercises")?.classList.contains("active"))renderExercises();
 };
 if(!id){apply();return}
 const current=state.exercises.find(x=>x.id===id);if(!current){notify("Exercise not found.");return}
 const nameChanged=current.name!==name;
 const groupChanged=current.muscleId!==mid;
 if(!nameChanged&&!groupChanged){apply();return}
 const used=workoutsUsingExercise(id);
 if(!used.length){apply();return}
 const those=used.length===1?"This workout":"These workouts";
 const from=muscle(current.muscleId);
 const to=muscle(mid);
 let title=`Rename “${current.name}”?`;
 let head=`${current.name} has been used in ${used.length} existing workout${used.length===1?"":"s"}:`;
 let tail=`${those} will show “${name}”. Cancel keeps “${current.name}”.`;
 if(nameChanged&&groupChanged){
  title=`Change “${current.name}”?`;
  head=`This exercise has been used in ${used.length} existing workout${used.length===1?"":"s"}:`;
  tail=`${those} will show “${name}” instead of “${current.name}”, still under ${from}. New workouts will use ${to}.`;
 }else if(groupChanged){
  title=`Move “${current.name}”?`;
  head=`This exercise has been used in ${used.length} existing workout${used.length===1?"":"s"}:`;
  tail=`${those} will still show ${from}. New workouts will list it under ${to}.`;
 }else{
  head=`This exercise has been used in ${used.length} existing workout${used.length===1?"":"s"}:`;
  tail=`${those} will show “${name}” instead of “${current.name}”.`;
 }
 confirmHistoryUse(
  title,
  used,
  head,
  tail,
  apply,
  ()=>openExercise(id,mid,name)
 );
}
function deleteExercise(id){
 let e=state.exercises.find(x=>x.id===id);if(!e)return;
 const used=workoutsUsingExercise(id);
 const proceed=()=>{moveExerciseToBin(id);save();if(typeof driveAfterLibraryChange==="function")driveAfterLibraryChange();renderLibrary();renderExercises();};
 if(!used.length){
  confirmAction(`Delete “${e.name}”? It will be deleted from your library.`,proceed,true);
  return;
 }
 confirmHistoryUse(
  `Delete “${e.name}”?`,
  used,
  `This exercise has been used in ${used.length} existing workout${used.length===1?"":"s"}:`,
  `${used.length===1?"This workout":"These workouts"} will still show “${e.name}”. It will be deleted from your library.`,
  proceed
 );
}
function openMuscle(id="",draftName){
 let m=id?state.muscles.find(x=>x.id===id):null;
 const name=draftName!=null?draftName:(m?m.name:"");
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">${m?"Edit Muscle Group":"Add Muscle Group"}</h2>
  </div>
  <div class="workout-entry-scroll">
   <div class="field"><label>Name</label><input id="muscleName" class="input" value="${esc(name)}" placeholder="e.g. Forearms"></div>
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
 const apply=()=>{
  if(id){
   let m=state.muscles.find(x=>x.id===id);if(!m){notify("Muscle group not found.");return}m.name=name;
   (state.workouts||[]).forEach(w=>{
    const ids=w.muscles||[];
    if(!ids.includes(id))return;
    w.muscleNames=workoutMuscleNames(w);
    ids.forEach((mid,i)=>{if(mid===id)w.muscleNames[i]=name});
   });
  }else state.muscles.push({id:newId(),name});
  save();if(typeof driveAfterLibraryChange==="function")driveAfterLibraryChange();closeModal();renderLibrary();renderExercises();
 };
 if(!id){apply();return}
 const current=state.muscles.find(x=>x.id===id);if(!current){notify("Muscle group not found.");return}
 if(current.name===name){apply();return}
 const used=workoutsUsingMuscle(id);
 if(!used.length){apply();return}
 confirmHistoryUse(
  `Rename “${current.name}”?`,
  used,
  `This muscle group has been used in ${used.length} existing workout${used.length===1?"":"s"}:`,
  `${used.length===1?"This workout":"These workouts"} will show “${name}” instead of “${current.name}”.`,
  apply,
  ()=>openMuscle(id,name)
 );
}
function deleteMuscle(id){
 let m=state.muscles.find(x=>x.id===id),n=state.exercises.filter(e=>e.muscleId===id).length;if(!m)return;
 const used=workoutsUsingMuscle(id);
 const proceed=()=>{moveMuscleToBin(id);save();if(typeof driveAfterLibraryChange==="function")driveAfterLibraryChange();renderLibrary();renderExercises();};
 if(!used.length){
  const extra=n===0?"":n===1?" Its 1 exercise will also be deleted from your library.":` Its ${n} exercises will also be deleted from your library.`;
  confirmAction(`Delete “${m.name}”?${n===0?" It will be deleted from your library.":extra}`,proceed,true);
  return;
 }
 confirmHistoryUse(
  `Delete “${m.name}”?`,
  used,
  `This muscle group has been used in ${used.length} existing workout${used.length===1?"":"s"}:`,
  `${used.length===1?"This workout":"These workouts"} will still show “${m.name}”. It will be deleted from your library.`,
  proceed
 );
}
