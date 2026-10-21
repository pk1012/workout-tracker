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

let pendingConfirm=null;
let pendingConfirmBack=null;
let modalReturnFocus=null;
function isModalOpen(){
 return !!document.getElementById("modal")?.classList.contains("show");
}
function modalFocusables(){
 const sheet=document.querySelector("#modal.show .sheet");
 if(!sheet)return [];
 const sel='a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
 return [...sheet.querySelectorAll(sel)].filter(el=>{
  if(el.disabled||el.getAttribute("aria-hidden")==="true")return false;
  if(el.closest("[hidden]"))return false;
  const st=getComputedStyle(el);
  return st.display!=="none"&&st.visibility!=="hidden";
 });
}
function focusModalSheet(){
 const list=modalFocusables();
 if(list.length){
  const preferred=list.find(el=>el.matches("input:not([type='hidden']),select,textarea"))||list[0];
  try{preferred.focus({preventScroll:true})}catch(_){preferred.focus()}
  return;
 }
 const sheet=document.querySelector("#modal.show .sheet");
 if(!sheet)return;
 if(!sheet.hasAttribute("tabindex"))sheet.tabIndex=-1;
 try{sheet.focus({preventScroll:true})}catch(_){sheet.focus()}
}
function trapModalFocus(e){
 const sheet=document.querySelector("#modal.show .sheet");
 if(!sheet)return;
 const list=modalFocusables();
 if(!list.length){
  e.preventDefault();
  focusModalSheet();
  return;
 }
 const first=list[0],last=list[list.length-1];
 const active=document.activeElement;
 const outside=!active||!sheet.contains(active);
 if(e.shiftKey){
  if(outside||active===first){
   e.preventDefault();
   last.focus();
  }
 }else if(outside||active===last){
  e.preventDefault();
  first.focus();
 }
}
let modalEscapeHandler=null;
const SHEET_SWIPE_THRESHOLD=72;

function isNativePickerField(el){
 if(!(el instanceof HTMLElement))return false;
 if(el instanceof HTMLSelectElement)return true;
 if(el instanceof HTMLInputElement){
  return /^(date|time|datetime-local|month|week|color)$/.test(el.type);
 }
 return false;
}
function handleModalKeydown(e){
 if(!isModalOpen())return;
 if(e.key==="Escape"){
  if(e.defaultPrevented)return;
  /* First Esc closes a native date/time/select picker; don't cancel the sheet. */
  const field=isNativePickerField(e.target)?e.target
   :isNativePickerField(document.activeElement)?document.activeElement
   :null;
  if(field){
   e.preventDefault();
   field.blur();
   return;
  }
  e.preventDefault();
  dismissOpenSheet();
  return;
 }
 if(e.key==="Tab")trapModalFocus(e);
}
function keepFocusInModal(e){
 if(!isModalOpen())return;
 const host=document.getElementById("modal");
 if(!host||host.contains(e.target))return;
 focusModalSheet();
}
document.addEventListener("keydown",handleModalKeydown);
document.addEventListener("focusin",keepFocusInModal);

function dismissOpenSheet(){
 const host=document.getElementById("modal");
 if(!host?.classList.contains("show"))return;
 if(host.classList.contains("modal-locked"))return;
 if(pendingConfirm){
  cancelConfirmAction();
  return;
 }
 if(typeof modalEscapeHandler==="function"){
  const fn=modalEscapeHandler;
  modalEscapeHandler=null;
  fn();
  return;
 }
 closeModal();
}
/* Backdrop taps no longer dismiss — grey area is visual only. */
function tryDismissModal(){}

function bindSheetSwipeDismiss(sheet){
 if(!sheet||sheet.dataset.swipeDismissBound==="1")return;
 sheet.dataset.swipeDismissBound="1";
 let y0=0,x0=0,active=false;
 const canStart=e=>{
  const host=document.getElementById("modal");
  if(!host?.classList.contains("modal-swipe"))return false;
  if(e.pointerType==="mouse"&&e.button!==0)return false;
  return !!e.target.closest(".workout-entry-header, .handle");
 };
 sheet.addEventListener("pointerdown",e=>{
  if(!canStart(e))return;
  active=true;
  y0=e.clientY;
  x0=e.clientX;
  try{sheet.setPointerCapture(e.pointerId)}catch(_){}
 });
 const end=e=>{
  if(!active)return;
  active=false;
  sheet.style.transform="";
  sheet.style.transition="";
  const dy=e.clientY-y0,dx=e.clientX-x0;
  if(dy<SHEET_SWIPE_THRESHOLD||Math.abs(dy)<=Math.abs(dx))return;
  dismissOpenSheet();
 };
 sheet.addEventListener("pointermove",e=>{
  if(!active)return;
  const dy=Math.max(0,e.clientY-y0);
  sheet.style.transition="none";
  sheet.style.transform=dy?`translateY(${Math.min(dy,220)}px)`:"";
 });
 sheet.addEventListener("pointerup",end);
 sheet.addEventListener("pointercancel",()=>{
  active=false;
  sheet.style.transform="";
  sheet.style.transition="";
 });
}

function modal(html,sheetClass="",opts={}){
 const host=document.getElementById("modal");
 const wasOpen=host.classList.contains("show");
 if(!wasOpen){
  const active=document.activeElement;
  modalReturnFocus=active instanceof HTMLElement&&active!==document.body?active:null;
 }
 const locked=!!opts.lockDismiss;
 const swipe=!!opts.swipeDismiss&&!locked;
 host.innerHTML=`<div class="sheet ${sheetClass}">${html}</div>`;
 host.setAttribute("role","dialog");
 host.setAttribute("aria-modal","true");
 host.classList.toggle("modal-locked",locked);
 host.classList.toggle("modal-swipe",swipe);
 host.dataset.modalKind=locked?"locked":swipe?"swipe":(opts.kind||"buttons");
 modalEscapeHandler=typeof opts.onEscape==="function"?opts.onEscape:null;
 host.classList.add("show");
 document.body.classList.add("modal-open");
 lockPageScroll();
 const sheet=host.querySelector(".sheet");
 if(swipe)bindSheetSwipeDismiss(sheet);
 requestAnimationFrame(focusModalSheet);
}
function closeModal(){
 const host=document.getElementById("modal");
 const wasOpen=host.classList.contains("show");
 host.classList.remove("show","modal-locked","modal-swipe");
 host.removeAttribute("aria-modal");
 host.removeAttribute("role");
 delete host.dataset.modalKind;
 modalEscapeHandler=null;
 document.body.classList.remove("modal-open","workout-form-open");
 unlockPageScroll();
 if(!wasOpen)return;
 const back=modalReturnFocus;
 modalReturnFocus=null;
 requestAnimationFrame(()=>{
  if(isModalOpen())return;
  if(back&&document.contains(back)&&typeof back.focus==="function"){
   try{back.focus({preventScroll:true})}catch(_){back.focus()}
  }
 });
}
function collapsibleChevron(){
 return `<span class="collapsible-chevron" aria-hidden="true"><svg class="icon"><use href="#chevron-down"/></svg></span>`;
}
function collapsibleCard(title,body,{cardClass="workout-detail card",headClass="collapsible-head",expanded=false}={}){
 const open=!!expanded;
 return `<div class="${cardClass} collapsible-card ${open?"is-expanded":"is-collapsed"}"><button type="button" class="${headClass}" aria-expanded="${open?"true":"false"}" onclick="toggleCollapsibleCard(this)"><strong>${title}</strong>${collapsibleChevron()}</button><div class="collapsible-body"${open?"":" hidden"}>${body}</div></div>`;
}
function toggleCollapsibleCard(btn){
 const card=btn?.closest(".collapsible-card");
 if(!card)return;
 const expanded=card.classList.toggle("is-expanded");
 card.classList.toggle("is-collapsed",!expanded);
 btn.setAttribute("aria-expanded",expanded?"true":"false");
 const body=card.querySelector(".collapsible-body");
 if(body)body.hidden=!expanded;
}
function notify(message,type="info"){let host=document.getElementById("toastHost");if(!host){host=document.createElement("div");host.id="toastHost";document.body.appendChild(host)}const toast=document.createElement("div");toast.className=`toast ${type}`;toast.innerHTML=`<svg class="icon"><use href="#${type==="success"?"check":type==="error"?"close":"info"}"/></svg><span>${esc(message)}</span>`;host.appendChild(toast);requestAnimationFrame(()=>toast.classList.add("show"));setTimeout(()=>{toast.classList.remove("show");setTimeout(()=>toast.remove(),220)},2800)}
function confirmAction(message,onConfirm,asSheet,onCancel){
 pendingConfirm=onConfirm;
 pendingConfirmBack=typeof onCancel==="function"?onCancel:null;
 /* Confirms: buttons only — no swipe, no backdrop, no handle. */
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
  `,"workout-entry-sheet",{kind:"confirm"});
  document.body.classList.add("workout-form-open");
  return;
 }
 document.body.classList.remove("workout-form-open");
 modal(`<div class="handle"></div><div class="confirm-icon"><svg class="icon"><use href="#info"/></svg></div><h2 class="confirm-title">Are you sure?</h2><p class="muted confirm-copy">${esc(message)}</p><div class="modal-actions"><button class="primary btn-wide" onclick="continueConfirmAction()">Continue</button><button class="outline btn-wide" onclick="cancelConfirmAction()">Cancel</button></div>`, "",{kind:"confirm"});
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
storageReady.then(()=>{
 if(typeof refreshAppViews==="function")refreshAppViews();
 else{renderHome();renderCalendar()}
 initDrive();
});
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
 let lastSeenDateKey=typeof todayDateKey==="function"?todayDateKey():"";
 document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState!=="visible")return;
  checkUpdate();
  const today=typeof todayDateKey==="function"?todayDateKey():"";
  if(today&&today!==lastSeenDateKey){
   lastSeenDateKey=today;
   if(typeof refreshAppViews==="function")refreshAppViews();
  }
 });
 /* Reload on controllerchange is wired in index.html (early) so updates
    cannot race past app.js. Keep update checks / sheet date refresh here. */
}
