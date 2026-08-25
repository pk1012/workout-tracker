function renderProgress(){
 let workouts=[...state.workouts].sort((a,b)=>b.date.localeCompare(a.date));
 let entries=workouts.flatMap(w=>(w.exercises||[]).map(entry=>normalizedEntry(entry,w.unit||"kg")));
 let ex=entries.length,groups=new Set(workouts.flatMap(w=>w.muscles)).size;
 let volume=entries.reduce((total,e)=>total+(e.sets||[]).reduce((sum,s)=>{
   const weight=Number(s.weight)||0, reps=Number(s.reps)||0, unit=(e.unit||"kg").toLowerCase();
   const kg=unit==="lb"?weight*0.45359237:weight;
   return sum+kg*reps;
 },0),0);
 document.getElementById("progressView").innerHTML=`<div class="progress card"><h2 style="margin:0">Training Overview</h2><div class="muted">Your logged workout history.</div><div class="stats stats-four"><div class="stat"><span class="muted">Workouts</span><strong>${workouts.length}</strong></div><div class="stat"><span class="muted">Exercises</span><strong>${ex}</strong></div><div class="stat"><span class="muted">Muscles</span><strong>${groups}</strong></div><div class="stat"><span class="muted">Volume</span><strong>${volume?Math.round(volume):0}</strong><small class="muted">kg·reps</small></div></div><div class="muted progress-note">Volume is normalized to kg·reps; lb sets are converted to kg.</div></div><div class="progress card" style="margin-top:16px">${workouts.length?workouts.map(w=>`<div class="exercise-row"><div><strong>${new Date(w.date+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</strong><div class="muted">${w.muscles.map(muscle).join(" · ")}</div></div><span>${w.exercises.length}</span></div>`).join(""):`<div class="empty">No workouts logged yet.</div>`}</div>`
}
