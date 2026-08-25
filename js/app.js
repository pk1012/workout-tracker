function go(id){
 document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
 const screen=document.getElementById(id); if(!screen)return;
 screen.classList.add("active");
 const navId=id==="more"||id==="library-management"?"more":id; document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.screen===navId));
 if(id==="home")renderHome();
 if(id==="workouts")renderCalendar();
 if(id==="exercises")renderExercises();
 if(id==="library-management")renderLibrary();
 if(id==="progress")renderProgress();
}
function modal(html){document.getElementById("modal").innerHTML=`<div class="sheet">${html}</div>`;document.getElementById("modal").classList.add("show")}
function closeModal(){document.getElementById("modal").classList.remove("show")}
let savedTheme=localStorage.getItem("wt_theme")||"light";theme(savedTheme);
renderHome();renderCalendar();
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}))}
