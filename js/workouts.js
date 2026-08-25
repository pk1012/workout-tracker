let workoutDraft={date:"",muscles:[]};

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
 let ms=sortedMuscles(),chosen=new Set(muscleIds);
 modal(`<div class="handle"></div><h2>Log Workout</h2><div class="muted">Choose the workout date and muscle groups.</div><div class="field"><label>Date</label><input id="workDate" class="input" type="date" value="${esc(dateValue)}"></div><div class="grid">${ms.map(m=>`<button class="pick ${chosen.has(m.id)?"selected":""}" data-muscle="${m.id}" onclick="this.classList.toggle('selected')">${esc(m.name)}</button>`).join("")}</div><div class="modal-actions"><button class="primary btn-wide" onclick="chooseExercises()">Next: Select Exercises</button><button class="outline btn-wide" onclick="closeModal()">Cancel</button></div>`)
}

function chooseExercises(){
 let ids=[...document.querySelectorAll("[data-muscle].selected")].map(x=>x.dataset.muscle),date=document.getElementById("workDate")?.value;
 if(!ids.length){alert("Select at least one muscle group.");return}
 if(!date||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)){alert("Choose a valid workout date.");return}
 workoutDraft={date,muscles:ids.filter(id=>state.muscles.some(m=>m.id===id))};
 if(!workoutDraft.muscles.length){alert("The selected muscle groups are no longer available.");return}
 modal(`<div class="handle"></div><h2>Select Exercises</h2><div class="muted">Exercises are sorted alphabetically.</div>${workoutDraft.muscles.map(id=>{let ex=sortedExercisesForMuscle(id);return `<div class="field"><div class="section-title">${esc(muscle(id))}</div>${ex.length?ex.map(e=>`<button class="exercise-row exercise-pick pick" data-exercise="${e.id}" onclick="this.classList.toggle('selected')"><span>${esc(e.name)}</span><span class="pick-plus" aria-hidden="true">+</span></button>`).join(""):`<div class="empty">No exercises in this group.</div>`}</div>`}).join("")}<div class="modal-actions"><button class="primary btn-wide" onclick="saveWorkout()">Save Workout</button><button class="outline btn-wide" onclick="openWorkout(workoutDraft.muscles,workoutDraft.date)">Back</button></div>`)
}

function saveWorkout(){
 const date=workoutDraft.date;
 const muscles=[...new Set(workoutDraft.muscles)].filter(id=>state.muscles.some(m=>m.id===id));
 const ex=[...document.querySelectorAll("[data-exercise].selected")].map(x=>x.dataset.exercise).filter(id=>state.exercises.some(e=>e.id===id));
 if(!muscles.length){alert("Please select at least one valid muscle group.");return}
 if(!date||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)){alert("Please choose a valid workout date.");return}
 if(!ex.length){alert("Select at least one exercise.");return}
 const duplicate=state.workouts.some(w=>w.date===date&&JSON.stringify([...w.muscles].sort())===JSON.stringify([...muscles].sort())&&JSON.stringify([...w.exercises].sort())===JSON.stringify([...ex].sort()));
 if(duplicate&&!confirm("An identical workout is already logged for this date. Save another copy anyway?"))return;
 state.workouts.push({id:newId(),date,muscles,exercises:ex,createdAt:Date.now()});
 save();
 selected=new Date(`${date}T00:00:00`);selected.setHours(0,0,0,0);month=new Date(selected.getFullYear(),selected.getMonth(),1);
 workoutDraft={date:"",muscles:[]};closeModal();go("workouts");
}

function viewWorkout(id){
 let w=state.workouts.find(x=>x.id===id);if(!w)return;
 modal(`<div class="handle"></div><h2>${new Date(w.date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</h2><div class="muted">${w.muscles.map(muscle).join(" · ")}</div>${w.exercises.map(e=>`<div class="exercise-row">${esc(state.exercises.find(x=>x.id===e)?.name||"Deleted exercise")}</div>`).join("")}<div class="modal-actions"><button class="outline btn-wide" onclick="deleteWorkout('${w.id}')">Delete Workout</button><button class="primary btn-wide" onclick="closeModal()">Done</button></div>`)
}
function deleteWorkout(id){if(confirm("Delete this workout?")){state.workouts=state.workouts.filter(w=>w.id!==id);save();closeModal();renderCalendar()}}
