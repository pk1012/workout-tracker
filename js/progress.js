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

function progressDateLabel(date){
  if(!date)return "Unknown date";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN",{
    weekday:"short",day:"numeric",month:"short",year:"numeric"
  });
}

function progressWorkoutDuration(workout){
  if(typeof durationMinutes!=="function")return null;
  return durationMinutes(workout);
}

function progressWorkoutMeta(workout){
  const exercises=workout.exercises?.length||0;
  const sets=(workout.exercises||[]).reduce((total,entry)=>total+progressEntrySets(normalizedEntry(entry,workout.unit||"kg")).length,0);
  const duration=progressWorkoutDuration(workout);
  const parts=[`${exercises} ${exercises===1?"Exercise":"Exercises"}`,`${sets} ${sets===1?"Set":"Sets"}`];
  if(duration!=null)parts.push(durationLabel(duration));
  return parts.join(" • ");
}

function progressWorkoutCard(workout){
  const muscles=(workout.muscles||[]).map(muscle).filter(Boolean);
  const title=muscles.length ? muscles.join(" + ") : "Workout";
  return `<button type="button" class="progress-workout-card" onclick="viewWorkout('${esc(workout.id||"")}')">
    <span class="progress-workout-icon" aria-hidden="true"><svg class="icon"><use href="#dumbbell"/></svg></span>
    <span class="progress-workout-copy">
      <strong>${esc(title)}</strong>
      <span>${esc(progressDateLabel(workout.date))}</span>
      <small>${esc(progressWorkoutMeta(workout))}</small>
    </span>
    <span class="progress-workout-arrow" aria-hidden="true"><svg class="icon"><use href="#chevron-right"/></svg></span>
  </button>`;
}

function renderProgress(){
  const target=document.getElementById("progressView");
  if(!target)return;

  const workouts=progressWorkoutEntries();
  const totals=progressTotals(workouts);
  const muscleCount=new Set(workouts.flatMap(w=>w.muscles||[])).size;
  const volume=totals.volume ? Math.round(totals.volume).toLocaleString("en-IN") : "0";

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
        <div class="progress-stat"><strong>${volume}</strong><span>kg · reps</span></div>
      </div>
      <div class="progress-footnote">
        <svg class="icon" aria-hidden="true"><use href="#target"/></svg>
        <span>${muscleCount} muscle ${muscleCount===1?"group":"groups"} trained</span>
      </div>
    </section>

    <section class="progress-history-section">
      <div class="progress-history-head">
        <h2>Workout History</h2>
        <span>${workouts.length} ${workouts.length===1?"workout":"workouts"}</span>
      </div>
      ${workouts.length
        ? `<div class="progress-history-list">${workouts.map(progressWorkoutCard).join("")}</div>`
        : `<div class="progress-empty card"><svg class="icon" aria-hidden="true"><use href="#chart"/></svg><strong>No workouts yet</strong><span>Complete a workout and your progress will appear here.</span></div>`}
    </section>
  `;
}
