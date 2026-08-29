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
 if(id==="more")renderDriveCard();
}
function modal(html,sheetClass=""){document.getElementById("modal").innerHTML=`<div class="sheet ${sheetClass}">${html}</div>`;document.getElementById("modal").classList.add("show");document.body.classList.add("modal-open")}
function closeModal(){document.getElementById("modal").classList.remove("show");document.body.classList.remove("modal-open","workout-form-open")}
function notify(message,type="info"){let host=document.getElementById("toastHost");if(!host){host=document.createElement("div");host.id="toastHost";document.body.appendChild(host)}const toast=document.createElement("div");toast.className=`toast ${type}`;toast.innerHTML=`<svg class="icon"><use href="#${type==="success"?"check":type==="error"?"close":"info"}"/></svg><span>${esc(message)}</span>`;host.appendChild(toast);requestAnimationFrame(()=>toast.classList.add("show"));setTimeout(()=>{toast.classList.remove("show");setTimeout(()=>toast.remove(),220)},2800)}
let pendingConfirm=null;
function confirmAction(message,onConfirm,asSheet){
 pendingConfirm=onConfirm;
 if(asSheet){
  modal(`
   <div class="workout-entry-header">
    <div class="handle"></div>
    <div class="confirm-icon"><svg class="icon"><use href="#info"/></svg></div>
    <h2 class="workout-form-title confirm-title">Are you sure?</h2>
    <p class="muted workout-form-description confirm-copy">${esc(message)}</p>
   </div>
   <div class="workout-entry-scroll"></div>
   <div class="modal-actions workout-modal-actions">
    <button class="primary btn-wide workout-next-button" onclick="const fn=pendingConfirm;pendingConfirm=null;closeModal();fn&&fn()">Continue</button>
    <button class="outline btn-wide workout-cancel-button" onclick="pendingConfirm=null;closeModal()">Cancel</button>
   </div>
  `,"workout-entry-sheet");
  document.body.classList.add("workout-form-open");
  return;
 }
 document.body.classList.remove("workout-form-open");
 modal(`<div class="handle"></div><div class="confirm-icon"><svg class="icon"><use href="#info"/></svg></div><h2 class="confirm-title">Are you sure?</h2><p class="muted confirm-copy">${esc(message)}</p><div class="modal-actions"><button class="primary btn-wide" onclick="const fn=pendingConfirm;pendingConfirm=null;closeModal();fn&&fn()">Continue</button><button class="outline btn-wide" onclick="pendingConfirm=null;closeModal()">Cancel</button></div>`);
}
let savedTheme=localStorage.getItem("wt_theme")||"light";theme(savedTheme);
storageReady.then(()=>{renderHome();renderCalendar();initDrive()});
function appBasePath(){
 if(location.hostname.endsWith("github.io")){
  const segment=location.pathname.split("/").filter(Boolean)[0];
  if(segment)return `/${segment}/`;
 }
 return "";
}
if("serviceWorker" in navigator){
 const base=appBasePath();
 const swUrl=base?`${base}sw.js`:`./sw.js`;
 const scope=base||"./";
 let watching=false;
 const checkUpdate=()=>{
  navigator.serviceWorker.register(swUrl,{scope,updateViaCache:"none"}).then(reg=>{
   reg.update();
   if(reg.waiting)reg.waiting.postMessage({type:"SKIP_WAITING"});
   if(watching)return;
   watching=true;
   reg.addEventListener("updatefound",()=>{
    const worker=reg.installing;
    if(!worker)return;
    worker.addEventListener("statechange",()=>{
     if(worker.state==="installed"&&navigator.serviceWorker.controller){
      worker.postMessage({type:"SKIP_WAITING"});
     }
    });
   });
  }).catch(()=>{});
 };
 checkUpdate();
 window.addEventListener("load",checkUpdate);
 document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible")checkUpdate();
 });
 let reloading=false;
 navigator.serviceWorker.addEventListener("controllerchange",()=>{
  if(reloading)return;
  reloading=true;
  location.reload();
 });
}
