const VERSION="1.2.0",BUILD="2026.08.25";
const defaults={Abs:["Cable Crunch","Hanging Leg Raise","Plank"],Back:["Lat Pulldown","Seated Cable Row","Single Arm Dumbbell Row","T-Bar Row"],Biceps:["Behind-the-Back Cable Curl","Cable Curl","Hammer Curl","Incline Dumbbell Curl"],Calves:["Calf Raise","Seated Calf Raise"],Cardio:["Cycling","Running","Walking"],Chest:["Flat Bench Press","Inclined Dumbbell Press","Pec Deck Fly","Wide Chest Press Machine"],Legs:["Leg Extension","Leg Press","Romanian Deadlift","Squat"],Shoulders:["Dumbbell Lateral Raise","Face Pull","Overhead Press","Rear Delt Fly"],Triceps:["Cable Pushdown","Overhead Cable Extension","Skull Crusher"]};
let state=JSON.parse(localStorage.getItem("wt_state")||"null");
if(!state){state={muscles:Object.keys(defaults).map(name=>({id:crypto.randomUUID(),name})),exercises:[],workouts:[]};state.muscles.forEach(m=>(defaults[m.name]||[]).forEach(name=>state.exercises.push({id:crypto.randomUUID(),name,muscleId:m.id})));save();}
let selected=new Date();selected.setHours(0,0,0,0);let month=new Date(selected.getFullYear(),selected.getMonth(),1);
function save(){localStorage.setItem("wt_state",JSON.stringify(state))}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#039;"}[c]))}
function dateKey(d){return d.toISOString().slice(0,10)}
function muscle(id){return state.muscles.find(x=>x.id===id)?.name||"Unknown"}
