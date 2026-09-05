/* History page (#progress).
 * This file intentionally touches only #progress / #progressView.
 */
let historyMonth=monthStart(new Date());

function progressWorkoutEntries(){
  return [...state.workouts]
    .sort((a,b)=>{
      const dateDiff=(b.date||"").localeCompare(a.date||"");
      return dateDiff || (b.createdAt||0)-(a.createdAt||0);
    });
}

function progressEntrySets(entry){
  return Array.isArray(entry?.sets) ? entry.sets : [];
}

function historyMonthPrefix(month){
  return dateKey(monthStart(month)).slice(0,7);
}

function historyMonthWorkouts(month){
  const prefix=historyMonthPrefix(month);
  return progressWorkoutEntries().filter(w=>typeof w?.date==="string"&&w.date.startsWith(prefix));
}

function historyMonthTitle(month){
  const d=monthStart(month);
  const name=d.toLocaleDateString("en-IN",{month:"long"});
  return d.getFullYear()===new Date().getFullYear()?name:`${name} ${d.getFullYear()}`;
}

function progressTotals(workouts){
  let exerciseCount=0, setCount=0, volume=0;

  workouts.forEach(w=>{
    (w.exercises||[]).forEach(raw=>{
      const entry=normalizedEntry(raw,w.unit||"kg");
      exerciseCount++;
      progressEntrySets(entry).forEach(set=>{
        const weight=Number(set.weight)||0;
        const reps=Number(set.reps)||0;
        const unit=(entry.unit||w.unit||"kg").toLowerCase();
        const kg=unit==="lb" ? weight*0.45359237 : weight;
        setCount++;
        volume += kg*reps;
      });
    });
  });

  return {exerciseCount,setCount,volume};
}

function openHistoryMonthPicker(){
  const items=monthPickerItems();
  const chosen=dateKey(monthStart(historyMonth));
  modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <div class="picker-title">
    <h2 class="workout-form-title">Select Month</h2>
    <button aria-label="Close" onclick="closeModal()"><svg class="icon"><use href="#close"/></svg></button>
   </div>
  </div>
  <div class="workout-entry-scroll">
   <div class="week-list">${items.map(d=>`<button type="button" onclick="chooseHistoryMonth('${dateKey(d)}')" class="${dateKey(d)===chosen?"chosen":""}"><b>${d.toLocaleDateString("en-IN",{month:"short"})}</b><span>${d.getFullYear()}</span>${iAmThisMonth(d)?'<em>This Month <svg class="icon"><use href="#check"/></svg></em>':""}</button>`).join("")}</div>
  </div>
  <div class="modal-actions workout-modal-actions">
   <button class="outline btn-wide workout-cancel-button" onclick="closeModal()">Close</button>
  </div>
 `,"workout-entry-sheet");
  document.body.classList.add("workout-form-open");
  pinPickerChoice();
}

function chooseHistoryMonth(k){
  historyMonth=monthStart(new Date(k+"T00:00:00"));
  closeModal();
  renderProgress();
}

function renderProgress(){
  const target=document.getElementById("progressView");
  if(!target)return;

  const month=monthStart(historyMonth);
  const monthWorkouts=historyMonthWorkouts(month);
  const totals=progressTotals(monthWorkouts);
  const muscleCount=new Set(monthWorkouts.flatMap(w=>w.muscles||[])).size;
  const u=preferredUnit();
  const volumeKg=totals.volume||0;
  const volumeShown=u==="lb"?volumeKg*2.2046226218:volumeKg;
  const volume=volumeShown ? Math.round(volumeShown).toLocaleString("en-IN") : "0";

  target.innerHTML=`
    <section class="progress-overview card">
      <div class="section-head">
        <h2>${esc(historyMonthTitle(month))}</h2>
        <button class="week-select" type="button" onclick="openHistoryMonthPicker()" aria-label="Select month"><b>${monthNumberChip(month)}</b><span>${monthRangeLabel(month)}</span><i><svg class="icon" aria-hidden="true"><use href="#chevron-down"/></svg></i></button>
      </div>
      <div class="progress-stats">
        <div class="progress-stat"><strong>${monthWorkouts.length}</strong><span>Workouts</span></div>
        <div class="progress-stat"><strong>${volume}</strong><span>${u} · reps</span></div>
        <div class="progress-stat"><strong>${muscleCount}</strong><span>Muscle groups</span></div>
      </div>
    </section>
    ${renderRecentWorkouts()}
  `;
}

function historyExportWorkouts(){
  return [...(state.workouts||[])].sort((a,b)=>{
    const dateDiff=(a.date||"").localeCompare(b.date||"");
    return dateDiff || (a.createdAt||0)-(b.createdAt||0);
  });
}

function historyExportFileStem(){
  return `Workout-History-${dateKey(new Date())}`;
}

function exportHistoryXlsx(){
  downloadWorkoutHistoryXlsx(historyExportWorkouts(),historyExportFileStem());
}
