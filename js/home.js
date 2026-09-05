/* Home page only. Week helpers and selectedWeekStart stay in workouts.js. */
function renderHome(){
 const today=new Date();today.setHours(0,0,0,0);
 const k=dateKey(today);
 const todays=[...state.workouts].filter(w=>w.date===k).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const latest=todays[0];
 // Home intentionally exposes only two status states: completed or no workout yet.
 // An unfinished draft remains available to the workout flow, but is not presented as a third home status.
 const status=latest?homeCompleted(latest):homeNotStarted();
 const ws=weekStart(selectedWeekStart), days=weekDates(ws), workouts=days.filter(d=>state.workouts.some(w=>w.date===dateKey(d))).length;
 document.getElementById("homeView").innerHTML=heroCard()+status+weeklyCard(ws,workouts)+quickProgress();
}
function heroCard(){return `<section class="hero-card"><div class="hero-copy"><h2>Start Workout</h2><p>Log your workout and<br>Keep your streak alive!</p><button class="hero-btn" onclick="openWorkout()">Start Workout <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button></div><img class="hero-art" src="assets/workout-hero.png" alt="Dumbbell and shaker illustration" aria-hidden="true"></section>`}
function homeNotStarted(){return `<section class="home-status card"><h2>Today's Status</h2><div class="status-main"><div class="status-icon neutral"><svg class="icon"><use href="#activity"/></svg></div><div class="status-copy"><strong>No workout yet</strong><span>Ready when you are.</span></div><button class="outline status-action" onclick="openWorkout()">Start Workout</button></div></section>`}
function homeCompleted(w){
 return `<section class="home-status card"><h2>Today's Status</h2><div class="status-main"><div class="status-icon complete"><svg class="icon" aria-hidden="true"><use href="#check"/></svg></div><div class="status-copy green-text"><strong>Workout completed</strong><span>Great job! You crushed it.</span></div><button class="outline status-action" onclick="viewWorkout('${w.id}')">View Workout</button></div></section>`;
}

function weeklyCard(start,count){
 const days=weekDates(start);
 const todayKey=dateKey(new Date());
 const restCount=days.filter(d=>{
  const k=dateKey(d);
  return k<todayKey && !state.workouts.some(w=>w.date===k);
 }).length;
 const remaining=remainingDays(days);
 return `<section class="weekly-card card"><div class="section-head"><h2>Weekly Activity</h2><button class="week-select" onclick="openWeekPicker()" aria-label="Select week"><b>${weekNumberChip(start)}</b><span>${rangeLabel(start)}</span><i><svg class="icon" aria-hidden="true"><use href="#chevron-down"/></svg></i></button></div><div class="week-days">${days.map(d=>{const has=state.workouts.some(w=>w.date===dateKey(d)),today=isToday(d);return `<button type="button" onclick="goToWeekDay('${dateKey(d)}')" class="week-day"><span>${d.toLocaleDateString("en-IN",{weekday:"short"})}</span><i class="${has?"workout":today?"today":"rest"}">${has?'<svg class="icon" aria-hidden="true"><use href="#check"/></svg>':today?'':'<svg class="icon" aria-hidden="true"><use href="#minus"/></svg>'}</i></button>`}).join("")}</div><div class="legend"><span><i class="dot workout"></i>Workout</span><span><i class="dot rest"></i>Rest</span><span><i class="dot today"></i>Today</span></div><div class="week-stats"><span><svg class="icon" aria-hidden="true"><use href="#calendar-icon"/></svg><b>${count} workout${count===1?"":"s"}</b></span><i class="week-stats-rule" aria-hidden="true"></i><span><svg class="icon" aria-hidden="true"><use href="#activity"/></svg><b>${restCount} rest days</b></span><i class="week-stats-rule" aria-hidden="true"></i><span><svg class="icon" aria-hidden="true"><use href="#target"/></svg><b>${remaining} day${remaining===1?"":"s"} remaining</b></span></div><button class="full-week" onclick="go('workouts')">View full week <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button></section>`;
}

function remainingDays(days){
 const today=new Date();today.setHours(0,0,0,0);
 const todayKey=dateKey(today);
 const inWeek=days.some(d=>dateKey(d)===todayKey);
 if(!inWeek)return 0;
 const todayCompleted=state.workouts.some(w=>w.date===todayKey);
 return days.filter(d=>d>=today && (!isToday(d) || !todayCompleted)).length;
}
function quickProgress(){let ws=weekStart(selectedWeekStart),we=weekEnd(ws),w=state.workouts.filter(x=>x.date>=dateKey(ws)&&x.date<=dateKey(we));let volume=0;w.forEach(x=>(x.exercises||[]).forEach(raw=>{let e=normalizedEntry(raw,x.unit||"kg");(e.sets||[]).forEach(s=>volume+=(Number(s.weight)||0)*(Number(s.reps)||0)*(e.unit==="lb"?0.45359237:1))}));const u=preferredUnit();const shown=u==="lb"?volume*2.2046226218:volume;return `<section class="quick card"><div class="section-head"><h2>Quick Progress</h2><button onclick="go('progress')">View full history <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button></div><div class="quick-grid"><div><i><svg class="icon"><use href="#activity"/></svg></i><b>${w.length}</b><span>Workouts</span><small>This Week</small></div><div><i><svg class="icon"><use href="#layers"/></svg></i><b>${Math.round(shown).toLocaleString()} ${u}</b><span>Volume</span><small>This Week</small></div><div><i><svg class="icon"><use href="#chart"/></svg></i><b>${countPRs()}</b><span>PRs</span><small>This Month</small></div><div><i><svg class="icon"><use href="#target"/></svg></i><b>${calcProgress()}</b><span>Day Progress</span><small>Keep it up!</small></div></div></section>`}
function countPRs(){
 const now=new Date(),monthStart=new Date(now.getFullYear(),now.getMonth(),1),seen=new Map(),prs=[];
 const workouts=[...state.workouts].sort((a,b)=>String(a.date).localeCompare(String(b.date))||(a.createdAt||0)-(b.createdAt||0));
 workouts.forEach(w=>{
  (w.exercises||[]).forEach(raw=>{
   const e=normalizedEntry(raw,w.unit||"kg"),key=e.exerciseId;
   (e.sets||[]).forEach(set=>{
    const weight=Number(set.weight);if(!Number.isFinite(weight))return;
    const kg=e.unit==="lb"?weight*0.45359237:weight;
    const best=seen.get(key)||0;
    if(kg>best){
      seen.set(key,kg);
      const dt=new Date(w.date+"T00:00:00");
      if(dt>=monthStart&&dt<=now)prs.push({exerciseId:key,date:w.date,weight:kg});
    }
   });
  });
 });
 return prs.length;
}
function calcProgress(){let n=0,d=new Date();d.setHours(0,0,0,0);if(!state.workouts.some(w=>w.date===dateKey(d)))d.setDate(d.getDate()-1);while(state.workouts.some(w=>w.date===dateKey(d))){n++;d.setDate(d.getDate()-1)}return n}
