let recycleState={search:"",filter:"all",sort:"newest"};

function driveAfterBinChange(){
 if(typeof hasCompletedWorkouts==="function"&&hasCompletedWorkouts(state)&&typeof driveAfterWorkoutChange==="function"){
  driveAfterWorkoutChange();
  return;
 }
 if(typeof driveAfterLibraryChange==="function")driveAfterLibraryChange();
}

function binDaysLeft(deletedAt){
 const end=Number(deletedAt)+BIN_KEEP_MS;
 return Math.max(0,Math.ceil((end-Date.now())/86400000));
}
function binDeletedLabel(deletedAt){
 const days=Math.floor((Date.now()-Number(deletedAt))/86400000);
 if(days<=0)return "Deleted today";
 if(days===1)return "Deleted yesterday";
 return `Deleted ${days} days ago`;
}
function binMetaLine(deletedAt){
 const left=binDaysLeft(deletedAt);
 const keep=left===1?"1 day left":`${left} days left`;
 return `${binDeletedLabel(deletedAt)} · ${keep}`;
}

function binWorkoutTitle(w){
 return workoutMuscleLabel(w);
}
function binWorkoutWhen(w){
 if(typeof workoutCardDate==="function")return workoutCardDate(w);
 if(!w.date||!isValidDateString(w.date))return "";
 const d=new Date(w.date+"T00:00:00");
 const weekday=d.toLocaleDateString("en-IN",{weekday:"long"});
 const month=d.toLocaleDateString("en-IN",{month:"long"});
 return `${weekday}, ${d.getDate()} ${month} ${d.getFullYear()}`;
}

function recycleItems(){
 ensureBin(state);
 const q=recycleState.search.trim().toLowerCase();
 const workouts=(state.bin.workouts||[]).map(item=>({kind:"workout",item,title:binWorkoutTitle(item),meta:binWorkoutWhen(item),search:`${binWorkoutTitle(item)} ${item.date||""}`}));
 const muscles=(state.bin.muscles||[]).map(item=>{
  const n=(item.exercises||[]).length;
  const exNames=(item.exercises||[]).map(e=>e.name).join(" ");
  return {kind:"muscle",item,title:item.name||"Muscle group",meta:n===1?"1 exercise":`${n} exercises`,search:`${item.name||""} ${exNames}`};
 });
 const exercises=(state.bin.exercises||[]).map(item=>{
  const group=state.muscles.find(m=>m.id===item.muscleId)?.name||item.muscleName||"Unknown";
  return {kind:"exercise",item,title:item.name||"Exercise",meta:group,search:`${item.name||""} ${group}`};
 });
 let rows=[];
 if(recycleState.filter==="all"||recycleState.filter==="workouts")rows=rows.concat(workouts);
 if(recycleState.filter==="all"||recycleState.filter==="muscles")rows=rows.concat(muscles);
 if(recycleState.filter==="all"||recycleState.filter==="exercises")rows=rows.concat(exercises);
 if(q)rows=rows.filter(r=>r.search.toLowerCase().includes(q));
 rows.sort((a,b)=>{
  const ad=Number(a.item.deletedAt)||0;
  const bd=Number(b.item.deletedAt)||0;
  if(recycleState.sort==="oldest")return ad-bd;
  if(recycleState.sort==="expiring")return binDaysLeft(ad)-binDaysLeft(bd);
  return bd-ad;
 });
 return rows;
}

function recycleChip(id,label){
 return `<button type="button" class="exercise-chip ${recycleState.filter===id?"active":""}" onclick="setRecycleFilter('${id}')">${label}</button>`;
}

function recycleCard(row){
 const id=esc(row.item.id);
 const restore=row.kind==="workout"?`restoreBinWorkout('${id}')`:row.kind==="muscle"?`restoreBinMuscle('${id}')`:`restoreBinExercise('${id}')`;
 const remove=row.kind==="workout"?`dropBinWorkout('${id}')`:row.kind==="muscle"?`dropBinMuscle('${id}')`:`dropBinExercise('${id}')`;
 const meta=row.meta?`<span class="recycle-meta">${esc(row.meta)}</span>`:"";
 return `<div class="recycle-card card">
  <div class="recycle-card-copy">
   <strong class="recycle-title">${esc(row.title)}</strong>
   ${meta}
   <span class="recycle-age">${esc(binMetaLine(row.item.deletedAt))}</span>
  </div>
  <div class="recycle-card-actions">
   <button class="recycle-icon-btn restore" type="button" aria-label="Restore" onclick="${restore}"><svg class="icon" aria-hidden="true"><use href="#restore"/></svg></button>
   <button class="recycle-icon-btn delete" type="button" aria-label="Delete forever" onclick="${remove}"><svg class="icon" aria-hidden="true"><use href="#trash"/></svg></button>
  </div>
 </div>`;
}

function recycleEmptyHtml(){
 const bin=state.bin||emptyBin();
 const hasAny=(bin.workouts||[]).length+(bin.muscles||[]).length+(bin.exercises||[]).length;
 const hint=hasAny?"Try another search or filter.":"Deleted workouts and exercises stay here for 30 days.";
 return `<div class="exercise-screen-panel card exercise-screen-empty"><svg class="icon" aria-hidden="true"><use href="#trash"/></svg><strong>No deleted items</strong><span>${hint}</span></div>`;
}

function recycleListHtml(){
 const rows=recycleItems();
 return rows.length?rows.map(recycleCard).join(""):recycleEmptyHtml();
}

function renderRecycleToolbar(){
 return `
  <div class="exercise-screen-toolbar">
   <label class="exercise-search">
    <svg class="icon" aria-hidden="true"><use href="#search"/></svg>
    <input id="recycleSearch" type="search" value="${esc(recycleState.search)}" placeholder="Search deleted items" autocomplete="off" oninput="setRecycleSearch(this.value)">
   </label>
   <button type="button" class="exercise-filter-button" onclick="openRecycleFilter()">
    <svg class="icon" aria-hidden="true"><use href="#filter"/></svg><span>Filter</span>
   </button>
  </div>
  <div class="exercise-chip-scroller" role="tablist" aria-label="Deleted item types">${recycleChip("all","All")}${recycleChip("exercises","Exercises")}${recycleChip("muscles","Muscle groups")}${recycleChip("workouts","Workouts")}</div>`;
}

function refreshRecycleList(){
 const list=document.getElementById("recycleList");
 if(!list){renderRecycle();return}
 list.innerHTML=recycleListHtml();
}

function renderRecycle(){
 const host=document.getElementById("recycleView");
 if(!host)return;
 ensureBin(state);
 host.innerHTML=`${renderRecycleToolbar()}<div id="recycleList" class="recycle-list">${recycleListHtml()}</div>`;
}

function setRecycleSearch(value){
 recycleState.search=value||"";
 refreshRecycleList();
}
function setRecycleFilter(filter){
 recycleState.filter=filter||"all";
 renderRecycle();
}
function recycleSortOption(id,label){
 const selected=recycleState.sort===id;
 return `<button type="button" data-recycle-sort="${id}" class="${selected?"chosen":""}" onclick="setRecycleSort('${id}')"><span>${label}</span>${selected?'<em><svg class="icon" aria-hidden="true"><use href="#check"/></svg></em>':""}</button>`;
}
function openRecycleFilter(){
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">Filter Recycle Bin</h2>
   <div class="muted workout-form-description">Choose how to sort deleted items.</div>
  </div>
  <div class="workout-entry-scroll">
   <div class="week-list exercise-history-filter-list">
    ${recycleSortOption("newest","Newest first")}
    ${recycleSortOption("oldest","Oldest first")}
    ${recycleSortOption("expiring","Expiring soon")}
   </div>
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" onclick="applyRecycleFilter()">Done</button>
  </div>
 `,"workout-entry-sheet exercise-filter-sheet");
 document.body.classList.add("workout-form-open");
}
function setRecycleSort(sort){
 recycleState.sort=sort||"newest";
 document.querySelectorAll("[data-recycle-sort]").forEach(btn=>{
  const on=btn.dataset.recycleSort===recycleState.sort;
  btn.classList.toggle("chosen",on);
  const check=btn.querySelector("em");
  if(on&&!check){
   btn.insertAdjacentHTML("beforeend",'<em><svg class="icon" aria-hidden="true"><use href="#check"/></svg></em>');
  }else if(!on&&check){
   check.remove();
  }
 });
}
function applyRecycleFilter(){
 closeModal();
 renderRecycle();
}

function restoreBinWorkout(id){
 ensureBin(state);
 const item=state.bin.workouts.find(w=>w.id===id);
 if(!item)return;
 if(state.workouts.some(w=>w.id===id)){notify("That workout is already in your history.");return}
 if(item.date&&workoutOnDate(item.date)){notify(dateTakenMessage());return}
 confirmAction("Restore this workout to your history?",()=>{
  const next=JSON.parse(JSON.stringify(item));
  delete next.deletedAt;
  delete next.muscleNames;
  if(next.date&&workoutOnDate(next.date,next.id)){notify(dateTakenMessage());return}
  state.workouts.push(next);
  state.bin.workouts=state.bin.workouts.filter(w=>w.id!==id);
  save();
  driveAfterBinChange();
  closeModal();
  refreshAppViews();
  notify("Workout restored.","success");
 },true);
}
function dropBinWorkout(id){
 confirmAction("Delete this workout forever? This cannot be undone.",()=>{
  ensureBin(state);
  state.bin.workouts=state.bin.workouts.filter(w=>w.id!==id);
  save();
  driveAfterBinChange();
  closeModal();
  renderRecycle();
 },true);
}

function restoreBinMuscle(id){
 ensureBin(state);
 const item=state.bin.muscles.find(m=>m.id===id);
 if(!item)return;
 const original=(item.name||"").trim()||"Muscle group";
 const clash=state.muscles.some(m=>m.id!==id&&m.name.toLowerCase()===original.toLowerCase());
 const name=clash?uniqueRestoredName(original,state.muscles.map(m=>m.name)):original;
 const message=clash
  ?`A muscle group named ${original} already exists. Restore this one as ${name}? Your current ${original} stays as it is.`
  :"Restore this muscle group and its exercises?";
 confirmAction(message,()=>{
  ensureBin(state);
  const current=state.bin.muscles.find(m=>m.id===id);
  if(!current)return;
  if(!state.muscles.some(m=>m.id===id))state.muscles.push({id:current.id,name});
  (current.exercises||[]).forEach(e=>{
   if(!state.exercises.some(x=>x.id===e.id))state.exercises.push({id:e.id,name:e.name,muscleId:e.muscleId||id});
  });
  state.bin.muscles=state.bin.muscles.filter(m=>m.id!==id);
  save();
  driveAfterBinChange();
  closeModal();
  renderRecycle();
  renderLibrary();
  renderExercises();
  notify("Muscle group restored.","success");
 },true);
}
function dropBinMuscle(id){
 confirmAction("Delete this muscle group forever? This cannot be undone.",()=>{
  ensureBin(state);
  state.bin.muscles=state.bin.muscles.filter(m=>m.id!==id);
  save();
  driveAfterBinChange();
  closeModal();
  renderRecycle();
 },true);
}

function restoreBinExercise(id){
 ensureBin(state);
 const item=state.bin.exercises.find(e=>e.id===id);
 if(!item)return;
 if(!state.muscles.some(m=>m.id===item.muscleId)){
  notify("Restore the muscle group first.");
  return;
 }
 if(state.exercises.some(e=>e.id===id)){notify("That exercise is already in your library.");return}
 const original=(item.name||"").trim()||"Exercise";
 const inGroup=state.exercises.filter(e=>e.muscleId===item.muscleId);
 const clash=inGroup.some(e=>e.name.toLowerCase()===original.toLowerCase());
 const name=clash?uniqueRestoredName(original,inGroup.map(e=>e.name)):original;
 const message=clash
  ?`An exercise named ${original} already exists in this muscle group. Restore this one as ${name}? Your current ${original} stays as it is.`
  :"Restore this exercise to your library?";
 confirmAction(message,()=>{
  ensureBin(state);
  const current=state.bin.exercises.find(e=>e.id===id);
  if(!current)return;
  if(!state.muscles.some(m=>m.id===current.muscleId)){notify("Restore the muscle group first.");return}
  if(state.exercises.some(e=>e.id===id)){notify("That exercise is already in your library.");return}
  state.exercises.push({id:current.id,name,muscleId:current.muscleId});
  state.bin.exercises=state.bin.exercises.filter(e=>e.id!==id);
  save();
  driveAfterBinChange();
  closeModal();
  renderRecycle();
  renderLibrary();
  renderExercises();
  notify("Exercise restored.","success");
 },true);
}
function dropBinExercise(id){
 confirmAction("Delete this exercise forever? This cannot be undone.",()=>{
  ensureBin(state);
  state.bin.exercises=state.bin.exercises.filter(e=>e.id!==id);
  save();
  driveAfterBinChange();
  closeModal();
  renderRecycle();
 },true);
}

function emptyRecycleBin(){
 ensureBin(state);
 const n=state.bin.workouts.length+state.bin.exercises.length+state.bin.muscles.length;
 if(!n){notify("Recycle Bin is already empty.");return}
 confirmAction("Empty Recycle Bin? Everything here will be deleted forever and cannot be undone.",()=>{
  state.bin=emptyBin();
  save();
  driveAfterBinChange();
  closeModal();
  renderRecycle();
 },true);
}

function moveWorkoutToBin(id){
 ensureBin(state);
 const w=state.workouts.find(x=>x.id===id);
 if(!w)return;
 const copy=JSON.parse(JSON.stringify(w));
 copy.deletedAt=Date.now();
 copy.muscleNames=workoutMuscleNames(w);
 state.bin.workouts.unshift(copy);
 state.workouts=state.workouts.filter(x=>x.id!==id);
}
function moveExerciseToBin(id){
 ensureBin(state);
 const e=state.exercises.find(x=>x.id===id);
 if(!e)return;
 const copy=JSON.parse(JSON.stringify(e));
 copy.deletedAt=Date.now();
 copy.muscleName=state.muscles.find(m=>m.id===e.muscleId)?.name||"";
 state.bin.exercises.unshift(copy);
 state.exercises=state.exercises.filter(x=>x.id!==id);
}
function moveMuscleToBin(id){
 ensureBin(state);
 const m=state.muscles.find(x=>x.id===id);
 if(!m)return;
 const exercises=state.exercises.filter(e=>e.muscleId===id).map(e=>JSON.parse(JSON.stringify(e)));
 state.bin.muscles.unshift({id:m.id,name:m.name,exercises,deletedAt:Date.now()});
 state.muscles=state.muscles.filter(x=>x.id!==id);
 state.exercises=state.exercises.filter(e=>e.muscleId!==id);
}
