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
function openWorkout(){
 let ms=[...state.muscles].sort((a,b)=>a.name.localeCompare(b.name));
 modal(`<div class="handle"></div><h2>Log Workout</h2><div class="muted">Choose the workout date and muscle groups.</div><div class="field"><label>Date</label><input id="workDate" class="input" type="date" value="${dateKey(selected)}"></div><div class="grid">${ms.map(m=>`<button class="pick" data-muscle="${m.id}" onclick="this.classList.toggle('selected')">${esc(m.name)}</button>`).join("")}</div><div class="modal-actions"><button class="primary btn-wide" onclick="chooseExercises()">Next: Select Exercises</button><button class="outline btn-wide" onclick="closeModal()">Cancel</button></div>`)
}
function chooseExercises(){
 let ids=[...document.querySelectorAll("[data-muscle].selected")].map(x=>x.dataset.muscle),date=document.getElementById("workDate").value;if(!ids.length){alert("Select at least one muscle group.");return}
 modal(`<div class="handle"></div><h2>Select Exercises</h2><div class="muted">Exercises are sorted alphabetically.</div>${ids.map(id=>{let ex=state.exercises.filter(e=>e.muscleId===id).sort((a,b)=>a.name.localeCompare(b.name));return `<div class="field"><div class="section-title">${esc(muscle(id))}</div>${ex.map(e=>`<button class="exercise-row pick" style="width:100%;text-align:left" data-exercise="${e.id}" onclick="this.classList.toggle('selected')"><span>${esc(e.name)}</span><span>+</span></button>`).join("")}</div>`}).join("")}<div class="modal-actions"><button class="primary btn-wide" onclick="saveWorkout('${date}',${JSON.stringify(ids)})">Save Workout</button><button class="outline btn-wide" onclick="openWorkout()">Back</button></div>`)
}
function saveWorkout(date,muscles){
 let ex=[...document.querySelectorAll("[data-exercise].selected")].map(x=>x.dataset.exercise);if(!ex.length){alert("Select at least one exercise.");return}
 state.workouts.push({id:crypto.randomUUID(),date,muscles,exercises:ex,createdAt:Date.now()});save();selected=new Date(date+"T00:00:00");month=new Date(selected.getFullYear(),selected.getMonth(),1);closeModal();go("workouts")
}
function viewWorkout(id){
 let w=state.workouts.find(x=>x.id===id);if(!w)return;
 modal(`<div class="handle"></div><h2>${new Date(w.date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</h2><div class="muted">${w.muscles.map(muscle).join(" · ")}</div>${w.exercises.map(e=>`<div class="exercise-row">${esc(state.exercises.find(x=>x.id===e)?.name||"Deleted exercise")}</div>`).join("")}<div class="modal-actions"><button class="outline btn-wide" onclick="deleteWorkout('${w.id}')">Delete Workout</button><button class="primary btn-wide" onclick="closeModal()">Done</button></div>`)
}
function deleteWorkout(id){if(confirm("Delete this workout?")){state.workouts=state.workouts.filter(w=>w.id!==id);save();closeModal();renderCalendar()}}
