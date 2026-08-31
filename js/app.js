function go(id){
 document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
 const screen=document.getElementById(id); if(!screen)return;
 screen.classList.add("active");
 const navId=id==="more"||id==="library-management"||id==="recycle"?"more":id; document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.screen===navId));
 if(id==="home")renderHome();
 if(id==="workouts")renderCalendar();
 if(id==="exercises")renderExercises();
 if(id==="library-management")renderLibrary();
 if(id==="recycle")renderRecycle();
 if(id==="progress")renderProgress();
 if(id==="more")renderDriveCard();
 if(typeof renderNotificationBell==="function")renderNotificationBell();
}
function refreshAppViews(){
 if(typeof renderHome==="function")renderHome();
 if(typeof renderCalendar==="function")renderCalendar();
 if(typeof renderProgress==="function")renderProgress();
 if(typeof renderExercises==="function")renderExercises();
 if(typeof renderLibrary==="function")renderLibrary();
 if(typeof renderRecycle==="function")renderRecycle();
 if(typeof renderDriveCard==="function")renderDriveCard();
 if(typeof renderNotificationBell==="function")renderNotificationBell();
}
let pageScrollY=0;
let pageScrollLocked=false;
function lockPageScroll(){
 if(pageScrollLocked)return;
 pageScrollLocked=true;
 pageScrollY=window.scrollY||window.pageYOffset||0;
 document.documentElement.classList.add("page-scroll-lock");
 document.body.style.top=`-${pageScrollY}px`;
}
function unlockPageScroll(){
 if(!pageScrollLocked)return;
 pageScrollLocked=false;
 document.documentElement.classList.remove("page-scroll-lock");
 document.body.style.top="";
 window.scrollTo(0,pageScrollY);
}
function modalScrollerAllows(target){
 const host=document.getElementById("modal");
 if(!host||!host.classList.contains("show"))return true;
 let node=target&&target.nodeType===1?target:target&&target.parentElement;
 if(node===host)return false;
 const can=el=>{
  const st=getComputedStyle(el);
  const y=(st.overflowY==="auto"||st.overflowY==="scroll"||st.overflowY==="overlay")&&el.scrollHeight>el.clientHeight+1;
  const x=(st.overflowX==="auto"||st.overflowX==="scroll"||st.overflowX==="overlay")&&el.scrollWidth>el.clientWidth+1;
  return y||x;
 };
 while(node&&node!==host&&node!==document.body){
  if(node.nodeType===1&&can(node))return true;
  node=node.parentElement;
 }
 return false;
}
function guardModalBackgroundScroll(e){
 if(!document.body.classList.contains("modal-open"))return;
 if(e.type==="wheel"&&e.target.closest&&e.target.closest("input,select,textarea"))return;
 if(modalScrollerAllows(e.target))return;
 e.preventDefault();
}
document.addEventListener("touchmove",guardModalBackgroundScroll,{passive:false});
document.addEventListener("wheel",guardModalBackgroundScroll,{passive:false});
function modal(html,sheetClass="",opts={}){
 const host=document.getElementById("modal");
 host.innerHTML=`<div class="sheet ${sheetClass}">${html}</div>`;
 host.classList.toggle("modal-locked",!!opts.lockDismiss);
 host.classList.add("show");
 document.body.classList.add("modal-open");
 lockPageScroll();
}
function tryDismissModal(){
 if(document.getElementById("modal")?.classList.contains("modal-locked"))return;
 closeModal();
}
function closeModal(){
 const host=document.getElementById("modal");
 host.classList.remove("show","modal-locked");
 document.body.classList.remove("modal-open","workout-form-open");
 unlockPageScroll();
 if(typeof pendingDriveRestore!=="undefined"&&pendingDriveRestore)declineDriveRestore();
}
function notify(message,type="info"){let host=document.getElementById("toastHost");if(!host){host=document.createElement("div");host.id="toastHost";document.body.appendChild(host)}const toast=document.createElement("div");toast.className=`toast ${type}`;toast.innerHTML=`<svg class="icon"><use href="#${type==="success"?"check":type==="error"?"close":"info"}"/></svg><span>${esc(message)}</span>`;host.appendChild(toast);requestAnimationFrame(()=>toast.classList.add("show"));setTimeout(()=>{toast.classList.remove("show");setTimeout(()=>toast.remove(),220)},2800)}
let pendingConfirm=null;
let pendingConfirmBack=null;
function confirmAction(message,onConfirm,asSheet,onCancel){
 pendingConfirm=onConfirm;
 pendingConfirmBack=typeof onCancel==="function"?onCancel:null;
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
    <button class="primary btn-wide workout-next-button" onclick="continueConfirmAction()">Continue</button>
    <button class="outline btn-wide workout-cancel-button" onclick="cancelConfirmAction()">Cancel</button>
   </div>
  `,"workout-entry-sheet");
  document.body.classList.add("workout-form-open");
  return;
 }
 document.body.classList.remove("workout-form-open");
 modal(`<div class="handle"></div><div class="confirm-icon"><svg class="icon"><use href="#info"/></svg></div><h2 class="confirm-title">Are you sure?</h2><p class="muted confirm-copy">${esc(message)}</p><div class="modal-actions"><button class="primary btn-wide" onclick="continueConfirmAction()">Continue</button><button class="outline btn-wide" onclick="cancelConfirmAction()">Cancel</button></div>`);
}
function continueConfirmAction(){
 const fn=pendingConfirm;
 pendingConfirm=null;
 pendingConfirmBack=null;
 closeModal();
 fn&&fn();
}
function cancelConfirmAction(){
 pendingConfirm=null;
 const back=pendingConfirmBack;
 pendingConfirmBack=null;
 if(back)back();
 else closeModal();
}
let savedTheme=localStorage.getItem("wt_theme")||"light";theme(savedTheme);
if(typeof applyUnitButtons==="function")applyUnitButtons();
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
 let waitingForSheet=false;
 const reloadApp=()=>{
  if(reloading)return;
  reloading=true;
  location.reload();
 };
 navigator.serviceWorker.addEventListener("controllerchange",()=>{
  if(reloading)return;
  if(!document.body.classList.contains("workout-form-open")){
   reloadApp();
   return;
  }
  if(waitingForSheet)return;
  waitingForSheet=true;
  const watch=new MutationObserver(()=>{
   if(document.body.classList.contains("workout-form-open"))return;
   watch.disconnect();
   reloadApp();
  });
  watch.observe(document.body,{attributes:true,attributeFilter:["class"]});
 });
}
