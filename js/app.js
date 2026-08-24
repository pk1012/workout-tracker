function go(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));document.getElementById(id).classList.add("active");document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.screen===id));if(id==="workouts")renderCalendar();if(id==="exercises")renderLibrary();if(id==="progress")renderProgress()}
function modal(html){document.getElementById("modal").innerHTML=`<div class="sheet">${html}</div>`;document.getElementById("modal").classList.add("show")}
function closeModal(){document.getElementById("modal").classList.remove("show")}
let savedTheme=localStorage.getItem("wt_theme")||"light";theme(savedTheme);renderCalendar();
