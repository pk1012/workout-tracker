/* Progress page only.
 * This file intentionally touches only #progress / #progressView.
 */
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

function renderProgress(){
  const target=document.getElementById("progressView");
  if(!target)return;

  const workouts=progressWorkoutEntries();
  const totals=progressTotals(workouts);
  const muscleCount=new Set(workouts.flatMap(w=>w.muscles||[])).size;
  const u=preferredUnit();
  const volumeKg=totals.volume||0;
  const volumeShown=u==="lb"?volumeKg*2.2046226218:volumeKg;
  const volume=volumeShown ? Math.round(volumeShown).toLocaleString("en-IN") : "0";

  target.innerHTML=`
    <section class="progress-overview card">
      <div class="progress-section-head">
        <div>
          <h2>Training Overview</h2>
          <p>See how your training is adding up.</p>
        </div>
      </div>
      <div class="progress-stats">
        <div class="progress-stat"><strong>${workouts.length}</strong><span>Workouts</span></div>
        <div class="progress-stat"><strong>${totals.exerciseCount}</strong><span>Exercises</span></div>
        <div class="progress-stat"><strong>${totals.setCount}</strong><span>Sets</span></div>
        <div class="progress-stat"><strong>${volume}</strong><span>${u} · reps</span></div>
      </div>
      <div class="progress-footnote">
        <svg class="icon" aria-hidden="true"><use href="#target"/></svg>
        <span>${muscleCount} muscle ${muscleCount===1?"group":"groups"} trained</span>
      </div>
    </section>
    ${renderRecentWorkouts()}
  `;
}
