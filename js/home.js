/* Home page only. Week helpers and selectedWeekStart stay in workouts.js. */
let weekSwipeLockUntil=0;
let weekSwipeAnimating=false;

function renderHome(){
 const today=new Date();today.setHours(0,0,0,0);
 const k=dateKey(today);
 const todays=[...state.workouts].filter(w=>w.date===k).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const latest=todays[0];
 // Home intentionally exposes only two status states: completed or no workout yet.
 // An unfinished draft remains available to the workout flow, but is not presented as a third home status.
 const status=latest?homeCompleted(latest):homeNotStarted();
 const ws=weekStart(selectedWeekStart);
 document.getElementById("homeView").innerHTML=heroCard()+status+weeklyCard(ws)+quickProgress();
 bindWeekSwipe();
}
function heroCard(){
 return `<section class="hero-card"><div class="hero-copy"><h2>Start Workout</h2><p>Log your workout and<br>Keep your streak alive!</p><button class="hero-btn" onclick="openWorkout()">Start Workout <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button></div><img class="hero-art" src="assets/workout-hero.png" alt="" aria-hidden="true"></section>`;
}
function homeNotStarted(){return `<section class="home-status card"><h2>Today's Status</h2><div class="status-main"><div class="status-icon neutral"><svg class="icon"><use href="#activity"/></svg></div><div class="status-copy"><strong>No workout yet</strong><span>Ready when you are.</span></div><button class="outline status-action" onclick="openWorkout()">Start Workout</button></div></section>`}
function homeCompleted(w){
 return `<section class="home-status card"><h2>Today's Status</h2><div class="status-main"><div class="status-icon complete"><svg class="icon" aria-hidden="true"><use href="#check"/></svg></div><div class="status-copy green-text"><strong>Workout completed</strong><span>Great job! You crushed it.</span></div><button class="outline status-action" onclick="viewWorkout('${w.id}')">View Workout</button></div></section>`;
}

function weekActivityStats(start){
 const days=weekDates(weekStart(start));
 const todayKey=dateKey(new Date());
 const count=days.filter(d=>state.workouts.some(w=>w.date===dateKey(d))).length;
 const restCount=days.filter(d=>{
  const k=dateKey(d);
  return k<todayKey && !state.workouts.some(w=>w.date===k);
 }).length;
 return {count,restCount,remaining:remainingDays(days)};
}
function weekDaysInnerHtml(start){
 const days=weekDates(weekStart(start));
 return `<div class="week-days">${days.map(d=>{const has=state.workouts.some(w=>w.date===dateKey(d)),today=isToday(d);return `<button type="button" onclick="goToWeekDay('${dateKey(d)}')" class="week-day"><span>${d.toLocaleDateString("en-IN",{weekday:"short"})}</span><i class="${has?"workout":today?"today":"rest"}">${has?'<svg class="icon" aria-hidden="true"><use href="#check"/></svg>':today?'':'<svg class="icon" aria-hidden="true"><use href="#minus"/></svg>'}</i></button>`}).join("")}</div>`;
}
function weekStatsHtml(start){
 const {count,restCount,remaining}=weekActivityStats(start);
 return `<span><svg class="icon" aria-hidden="true"><use href="#calendar-icon"/></svg><b>${count} workout${count===1?"":"s"}</b></span><i class="week-stats-rule" aria-hidden="true"></i><span><svg class="icon" aria-hidden="true"><use href="#activity"/></svg><b>${restCount} rest days</b></span><i class="week-stats-rule" aria-hidden="true"></i><span><svg class="icon" aria-hidden="true"><use href="#target"/></svg><b>${remaining} day${remaining===1?"":"s"} remaining</b></span>`;
}
function updateWeeklyCardChrome(){
 const start=weekStart(selectedWeekStart);
 const card=document.querySelector("#homeView .weekly-card");
 if(!card)return;
 const chip=card.querySelector(".week-select b");
 const range=card.querySelector(".week-select span");
 if(chip)chip.textContent=weekNumberChip(start);
 if(range)range.textContent=rangeLabel(start);
 const stats=card.querySelector(".week-stats");
 if(stats)stats.innerHTML=weekStatsHtml(start);
 const quick=document.querySelector("#homeView .quick");
 if(quick)quick.outerHTML=quickProgress();
}

function weeklyCard(start){
 return `<section class="weekly-card card"><div class="section-head"><h2>Weekly Activity</h2><button class="week-select" type="button" onclick="openWeekPicker()" aria-label="Select week"><b>${weekNumberChip(start)}</b><span>${rangeLabel(start)}</span><i><svg class="icon" aria-hidden="true"><use href="#chevron-down"/></svg></i></button></div><div class="week-days-calendar">${weekDaysInnerHtml(start)}</div><div class="legend"><span><i class="dot workout"></i>Workout</span><span><i class="dot rest"></i>Rest</span><span><i class="dot today"></i>Today</span></div><div class="week-stats">${weekStatsHtml(start)}</div><button class="full-week" type="button" onclick="go('workouts')">View full week <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button></section>`;
}

function remainingDays(days){
 const today=new Date();today.setHours(0,0,0,0);
 const todayKey=dateKey(today);
 const inWeek=days.some(d=>dateKey(d)===todayKey);
 if(!inWeek)return 0;
 const todayCompleted=state.workouts.some(w=>w.date===todayKey);
 return days.filter(d=>d>=today && (!isToday(d) || !todayCompleted)).length;
}
function navigateWeek(delta){
 if(weekSwipeAnimating)return;
 const next=shiftWeek(selectedWeekStart,delta);
 const items=weekPickerItems();
 if(!items.length)return;
 const newest=items[0],oldest=items[items.length-1];
 if(next>newest||next<oldest)return;
 const dir=delta>0?"next":"prev";
 const key=dateKey(next);
 weekSwipeAnimating=true;
 weekSwipeLockUntil=Date.now()+500;
 const finish=()=>{
  renderHome();
  if(typeof renderCalendar==="function")renderCalendar();
  weekSwipeAnimating=false;
 };
 const calendar=document.querySelector("#homeView .week-days-calendar");
 if(!calendar||(typeof prefersReducedMonthMotion==="function"&&prefersReducedMonthMotion())){
  applySelectedWeek(key);
  finish();
  return;
 }
 const outHtml=calendar.innerHTML;
 const height=calendar.offsetHeight;
 applySelectedWeek(key);
 const inHtml=weekDaysInnerHtml(selectedWeekStart);
 updateWeeklyCardChrome();
 calendar.style.height=`${height}px`;
 calendar.classList.add("is-swiping",dir==="next"?"swipe-next":"swipe-prev");
 calendar.innerHTML=`<div class="week-days-calendar-pane is-out">${outHtml}</div><div class="week-days-calendar-pane is-in">${inHtml}</div>`;
 requestAnimationFrame(()=>{
  requestAnimationFrame(()=>calendar.classList.add("is-animating"));
 });
 let settled=false;
 const settle=()=>{
  if(settled)return;
  settled=true;
  finish();
 };
 const inPane=calendar.querySelector(".week-days-calendar-pane.is-in");
 if(inPane){
  inPane.addEventListener("transitionend",e=>{
   if(e.target!==inPane)return;
   settle();
  },{once:true});
 }
 setTimeout(settle,320);
}
function bindWeekSwipe(){
 const root=document.querySelector("#homeView .weekly-card");
 if(!root||root.dataset.swipeBound==="1")return;
 root.dataset.swipeBound="1";
 let x0=0,y0=0,active=false;
 const threshold=48;
 const endGesture=()=>{active=false};
 root.addEventListener("pointerdown",e=>{
  if(weekSwipeAnimating)return;
  if(e.pointerType==="mouse"&&e.button!==0)return;
  if(e.target.closest(".week-select, .full-week"))return;
  active=true;
  x0=e.clientX;y0=e.clientY;
  try{root.setPointerCapture(e.pointerId)}catch(_){}
 });
 root.addEventListener("pointerup",e=>{
  if(!active)return;
  active=false;
  if(weekSwipeAnimating)return;
  const dx=e.clientX-x0,dy=e.clientY-y0;
  if(Math.abs(dx)<threshold||Math.abs(dx)<=Math.abs(dy))return;
  weekSwipeLockUntil=Date.now()+500;
  navigateWeek(dx<0?1:-1);
 });
 root.addEventListener("pointercancel",endGesture);
 root.addEventListener("lostpointercapture",endGesture);
}
function quickProgress(){
 const ws=weekStart(selectedWeekStart),we=weekEnd(ws);
 const w=state.workouts.filter(x=>x.date>=dateKey(ws)&&x.date<=dateKey(we));
 let volume=0,sets=0;
 w.forEach(x=>(x.exercises||[]).forEach(raw=>{
  const e=normalizedEntry(raw,x.unit||"kg");
  (e.sets||[]).forEach(s=>{
   sets++;
   volume+=(Number(s.weight)||0)*(Number(s.reps)||0)*(e.unit==="lb"?0.45359237:1);
  });
 }));
 const u=preferredUnit();
 const shown=u==="lb"?volume*2.2046226218:volume;
 const weekLabel=iAmThisWeek(ws)?"This Week":rangeLabel(ws);
 return `<section class="quick card"><div class="section-head"><h2>Quick Progress</h2><button onclick="go('progress')">View full history <svg class="icon" aria-hidden="true"><use href="#arrow-right"/></svg></button></div><div class="quick-grid"><div><i><svg class="icon"><use href="#layers"/></svg></i><b>${sets}</b><span>Sets</span><small>${weekLabel}</small></div><div><i><svg class="icon"><use href="#layers"/></svg></i><b>${Math.round(shown).toLocaleString()} ${u}</b><span>Volume</span><small>${weekLabel}</small></div><div><i><svg class="icon"><use href="#chart"/></svg></i><b>${countPRs()}</b><span>PRs</span><small>This Month</small></div><div><i><svg class="icon"><use href="#target"/></svg></i><b>${calcProgress()}</b><span>Day Progress</span><small>Keep it up!</small></div></div></section>`
}
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
