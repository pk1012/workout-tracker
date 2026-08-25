function sortedMuscles(){
 return [...state.muscles].sort((a,b)=>a.name.localeCompare(b.name));
}
function sortedExercisesForMuscle(muscleId){
 return state.exercises.filter(e=>e.muscleId===muscleId).sort((a,b)=>a.name.localeCompare(b.name));
}

function renderExercises(){
 const target=document.getElementById("exerciseList");
 if(!target)return;
 target.innerHTML=sortedMuscles().map(m=>{
  const ex=sortedExercisesForMuscle(m.id);
  return `<div class="section card pad exercise-group"><div class="section-title" style="margin:0">${esc(m.name)}</div>${ex.length?ex.map(e=>`<div class="exercise-row"><span>${esc(e.name)}</span></div>`).join(""):`<div class="empty">No exercises in this group.</div>`}</div>`;
 }).join("") || `<div class="empty card section pad">No muscle groups yet.</div>`;
}

function renderLibrary(){
 const target=document.getElementById("library");
 if(!target)return;
 target.innerHTML=sortedMuscles().map(m=>{
  const ex=sortedExercisesForMuscle(m.id);
  return `<div class="section card pad"><div class="row"><div class="section-title" style="margin:0">${esc(m.name)}</div><div class="actions"><button class="edit" onclick="openExercise('', '${m.id}')">+ Add</button><button class="edit" onclick="openMuscle('${m.id}')">Edit</button><button class="delete" onclick="deleteMuscle('${m.id}')">Delete</button></div></div>${ex.length?ex.map(e=>`<div class="exercise-row"><span>${esc(e.name)}</span><span class="actions"><button class="edit" onclick="openExercise('${e.id}')">Edit</button><button class="delete" onclick="deleteExercise('${e.id}')">Delete</button></span></div>`).join(""):`<div class="empty">No exercises in this group.</div>`}</div>`;
 }).join("")+`<div class="section card pad"><button class="primary btn-wide" onclick="openMuscle()">+ Add New Muscle Group</button></div>`;
}

function openExercise(id="",muscleId=""){
 let e=id?state.exercises.find(x=>x.id===id):null,ms=sortedMuscles();
 modal(`<div class="handle"></div><h2>${e?"Edit Exercise":"Add Exercise"}</h2><div class="field"><label>Exercise name</label><input id="exerciseName" class="input" value="${e?esc(e.name):""}" placeholder="Exercise name"></div><div class="field"><label>Muscle group</label><select id="exerciseMuscle" class="input">${ms.map(m=>`<option value="${m.id}" ${((e&&e.muscleId)||muscleId)===m.id?"selected":""}>${esc(m.name)}</option>`).join("")}</select></div><div class="modal-actions"><button class="primary btn-wide" onclick="saveExercise('${id}')">Save Exercise</button><button class="outline btn-wide" onclick="closeModal()">Cancel</button></div>`)
}
function saveExercise(id){
 let name=document.getElementById("exerciseName")?.value.trim(),mid=document.getElementById("exerciseMuscle")?.value;
 if(!name){alert("Enter an exercise name.");return}
 if(!mid||!state.muscles.some(m=>m.id===mid)){alert("Choose a valid muscle group.");return}
 if(state.exercises.some(e=>e.name.toLowerCase()===name.toLowerCase()&&e.muscleId===mid&&e.id!==id)){alert("That exercise already exists in this muscle group.");return}
 if(id){let e=state.exercises.find(x=>x.id===id);if(!e){alert("Exercise not found.");return}e.name=name;e.muscleId=mid}else state.exercises.push({id:newId(),name,muscleId:mid});
 save();closeModal();
 if(document.getElementById("library-management")?.classList.contains("active"))renderLibrary();
 if(document.getElementById("exercises")?.classList.contains("active"))renderExercises();
}
function deleteExercise(id){
 let e=state.exercises.find(x=>x.id===id);if(!e)return;
 if(confirm(`Delete "${e.name}"? Existing workout history will remain.`)){state.exercises=state.exercises.filter(x=>x.id!==id);save();renderLibrary();renderExercises();}
}
function openMuscle(id=""){
 let m=id?state.muscles.find(x=>x.id===id):null;
 modal(`<div class="handle"></div><h2>${m?"Edit Muscle Group":"Add Muscle Group"}</h2><div class="field"><label>Name</label><input id="muscleName" class="input" value="${m?esc(m.name):""}" placeholder="e.g. Forearms"></div><div class="modal-actions"><button class="primary btn-wide" onclick="saveMuscle('${id}')">Save Muscle Group</button><button class="outline btn-wide" onclick="closeModal()">Cancel</button></div>`)
}
function saveMuscle(id){
 let name=document.getElementById("muscleName")?.value.trim();
 if(!name){alert("Enter a name.");return}
 if(state.muscles.some(m=>m.name.toLowerCase()===name.toLowerCase()&&m.id!==id)){alert("That muscle group already exists.");return}
 if(id){let m=state.muscles.find(x=>x.id===id);if(!m){alert("Muscle group not found.");return}m.name=name}else state.muscles.push({id:newId(),name});
 save();closeModal();renderLibrary();renderExercises();
}
function deleteMuscle(id){
 let m=state.muscles.find(x=>x.id===id),n=state.exercises.filter(e=>e.muscleId===id).length;if(!m)return;
 if(confirm(`Delete "${m.name}"? ${n?`Its ${n} exercise(s) will also be removed from the library.`:""}`)){state.muscles=state.muscles.filter(x=>x.id!==id);state.exercises=state.exercises.filter(e=>e.muscleId!==id);save();renderLibrary();renderExercises();}
}
