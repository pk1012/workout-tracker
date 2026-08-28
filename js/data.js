const VERSION="1.7.76",BUILD="2026.08.28";
const defaults={Abs:["Cable Crunch","Hanging Leg Raise","Plank"],Back:["Lat Pulldown","Seated Cable Row","Single Arm Dumbbell Row","T-Bar Row"],Biceps:["Behind-the-Back Cable Curl","Cable Curl","Hammer Curl","Incline Dumbbell Curl"],Calves:["Calf Raise","Seated Calf Raise"],Cardio:["Cycling","Running","Walking"],Chest:["Flat Bench Press","Inclined Dumbbell Press","Pec Deck Fly","Wide Chest Press Machine"],Legs:["Leg Extension","Leg Press","Romanian Deadlift","Squat"],Shoulders:["Dumbbell Lateral Raise","Face Pull","Overhead Press","Rear Delt Fly"],Triceps:["Cable Pushdown","Overhead Cable Extension","Skull Crusher"]};
function newId(){return globalThis.crypto?.randomUUID?crypto.randomUUID():`id-${Date.now()}-${Math.random().toString(36).slice(2)}`}

let state=JSON.parse(localStorage.getItem("wt_state")||"null");
if(!state){state={muscles:Object.keys(defaults).map(name=>({id:newId(),name})),exercises:[],workouts:[]};state.muscles.forEach(m=>(defaults[m.name]||[]).forEach(name=>state.exercises.push({id:newId(),name,muscleId:m.id})));save();}
// Migrate older builds without changing existing workout history.
if(state){
 state.workouts=(state.workouts||[]).map(w=>({...w,startTime:w.startTime||"",endTime:w.endTime||""}));
 if(state.activeWorkout && !state.activeWorkout.date) delete state.activeWorkout;
 save();
}
let selected=new Date();selected.setHours(0,0,0,0);let month=new Date(selected.getFullYear(),selected.getMonth(),1);
function save(){localStorage.setItem("wt_state",JSON.stringify(state))}
function esc(s){
  return String(s).replace(/[&<>"']/g,c=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}
function isValidDateString(value){
  if(typeof value!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))return false;
  const [y,m,d]=value.split("-").map(Number);
  const dt=new Date(y,m-1,d);
  return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;
}
function dateKey(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function muscle(id){return state.muscles.find(x=>x.id===id)?.name||"Unknown"}
