const DRIVE_FOLDER_NAME="Workout Tracker";
const DRIVE_FILE_NAME="workout-tracker.json";
const DRIVE_AUTH_STATE="wt_drive_auth";
const DRIVE_SCOPES="https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
const K_TOKEN="wt_drive_token";
const K_EXP="wt_drive_token_exp";
const K_EMAIL="wt_drive_email";
const K_CLIENT="wt_google_client_id";
const K_FILE="wt_drive_file_id";
const K_FOLDER="wt_drive_folder_id";
const K_SAVED="wt_drive_saved_at";
const K_REMOTE="wt_drive_remote_device";
const K_PENDING="wt_drive_pending";
const K_DECLINED="wt_drive_restore_declined";
const K_ADOPTED="wt_drive_adopted";
const K_REAUTH="wt_drive_need_connect";
const K_RESTORE_NOTE="wt_drive_restore_note";
const K_DIVERGE="wt_drive_diverge";

let driveBusy=false;
let driveQueued=null;
let restorePrompted=false;

function lsGet(key){try{return localStorage.getItem(key)||""}catch(err){return ""}}
function lsSet(key,value){try{localStorage.setItem(key,value)}catch(err){}}
function lsDel(key){try{localStorage.removeItem(key)}catch(err){}}

function restoreNotePayload(){
 if(hasCompletedWorkouts(state)){
  if(lsGet(K_RESTORE_NOTE)){lsDel(K_RESTORE_NOTE);renderNotificationBell()}
  return null;
 }
 try{return JSON.parse(lsGet(K_RESTORE_NOTE)||"null")}catch(err){return null}
}
function hasRestoreNotification(){return !!restoreNotePayload()}
function setRestoreNotification(savedAt){
 lsSet(K_RESTORE_NOTE,JSON.stringify({savedAt:savedAt||""}));
 renderNotificationBell();
}
function clearRestoreNotification(){
 if(!lsGet(K_RESTORE_NOTE))return;
 lsDel(K_RESTORE_NOTE);
 renderNotificationBell();
}
function renderNotificationBell(){
 const btn=document.querySelector(".notification-head");
 if(!btn)return;
 btn.classList.toggle("has-unread",!!((lsGet(K_RESTORE_NOTE)&&!hasCompletedWorkouts(state))||drivePending()));
}
function refreshDriveUi(){
 if(typeof renderDriveCard==="function")renderDriveCard();
 if(typeof renderNotificationBell==="function")renderNotificationBell();
}
function setDrivePending(on){if(on)lsSet(K_PENDING,"1");else lsDel(K_PENDING);refreshDriveUi()}

function driveClientId(){
 return (typeof GOOGLE_DRIVE_CLIENT_ID==="string"&&GOOGLE_DRIVE_CLIENT_ID.trim())||lsGet(K_CLIENT).trim();
}
function driveRedirectUri(){
 const base=typeof appBasePath==="function"?appBasePath():"";
 if(base)return `${location.origin}${base}`;
 const path=location.pathname.endsWith("/")?location.pathname:location.pathname.replace(/[^/]+$/,"")||"/";
 return `${location.origin}${path}`;
}
function isDriveConnected(){
 const token=lsGet(K_TOKEN);
 const exp=Number(lsGet(K_EXP)||0);
 if(!token)return false;
 if(exp&&Date.now()>exp){
  expireDriveToken();
  return false;
 }
 return true;
}
function expireDriveToken(){
 if(!lsGet(K_TOKEN))return;
 const keepPending=hasCompletedWorkouts(state)||!!lsGet(K_SAVED)||drivePending();
 clearDriveSession({keepPending:true,keepMeta:true,keepDeclined:true,keepAdopted:true});
 if(keepPending)setDrivePending(true);
 notifyDriveReconnect();
}
function notifyDriveReconnect(){
 if(lsGet(K_REAUTH)==="1")return;
 lsSet(K_REAUTH,"1");
 if(typeof notify==="function")notify("Connect Google Drive again to save.","error");
}
function clearDriveSession(opts={}){
 lsDel(K_TOKEN);lsDel(K_EXP);lsDel(K_EMAIL);
 if(!opts.keepMeta){lsDel(K_FILE);lsDel(K_FOLDER);lsDel(K_SAVED);lsDel(K_REMOTE)}
 if(!opts.keepPending)lsDel(K_PENDING);
 if(!opts.keepDeclined)lsDel(K_DECLINED);
 if(!opts.keepAdopted)lsDel(K_ADOPTED);
}
function drivePending(){return lsGet(K_PENDING)==="1"}
function driveDeclined(){return lsGet(K_DECLINED)==="1"}
function driveAdopted(){return lsGet(K_ADOPTED)==="1"}

function formatDriveSaved(iso){
 if(!iso)return "";
 const d=new Date(iso);
 if(Number.isNaN(d.getTime()))return "";
 return d.toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});
}

function driveStatusLine(){
 if(drivePending())return "Waiting to save…";
 if(lsGet(K_DIVERGE)==="1")return "Phone and Drive differ. Sync to update.";
 const saved=lsGet(K_SAVED);
 if(saved)return `Last saved ${formatDriveSaved(saved)}`;
 if(!hasCompletedWorkouts(state))return "No workouts to save yet";
 return "Not saved yet";
}

function renderDriveCard(){
 const host=document.getElementById("driveCard");
 if(!host)return;
 if(!isDriveConnected()){
  const desc=drivePending()?"Connect again to save to Drive":(lsGet(K_DIVERGE)==="1"?"Phone and Drive differ. Connect to update.":"Connect to keep a copy off this phone");
  host.innerHTML=`<button class="setting card" type="button" onclick="connectDrive()"><span class="setting-icon"><svg class="icon"><use href="#cloud"/></svg></span><span class="setting-main"><span class="setting-title">Google Drive</span><span class="setting-desc">${esc(desc)}</span></span><span class="chevron"><svg class="icon" aria-hidden="true"><use href="#chevron-right"/></svg></span></button>`;
  return;
 }
 const email=lsGet(K_EMAIL)||"Google Drive";
 const showRestore=!!(lsGet(K_RESTORE_NOTE)&&!hasCompletedWorkouts(state));
 const restoreBtn=showRestore?`<button class="primary drive-restore" type="button" onclick="openPendingDriveRestore()">Restore</button>`:"";
 host.innerHTML=`<div class="setting card drive-card${showRestore?" has-restore":""}"><span class="setting-icon"><svg class="icon"><use href="#cloud"/></svg></span><span class="setting-main"><span class="setting-title">${esc(email)}</span><span class="setting-desc">${esc(driveStatusLine())}</span></span>${restoreBtn}<div class="drive-actions"><button class="primary" type="button" onclick="syncDrive()">Sync</button><button class="outline" type="button" onclick="disconnectDrive()">Disconnect</button></div></div>`;
}

function consumeOAuthRedirect(){
 const query=new URLSearchParams(location.search);
 const hash=new URLSearchParams((location.hash||"").replace(/^#/,""));
 const err=query.get("error")||hash.get("error");
 const token=hash.get("access_token");
 const stateParam=hash.get("state")||query.get("state");
 const cleanUrl=()=>{
  const base=driveRedirectUri();
  history.replaceState({},document.title,base);
 };
 if(err&&stateParam===DRIVE_AUTH_STATE){
  cleanUrl();
  notify("Google Drive was not connected.","error");
  return false;
 }
 if(token&&stateParam===DRIVE_AUTH_STATE){
  const seconds=Number(hash.get("expires_in")||3600);
  lsSet(K_TOKEN,token);
  lsSet(K_EXP,String(Date.now()+Math.max(60,seconds-60)*1000));
  lsDel(K_REAUTH);
  restorePrompted=false;
  cleanUrl();
  return true;
 }
 return false;
}

function connectDrive(){
 const id=driveClientId();
 if(!id){
  modal(`
   <div class="workout-entry-header">
    <div class="handle"></div>
    <h2 class="workout-form-title">Connect Google Drive</h2>
    <div class="muted workout-form-description">Paste the OAuth client ID from Google Cloud (Web application). Redirect URI must be ${esc(driveRedirectUri())}</div>
   </div>
   <div class="workout-entry-scroll">
    <div class="field"><label>Client ID</label><input class="input" id="driveClientInput" autocomplete="off" placeholder="….apps.googleusercontent.com"></div>
   </div>
   <div class="modal-actions workout-modal-actions">
    <button class="primary btn-wide workout-next-button" type="button" onclick="saveDriveClientId()">Continue</button>
    <button class="outline btn-wide workout-cancel-button" type="button" onclick="closeModal()">Cancel</button>
   </div>
  `,"workout-entry-sheet");
  document.body.classList.add("workout-form-open");
  return;
 }
 startDriveOAuth(id);
}

function saveDriveClientId(){
 const value=document.getElementById("driveClientInput")?.value.trim()||"";
 if(!value||!value.includes(".apps.googleusercontent.com")){
  notify("Enter a valid Google OAuth client ID.","error");
  return;
 }
 lsSet(K_CLIENT,value);
 closeModal();
 startDriveOAuth(value);
}

function startDriveOAuth(clientId){
 const params=new URLSearchParams({
  client_id:clientId,
  redirect_uri:driveRedirectUri(),
  response_type:"token",
  scope:DRIVE_SCOPES,
  include_granted_scopes:"true",
  state:DRIVE_AUTH_STATE,
  prompt:"select_account"
 });
 location.href=`https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function disconnectDrive(){
 confirmAction("Stop using Google Drive on this phone? The file on Drive is kept.",()=>{
  clearDriveSession();
  lsDel(K_REAUTH);
  lsDel(K_DIVERGE);
  clearRestoreNotification();
  restorePrompted=false;
  renderDriveCard();
  renderNotificationBell();
  notify("Google Drive disconnected.","success");
 },true);
}

function resetDriveAfterPhoneWipe(){
 setDrivePending(false);
 lsDel(K_DECLINED);
 lsDel(K_ADOPTED);
 lsDel(K_DIVERGE);
 clearRestoreNotification();
 restorePrompted=false;
}

async function driveApi(url,opts={}){
 const token=lsGet(K_TOKEN);
 const res=await fetch(url,{
  ...opts,
  headers:{
   Authorization:`Bearer ${token}`,
   ...(opts.body&&!(opts.body instanceof FormData)?{"Content-Type":"application/json"}:{}),
   ...(opts.headers||{})
  }
 });
 if(res.status===401){
  clearDriveSession({keepPending:true,keepMeta:true,keepDeclined:true,keepAdopted:true});
  renderDriveCard();
  notifyDriveReconnect();
  const err=new Error("unauthorized");
  err.code="unauthorized";
  throw err;
 }
 return res;
}

async function fetchUserEmail(){
 const res=await driveApi("https://www.googleapis.com/oauth2/v3/userinfo");
 if(!res.ok)return;
 const data=await res.json();
 if(data.email)lsSet(K_EMAIL,data.email);
}

async function driveFind(query){
 const params=new URLSearchParams({
  q:query,
  spaces:"drive",
  fields:"files(id,name,modifiedTime,appProperties,parents)",
  pageSize:"10"
 });
 const res=await driveApi(`https://www.googleapis.com/drive/v3/files?${params}`);
 if(!res.ok)return [];
 const data=await res.json();
 return data.files||[];
}

async function ensureDriveFolder(){
 const cached=lsGet(K_FOLDER);
 if(cached)return cached;
 const found=await driveFind(`name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
 if(found[0]){lsSet(K_FOLDER,found[0].id);return found[0].id}
 const res=await driveApi("https://www.googleapis.com/drive/v3/files",{
  method:"POST",
  body:JSON.stringify({name:DRIVE_FOLDER_NAME,mimeType:"application/vnd.google-apps.folder"})
 });
 if(!res.ok)throw new Error("folder");
 const created=await res.json();
 lsSet(K_FOLDER,created.id);
 return created.id;
}

async function loadDriveRemote(){
 const files=await driveFind(`name='${DRIVE_FILE_NAME}' and trashed=false`);
 if(!files.length){
  lsDel(K_FILE);
  return{exists:false,deviceId:"",savedAt:"",state:null,fileId:""};
 }
 const file=files[0];
 lsSet(K_FILE,file.id);
 if(file.parents&&file.parents[0])lsSet(K_FOLDER,file.parents[0]);
 const res=await driveApi(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
 if(res.status===404){
  lsDel(K_FILE);
  return{exists:false,deviceId:"",savedAt:"",state:null,fileId:""};
 }
 if(!res.ok)throw new Error("download");
 let payload;
 try{payload=await res.json()}catch(err){return{exists:true,deviceId:"",savedAt:"",state:null,fileId:file.id,unreadable:true}}
 const parsed=parseDriveBackup(payload);
 const deviceId=parsed?.deviceId||file.appProperties?.deviceId||"";
 const savedAt=parsed?.savedAt||file.appProperties?.savedAt||file.modifiedTime||"";
 if(deviceId)lsSet(K_REMOTE,deviceId);
 if(savedAt&&!drivePending())lsSet(K_SAVED,savedAt);
 return{exists:true,deviceId,savedAt,state:parsed?parsed.state:null,fileId:file.id,unreadable:!parsed};
}

async function uploadDriveSnapshot(reason){
 const savedAt=new Date().toISOString();
 const deviceId=getDeviceId();
 const payload=driveSnapshot(state,{version:VERSION,savedAt,deviceId});
 const body=JSON.stringify(payload);
 const folderId=await ensureDriveFolder();
 let fileId=lsGet(K_FILE);
 if(fileId){
  const check=await driveApi(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,trashed`);
  if(check.status===404||(check.ok&&(await check.json()).trashed))fileId="";
 }
 const meta={
  name:DRIVE_FILE_NAME,
  appProperties:{deviceId,savedAt}
 };
 if(!fileId){
  const createdRes=await driveApi("https://www.googleapis.com/drive/v3/files?fields=id",{
   method:"POST",
   body:JSON.stringify({...meta,parents:[folderId]})
  });
  if(!createdRes.ok)throw new Error("create");
  fileId=(await createdRes.json()).id;
  lsSet(K_FILE,fileId);
 }
 if(fileId){
  const metaRes=await driveApi(`https://www.googleapis.com/drive/v3/files/${fileId}`,{method:"PATCH",body:JSON.stringify(meta)});
  if(!metaRes.ok)throw new Error("meta");
  const mediaRes=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,{
   method:"PATCH",
   headers:{Authorization:`Bearer ${lsGet(K_TOKEN)}`,"Content-Type":"application/json"},
   body
  });
  if(mediaRes.status===401){
   clearDriveSession({keepPending:true,keepMeta:true,keepDeclined:true,keepAdopted:true});
   renderDriveCard();
   notifyDriveReconnect();
   throw Object.assign(new Error("unauthorized"),{code:"unauthorized"});
  }
  if(!mediaRes.ok)throw new Error("media");
 }
 lsSet(K_SAVED,savedAt);
 lsSet(K_REMOTE,deviceId);
 lsDel(K_ADOPTED);
 lsDel(K_DECLINED);
 lsDel(K_REAUTH);
 lsDel(K_DIVERGE);
 clearRestoreNotification();
 setDrivePending(false);
 renderDriveCard();
 if(reason==="sync"||reason==="connect"||reason==="retry")notify("Saved to Google Drive.","success");
}

function showDriveRestoreSheet(remote){
 if(restorePrompted)return;
 restorePrompted=true;
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">Restore from Drive?</h2>
   <div class="muted workout-form-description">This phone has no workouts. Google Drive has a backup${remote.savedAt?` from ${esc(formatDriveSaved(remote.savedAt))}`:""}. Restore replaces data on this phone. Drive is not changed until you save again.</div>
  </div>
  <div class="workout-entry-scroll"></div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" type="button" onclick="confirmDriveRestore()">Restore</button>
   <button class="outline btn-wide workout-cancel-button" type="button" onclick="declineDriveRestore()">Not now</button>
  </div>
 `,"workout-entry-sheet",{lockDismiss:true});
 document.body.classList.add("workout-form-open");
}

let pendingDriveRestore=null;
function confirmDriveRestore(){
 const remote=pendingDriveRestore;
 pendingDriveRestore=null;
 restorePrompted=false;
 if(!remote?.state||!isValidState(remote.state)){
  closeModal();
  notify("Could not restore this Drive backup.","error");
  return;
 }
 const next=JSON.parse(JSON.stringify(remote.state));
 delete next.activeWorkout;
 state=next;
 save();
 lsSet(K_ADOPTED,"1");
 lsDel(K_DECLINED);
 clearRestoreNotification();
 selected=new Date();selected.setHours(0,0,0,0);month=new Date(selected.getFullYear(),selected.getMonth(),1);
 closeModal();
 go("workouts");
 notify("Backup restored successfully.","success");
 queueDriveSave("connect");
}

function declineDriveRestore(){
 const at=pendingDriveRestore?.savedAt||lsGet(K_SAVED)||"";
 pendingDriveRestore=null;
 lsSet(K_DECLINED,"1");
 setRestoreNotification(at);
 closeModal();
 renderDriveCard();
}

async function afterDriveConnected(){
 if(!isDriveConnected())return;
 try{await fetchUserEmail()}catch(err){if(err.code==="unauthorized")return; }
 renderDriveCard();
 await runDriveHandshake("connect");
}

async function runDriveHandshake(reason){
 if(!isDriveConnected())return;
 if(driveBusy){driveQueued=reason;return}
 if(!navigator.onLine){
  const wait=reason==="auto"||reason==="empty"||reason==="retry"||reason==="overwrite"||reason==="sync"||(reason==="connect"&&(hasCompletedWorkouts(state)||driveAdopted()));
  if(wait)setDrivePending(true);
  renderDriveCard();
  return;
 }
 driveBusy=true;
 try{
  const remote=await loadDriveRemote();
  const decision=drivePolicy({
   hasLocalWorkouts:hasCompletedWorkouts(state),
   remoteExists:remote.exists,
   remoteDeviceId:remote.deviceId,
   localDeviceId:getDeviceId(),
   restoreDeclined:driveDeclined(),
   adopted:driveAdopted(),
   forceOverwrite:reason==="overwrite",
   flushEmpty:reason==="empty",
   remoteHasWorkouts:remote.unreadable?true:hasCompletedWorkouts(remote.state)
  });
  if(decision.action==="offer-restore"){
   setDrivePending(false);
   if(remote.unreadable||!remote.state||!isValidState(remote.state)){
    notify("Drive backup could not be read.","error");
   }else{
    pendingDriveRestore=remote;
    showDriveRestoreSheet(remote);
   }
   renderDriveCard();
   return;
  }
  if(decision.action==="need-confirm")setDrivePending(false);
  if(decision.action==="upload"){
   if(reason==="auto"||reason==="empty"||reason==="retry"||reason==="connect"||reason==="sync"||reason==="overwrite"){
    if(!navigator.onLine){setDrivePending(true);renderDriveCard();return}
    const notifyReason=reason==="retry"||(drivePending()&&(reason==="auto"||reason==="empty"))?"retry":reason;
    try{
     await uploadDriveSnapshot(notifyReason);
    }catch(err){
     if(err.code==="unauthorized")return;
     setDrivePending(true);
     renderDriveCard();
     if(reason==="sync"||reason==="connect"||reason==="overwrite"||reason==="retry")notify("Could not save to Google Drive.","error");
    }
   }
   return;
  }
  if(reason==="sync"){
   if(!remote.exists){
    if(!navigator.onLine){setDrivePending(true);renderDriveCard();return}
    try{
     await uploadDriveSnapshot("sync");
    }catch(err){
     if(err.code==="unauthorized")return;
     setDrivePending(true);
     renderDriveCard();
     notify("Could not save to Google Drive.","error");
    }
    return;
   }
   const message=driveDeclined()&&!decision.otherWriter
    ?"You skipped Restore. Replace the Drive backup with this phone’s data? That can erase the copy on Drive."
    :(!hasCompletedWorkouts(state)
     ?"This phone has no workouts. Replace the Drive backup with this phone’s data? That can erase the copy on Drive."
     :"A different device saved the Drive backup. Replace it with this phone’s workouts and library?");
   confirmAction(message,()=>queueDriveSave("overwrite"),true);
   return;
  }
  renderDriveCard();
 }catch(err){
  if(err.code==="unauthorized")return;
  if(reason==="auto"||reason==="empty"||reason==="retry"||reason==="overwrite")setDrivePending(true);
  else if(reason==="connect"&&hasCompletedWorkouts(state))setDrivePending(true);
  else if(reason==="sync")setDrivePending(true);
  renderDriveCard();
  if(reason==="sync"||reason==="connect"||reason==="overwrite"||reason==="retry")notify("Could not save to Google Drive.","error");
 }finally{
  driveBusy=false;
  refreshDriveUi();
  if(driveQueued){
   const next=driveQueued;
   driveQueued=null;
   runDriveHandshake(next);
  }
 }
}

function queueDriveSave(reason){
 if(!isDriveConnected()){
  if((reason==="auto"||reason==="empty")&&(lsGet(K_FILE)||lsGet(K_SAVED)||drivePending())){
   setDrivePending(true);
   notifyDriveReconnect();
   renderDriveCard();
  }
  return;
 }
 const canQueue=reason==="overwrite"||reason==="sync"||reason==="connect"||reason==="retry"||reason==="auto"||reason==="empty";
 if(!canQueue)return;
 if(reason==="auto"||reason==="empty"){
  const remoteExists=!!lsGet(K_FILE)||!!lsGet(K_REMOTE)||!!lsGet(K_SAVED);
  const preview=drivePolicy({
   hasLocalWorkouts:hasCompletedWorkouts(state),
   remoteExists,
   remoteDeviceId:lsGet(K_REMOTE),
   localDeviceId:getDeviceId(),
   restoreDeclined:driveDeclined(),
   adopted:driveAdopted(),
   flushEmpty:reason==="empty"
  });
  if(preview.action!=="upload")return;
  setDrivePending(true);
  renderDriveCard();
 }
 runDriveHandshake(reason);
}

function syncDrive(){
 if(!isDriveConnected()){connectDrive();return}
 queueDriveSave("sync");
}

function driveAfterLibraryChange(){queueDriveSave("auto")}
function driveAfterWorkoutChange(){
 if(hasCompletedWorkouts(state)){
  clearRestoreNotification();
  queueDriveSave("auto");
  return;
 }
 queueDriveSave("empty");
}
function driveAfterFileRestore(){
 if(hasCompletedWorkouts(state))clearRestoreNotification();
 if(!isDriveConnected()){
  if(lsGet(K_FILE)||lsGet(K_SAVED)){
   lsSet(K_DIVERGE,"1");
   notify("This phone was restored. Connect Google Drive, then Sync to update Drive.");
   renderDriveCard();
  }
  return;
 }
 const preview=drivePolicy({
  hasLocalWorkouts:hasCompletedWorkouts(state),
  remoteExists:!!(lsGet(K_FILE)||lsGet(K_REMOTE)||lsGet(K_SAVED)),
  remoteDeviceId:lsGet(K_REMOTE),
  localDeviceId:getDeviceId(),
  restoreDeclined:driveDeclined(),
  adopted:driveAdopted()
 });
 if(preview.action==="upload"){
  lsDel(K_DIVERGE);
  queueDriveSave("auto");
  return;
 }
 lsSet(K_DIVERGE,"1");
 notify("This phone was restored. Sync and confirm to update Google Drive.");
 renderDriveCard();
}

function openNotifications(){
 const items=[];
 if(drivePending()){
  items.push(`<button class="notice-item" type="button" onclick="openWaitingSaveNotice()"><strong>Waiting to save</strong><span>Google Drive will retry when you’re online</span></button>`);
 }
 const note=restoreNotePayload();
 if(note){
  items.push(`<button class="notice-item" type="button" onclick="openPendingDriveRestore()"><strong>Restore Drive backup</strong><span>${esc(note.savedAt?`Backup from ${formatDriveSaved(note.savedAt)}`:"Google Drive backup")}</span></button>`);
 }
 const body=items.length?`<div class="notice-list">${items.join("")}</div>`:`<p class="muted notice-empty">No notifications</p>`;
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">Notifications</h2>
  </div>
  <div class="workout-entry-scroll">${body}</div>
  <div class="modal-actions workout-modal-actions">
   <button class="primary btn-wide workout-next-button" type="button" onclick="closeModal()">Done</button>
  </div>
 `,"workout-entry-sheet");
 document.body.classList.add("workout-form-open");
}
function openWaitingSaveNotice(){
 closeModal();
 go("more");
}

async function openPendingDriveRestore(){
 if(!isDriveConnected()){
  notifyDriveReconnect();
  closeModal();
  connectDrive();
  return;
 }
 try{
  const remote=await loadDriveRemote();
  if(!remote.exists||!remote.state||!isValidState(remote.state)){
   clearRestoreNotification();
   closeModal();
   notify("Could not restore this Drive backup.","error");
   renderDriveCard();
   return;
  }
  pendingDriveRestore=remote;
  restorePrompted=false;
  showDriveRestoreSheet(remote);
 }catch(err){
  if(err.code==="unauthorized")return;
  notify("Could not restore this Drive backup.","error");
 }
}

function initDrive(){
 consumeOAuthRedirect();
 renderDriveCard();
 renderNotificationBell();
 window.addEventListener("online",()=>{if(drivePending())queueDriveSave("retry")});
 document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&isDriveConnected()&&drivePending())queueDriveSave("retry");
 });
 if(isDriveConnected())afterDriveConnected();
}
