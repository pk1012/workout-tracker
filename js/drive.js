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
const K_HASH="wt_drive_sync_hash";
const K_PENDING_WHY="wt_drive_pending_why";

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
 btn.classList.toggle("has-unread",!!((lsGet(K_RESTORE_NOTE)&&!hasCompletedWorkouts(state))||drivePending()||hasDivergeNotice()));
}
function hasDivergeNotice(){return lsGet(K_DIVERGE)==="1"&&!drivePending()}
function setDriveDiverge(on){
 if(on)lsSet(K_DIVERGE,"1");
 else lsDel(K_DIVERGE);
 refreshDriveUi();
}
function refreshDriveUi(){
 if(typeof renderDriveCard==="function")renderDriveCard();
 if(typeof renderNotificationBell==="function")renderNotificationBell();
}
function setDrivePending(on,why){
 if(on){
  lsSet(K_PENDING,"1");
  if(why)lsSet(K_PENDING_WHY,why);
 }else{
  lsDel(K_PENDING);
  lsDel(K_PENDING_WHY);
 }
 refreshDriveUi();
}
function drivePendingWhy(){return lsGet(K_PENDING_WHY)}
function classifyDriveFail(err){
 if(err&&(err.code==="folder"||err.message==="folder"))return "folder";
 if(typeof navigator!=="undefined"&&navigator.onLine===false)return "offline";
 if(err&&err.name==="TypeError")return "offline";
 return "retry";
}
function drivePendingDetail(){
 const why=drivePendingWhy();
 if(why==="folder")return "Workout Tracker folder not found on Drive";
 if(why==="retry")return "Couldn’t reach Google Drive. Will keep trying";
 return "Google Drive will retry when you’re online";
}

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
 if(!opts.keepMeta){lsDel(K_FILE);lsDel(K_FOLDER);lsDel(K_SAVED);lsDel(K_REMOTE);lsDel(K_HASH)}
 if(!opts.keepPending){lsDel(K_PENDING);lsDel(K_PENDING_WHY)}
 if(!opts.keepDeclined)lsDel(K_DECLINED);
 if(!opts.keepAdopted)lsDel(K_ADOPTED);
}
function drivePending(){return lsGet(K_PENDING)==="1"}
function driveDeclined(){return lsGet(K_DECLINED)==="1"}
function driveAdopted(){return lsGet(K_ADOPTED)==="1"}
function driveStateHash(){
 return typeof driveContentHash==="function"?driveContentHash(state):"";
}
function markDriveSynced(){const h=driveStateHash();if(h)lsSet(K_HASH,h)}
function isDriveDirty(){
 const cur=driveStateHash();
 const prev=lsGet(K_HASH);
 if(!cur)return true;
 if(!prev)return true;
 return cur!==prev;
}

function formatDriveSaved(iso){
 if(!iso)return "";
 const d=new Date(iso);
 if(Number.isNaN(d.getTime()))return "";
 return d.toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});
}

function driveStatusLine(){
 if(drivePending())return `Waiting to save. ${drivePendingDetail()}`;
 if(lsGet(K_DIVERGE)==="1")return "Phone and Drive differ. Sync to update.";
 const saved=lsGet(K_SAVED);
 if(saved)return `Last saved ${formatDriveSaved(saved)}`;
 if(!hasCompletedWorkouts(state))return "No workouts to save yet";
 return "Not saved yet";
}

function driveSyncNeeded(){
 if(drivePending())return true;
 if(lsGet(K_DIVERGE)==="1")return true;
 if(!lsGet(K_SAVED))return true;
 return isDriveDirty();
}

function renderDriveCard(){
 const host=document.getElementById("driveCard");
 if(!host)return;
 if(!isDriveConnected()){
  const desc=drivePending()?"Connect again to save to Drive":(lsGet(K_DIVERGE)==="1"?"Phone and Drive differ. Connect to update.":"Connect to keep a copy off this phone");
  host.innerHTML=`<button class="setting card" type="button" onclick="connectDrive()"><span class="setting-icon" data-glyph="cloud"><svg class="icon"><use href="#cloud"/></svg></span><span class="setting-main"><span class="setting-title">Google Drive</span><span class="setting-desc">${esc(desc)}</span></span><span class="chevron"><svg class="icon" aria-hidden="true"><use href="#chevron-right"/></svg></span></button>`;
  return;
 }
 const email=lsGet(K_EMAIL)||"Google Drive";
 const showRestore=!!(lsGet(K_RESTORE_NOTE)&&!hasCompletedWorkouts(state));
 const restoreBtn=showRestore?`<button class="primary drive-restore" type="button" onclick="openPendingDriveRestore()">Restore</button>`:"";
 const syncOff=!driveSyncNeeded();
 const syncBtn=syncOff
  ?`<button class="primary" type="button" disabled aria-disabled="true">Sync</button>`
  :`<button class="primary" type="button" onclick="syncDrive()">Sync</button>`;
 host.innerHTML=`<div class="setting card drive-card${showRestore?" has-restore":""}"><span class="setting-icon" data-glyph="cloud"><svg class="icon"><use href="#cloud"/></svg></span><span class="setting-main"><span class="setting-title">${esc(email)}</span><span class="setting-desc">${esc(driveStatusLine())}</span></span>${restoreBtn}<div class="drive-actions">${syncBtn}<button class="outline" type="button" onclick="disconnectDrive()">Disconnect</button></div></div>`;
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
  setDriveDiverge(false);
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
 setDriveDiverge(false);
 lsDel(K_HASH);
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
  pageSize:"50",
  orderBy:"modifiedTime desc"
 });
 const res=await driveApi(`https://www.googleapis.com/drive/v3/files?${params}`);
 if(!res.ok)return [];
 const data=await res.json();
 return data.files||[];
}

async function driveFileMeta(id){
 if(!id)return null;
 const check=await driveApi(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,trashed,name,modifiedTime,appProperties,parents`);
 if(check.status===404)return null;
 if(!check.ok)return {id,unverified:true};
 const info=await check.json();
 if(info.trashed)return null;
 return info;
}

function driveBackupSavedAt(file,parsed){
 return parsed?.savedAt||file?.appProperties?.savedAt||file?.modifiedTime||"";
}

async function readDriveBackup(file){
 const res=await driveApi(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
 if(res.status===404)return null;
 if(!res.ok)throw new Error("download");
 let payload;
 try{payload=await res.json()}catch(err){return {file,parsed:null,unreadable:true}}
 const parsed=parseDriveBackup(payload);
 return {file,parsed,unreadable:!parsed};
}

function rememberDriveBackup(read){
 if(!read?.file?.id)return;
 lsSet(K_FILE,read.file.id);
 if(read.file.parents&&read.file.parents[0])lsSet(K_FOLDER,read.file.parents[0]);
 const deviceId=read.parsed?.deviceId||read.file.appProperties?.deviceId||"";
 const savedAt=driveBackupSavedAt(read.file,read.parsed);
 if(deviceId)lsSet(K_REMOTE,deviceId);
 if(savedAt&&!drivePending())lsSet(K_SAVED,savedAt);
}

function driveRemoteFromRead(read){
 if(!read?.file?.id)return {exists:false,deviceId:"",savedAt:"",state:null,fileId:""};
 const deviceId=read.parsed?.deviceId||read.file.appProperties?.deviceId||"";
 const savedAt=driveBackupSavedAt(read.file,read.parsed);
 return {exists:true,deviceId,savedAt,state:read.parsed?read.parsed.state:null,fileId:read.file.id,unreadable:!read.parsed};
}

async function pickNewestValidBackup(files){
 const valid=[];
 for(const file of files||[]){
  const read=await readDriveBackup(file);
  if(!read)continue;
  if(read.parsed)valid.push(read);
 }
 if(!valid.length)return null;
 valid.sort((a,b)=>{
  const at=Date.parse(driveBackupSavedAt(a.file,a.parsed))||0;
  const bt=Date.parse(driveBackupSavedAt(b.file,b.parsed))||0;
  return bt-at;
 });
 return valid[0];
}

async function listDriveBackupFiles(folderId){
 const inFolder=folderId?` and '${folderId}' in parents`:"";
 return driveFind(`name='${DRIVE_FILE_NAME}' and trashed=false${inFolder}`);
}

async function listDriveFolders(){
 return driveFind(`name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
}

async function parentFolderOfFile(fileId){
 const live=await driveFileMeta(fileId);
 if(!live||live.unverified)return "";
 return (live.parents&&live.parents[0])||"";
}

async function folderOfNewestBackup(folders){
 let best=null,id="";
 for(const folder of folders||[]){
  const read=await pickNewestValidBackup(await listDriveBackupFiles(folder.id));
  if(!read)continue;
  if(!best){best=read;id=folder.id;continue}
  const at=Date.parse(driveBackupSavedAt(read.file,read.parsed))||0;
  const bt=Date.parse(driveBackupSavedAt(best.file,best.parsed))||0;
  if(at>bt){best=read;id=folder.id}
 }
 return id;
}

async function ensureDriveFolder(){
 const cached=lsGet(K_FOLDER);
 if(cached){
  const live=await driveFileMeta(cached);
  if(live)return cached;
  lsDel(K_FOLDER);
 }
 const fromFile=await parentFolderOfFile(lsGet(K_FILE));
 if(fromFile){lsSet(K_FOLDER,fromFile);return fromFile}
 const found=await listDriveFolders();
 if(found.length===1){lsSet(K_FOLDER,found[0].id);return found[0].id}
 if(found.length>1){
  const withBackup=await folderOfNewestBackup(found);
  if(withBackup){lsSet(K_FOLDER,withBackup);return withBackup}
  const anywhere=await pickNewestValidBackup(await listDriveBackupFiles(""));
  const parent=anywhere?.file?.parents&&anywhere.file.parents[0];
  if(parent){lsSet(K_FOLDER,parent);return parent}
  lsSet(K_FOLDER,found[0].id);
  return found[0].id;
 }
 const res=await driveApi("https://www.googleapis.com/drive/v3/files",{
  method:"POST",
  body:JSON.stringify({name:DRIVE_FOLDER_NAME,mimeType:"application/vnd.google-apps.folder"})
 });
 if(!res.ok)throw Object.assign(new Error("folder"),{code:"folder"});
 const created=await res.json();
 lsSet(K_FOLDER,created.id);
 return created.id;
}

async function loadDriveRemote(){
 const cachedId=lsGet(K_FILE);
 if(cachedId){
  const live=await driveFileMeta(cachedId);
  if(live?.unverified){
   const read=await readDriveBackup({id:cachedId,appProperties:{}});
   if(read){rememberDriveBackup(read);return driveRemoteFromRead(read)}
   lsDel(K_FILE);
  }else if(live){
   const read=await readDriveBackup(live);
   if(!read){lsDel(K_FILE)}
   else {rememberDriveBackup(read);return driveRemoteFromRead(read)}
  }else lsDel(K_FILE);
 }
 let folderId=lsGet(K_FOLDER);
 if(folderId){
  const live=await driveFileMeta(folderId);
  if(!live){lsDel(K_FOLDER);folderId=""}
 }
 if(!folderId){
  const folders=await listDriveFolders();
  if(folders.length===1){folderId=folders[0].id;lsSet(K_FOLDER,folderId)}
 }
 let files=folderId?await listDriveBackupFiles(folderId):[];
 if(!files.length)files=await listDriveBackupFiles("");
 if(!files.length){
  lsDel(K_FILE);
  return {exists:false,deviceId:"",savedAt:"",state:null,fileId:""};
 }
 const best=await pickNewestValidBackup(files);
 if(!best)return {exists:true,deviceId:"",savedAt:"",state:null,fileId:"",unreadable:true};
 rememberDriveBackup(best);
 return driveRemoteFromRead(best);
}

async function uploadDriveSnapshot(reason,retried){
 const savedAt=new Date().toISOString();
 const deviceId=getDeviceId();
 const payload=driveSnapshot(state,{version:VERSION,savedAt,deviceId});
 const body=JSON.stringify(payload);
 const folderId=await ensureDriveFolder();
 let fileId=lsGet(K_FILE);
 if(fileId){
  const live=await driveFileMeta(fileId);
  if(!live)fileId="";
 }
 const meta={
  name:DRIVE_FILE_NAME,
  appProperties:{deviceId,savedAt}
 };
 if(!fileId){
  const existing=await pickNewestValidBackup(await listDriveBackupFiles(folderId));
  if(existing){fileId=existing.file.id;lsSet(K_FILE,fileId)}
 }
 if(!fileId){
  const createdRes=await driveApi("https://www.googleapis.com/drive/v3/files?fields=id",{
   method:"POST",
   body:JSON.stringify({...meta,parents:[folderId]})
  });
  if(!createdRes.ok){
   if(createdRes.status===404){
    lsDel(K_FOLDER);
    if(!retried)return uploadDriveSnapshot(reason,true);
    throw Object.assign(new Error("folder"),{code:"folder"});
   }
   throw new Error("create");
  }
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
 setDriveDiverge(false);
 clearRestoreNotification();
 markDriveSynced();
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
   <div class="muted workout-form-description">This phone has no workouts. Google Drive has a backup${remote.savedAt?` from ${esc(formatDriveSaved(remote.savedAt))}`:""}. Restore replaces data on this phone. Drive is not changed yet.</div>
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
 state=migrateState(next);
 save();
 lsDel(K_ADOPTED);
 lsDel(K_DECLINED);
 if(remote.deviceId)lsSet(K_REMOTE,remote.deviceId);
 if(remote.savedAt)lsSet(K_SAVED,remote.savedAt);
 markDriveSynced();
 setDriveDiverge(false);
 setDrivePending(false);
 clearRestoreNotification();
 selected=new Date();selected.setHours(0,0,0,0);if(typeof monthStart==="function")selectedMonth=monthStart(selected);
 closeModal();
 go("workouts");
 notify("Backup restored successfully.","success");
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
async function bootDrive(){
 if(!isDriveConnected())return;
 try{await fetchUserEmail()}catch(err){if(err.code==="unauthorized")return; }
 renderDriveCard();
 await runDriveHandshake("boot");
}

async function runDriveHandshake(reason){
 if(!isDriveConnected())return;
 if(driveBusy){driveQueued=reason;return}
 if(!navigator.onLine){
  const wait=reason==="auto"||reason==="empty"||reason==="library"||reason==="retry"||reason==="overwrite"||reason==="sync"||(reason==="connect"&&(hasCompletedWorkouts(state)||driveAdopted()))||(reason==="boot"&&(drivePending()||isDriveDirty()));
  if(wait)setDrivePending(true,"offline");
  renderDriveCard();
  return;
 }
 driveBusy=true;
 try{
  const remote=await loadDriveRemote();
  const contentSame=!remote.unreadable&&!!remote.state&&driveContentHash(state)===driveContentHash(remote.state);
  const decision=drivePolicy({
   hasLocalWorkouts:hasCompletedWorkouts(state),
   remoteExists:remote.exists,
   remoteDeviceId:remote.deviceId,
   localDeviceId:getDeviceId(),
   restoreDeclined:driveDeclined(),
   adopted:driveAdopted(),
   forceOverwrite:reason==="overwrite",
   flushEmpty:reason==="empty",
   flushLibrary:reason==="library",
   remoteHasWorkouts:remote.unreadable?true:hasCompletedWorkouts(remote.state),
   contentSame
  });
  if(decision.action==="idle"){
   if(contentSame){
    setDriveDiverge(false);
    markDriveSynced();
    setDrivePending(false);
   }
   renderDriveCard();
   return;
  }
  if(decision.action==="offer-restore"){
   setDrivePending(false);
   if(reason==="library"){renderDriveCard();return}
   if(remote.unreadable||!remote.state||!isValidState(remote.state)){
    notify("Drive backup could not be read.","error");
   }else{
    pendingDriveRestore=remote;
    showDriveRestoreSheet(remote);
   }
   renderDriveCard();
   return;
  }
  if(decision.action==="need-confirm"){
   setDrivePending(false);
   setDriveDiverge(true);
  }
  if(decision.action==="upload"){
   const allowUpload=reason==="auto"||reason==="empty"||reason==="library"||reason==="retry"||reason==="connect"||reason==="sync"||reason==="overwrite"||(reason==="boot"&&(drivePending()||isDriveDirty()||!remote.exists));
   if(allowUpload){
    if(!navigator.onLine){setDrivePending(true,"offline");renderDriveCard();return}
    const notifyReason=reason==="retry"||(drivePending()&&(reason==="auto"||reason==="empty"||reason==="library"||reason==="boot"))?"retry":reason;
    try{
     await uploadDriveSnapshot(notifyReason);
    }catch(err){
     if(err.code==="unauthorized")return;
     setDrivePending(true,classifyDriveFail(err));
     renderDriveCard();
     if(reason==="sync"||reason==="connect"||reason==="overwrite"||reason==="retry")notify("Could not save to Google Drive.","error");
    }
   }
   return;
  }
  if(reason==="sync"){
   if(!remote.exists){
    if(!navigator.onLine){setDrivePending(true,"offline");renderDriveCard();return}
    try{
     await uploadDriveSnapshot("sync");
    }catch(err){
     if(err.code==="unauthorized")return;
     setDrivePending(true,classifyDriveFail(err));
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
  const why=classifyDriveFail(err);
  if(reason==="auto"||reason==="empty"||reason==="library"||reason==="retry"||reason==="overwrite")setDrivePending(true,why);
  else if(reason==="boot"&&(drivePending()||isDriveDirty()))setDrivePending(true,why);
  else if(reason==="connect"&&hasCompletedWorkouts(state))setDrivePending(true,why);
  else if(reason==="sync")setDrivePending(true,why);
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
  if((reason==="auto"||reason==="empty"||reason==="library")&&(lsGet(K_FILE)||lsGet(K_SAVED)||drivePending())){
   setDrivePending(true);
   notifyDriveReconnect();
   renderDriveCard();
  }
  return;
 }
 const canQueue=reason==="overwrite"||reason==="sync"||reason==="connect"||reason==="retry"||reason==="auto"||reason==="empty"||reason==="library";
 if(!canQueue)return;
 if(reason==="auto"||reason==="empty"||reason==="library"){
  const remoteExists=!!lsGet(K_FILE)||!!lsGet(K_REMOTE)||!!lsGet(K_SAVED);
  const preview=drivePolicy({
   hasLocalWorkouts:hasCompletedWorkouts(state),
   remoteExists,
   remoteDeviceId:lsGet(K_REMOTE),
   localDeviceId:getDeviceId(),
   restoreDeclined:driveDeclined(),
   adopted:driveAdopted(),
   flushEmpty:reason==="empty",
   flushLibrary:reason==="library",
   contentSame:!isDriveDirty()
  });
  if(preview.action!=="upload"){
   if(preview.action==="idle"&&!isDriveDirty())setDriveDiverge(false);
   else if(preview.action==="need-confirm")setDriveDiverge(true);
   return;
  }
  setDrivePending(true);
  renderDriveCard();
 }
 runDriveHandshake(reason);
}

function syncDrive(){
 if(!isDriveConnected()){connectDrive();return}
 if(!driveSyncNeeded()){renderDriveCard();return}
 queueDriveSave("sync");
}

function driveAfterLibraryChange(){queueDriveSave("library")}
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
   setDriveDiverge(true);
   notify("This phone was restored. Connect Google Drive, then Sync to update Drive.");
  }
  return;
 }
 const preview=drivePolicy({
  hasLocalWorkouts:hasCompletedWorkouts(state),
  remoteExists:!!(lsGet(K_FILE)||lsGet(K_REMOTE)||lsGet(K_SAVED)),
  remoteDeviceId:lsGet(K_REMOTE),
  localDeviceId:getDeviceId(),
  restoreDeclined:driveDeclined(),
  adopted:driveAdopted(),
  contentSame:!isDriveDirty()
 });
 if(preview.action==="upload"){
  setDriveDiverge(false);
  queueDriveSave("auto");
  return;
 }
 if(preview.action==="idle"){
  setDriveDiverge(false);
  return;
 }
 setDriveDiverge(true);
 notify("This phone was restored. Sync and confirm to update Google Drive.");
}

function openNotifications(){
 const items=[];
 if(drivePending()){
  items.push(`<button class="notice-item" type="button" onclick="openWaitingSaveNotice()"><strong>Waiting to save</strong><span>${esc(drivePendingDetail())}</span></button>`);
 }else if(hasDivergeNotice()){
  items.push(`<button class="notice-item" type="button" onclick="openDriveDivergeNotice()"><strong>Phone and Drive differ</strong><span>Sync to update Drive</span></button>`);
 }
 const note=restoreNotePayload();
 if(note){
  items.push(`<button class="notice-item" type="button" onclick="openPendingDriveRestore()"><strong>Restore Drive backup</strong><span>${esc(note.savedAt?`Backup from ${formatDriveSaved(note.savedAt)}`:"Google Drive backup")}</span></button>`);
 }
 const body=items.length?`<div class="notice-list">${items.join("")}</div>`:`<div class="card empty-panel"><svg class="icon" aria-hidden="true"><use href="#bell"/></svg><strong>No notifications</strong><span>Save and Drive alerts show up here.</span></div>`;
 modal(`
  <div class="workout-entry-header">
   <div class="handle"></div>
   <h2 class="workout-form-title">Notifications</h2>
  </div>
  <div class="workout-entry-scroll${items.length?"":" notice-empty-scroll"}">${body}</div>
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
function openDriveDivergeNotice(){
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
 const justConnected=consumeOAuthRedirect();
 renderDriveCard();
 renderNotificationBell();
 window.addEventListener("online",()=>{if(drivePending())queueDriveSave("retry")});
 document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&isDriveConnected()&&drivePending())queueDriveSave("retry");
 });
 if(!isDriveConnected())return;
 if(justConnected)afterDriveConnected();
 else bootDrive();
}
