const {hasCompletedWorkouts,driveSnapshot,parseDriveBackup,drivePolicy}=require("./drive-policy.js");
const assert=require("assert");

const local="device-a";
const other="device-b";
const state={
 muscles:[{id:"m1",name:"Chest"}],
 exercises:[{id:"e1",name:"Bench",muscleId:"m1"}],
 workouts:[{id:"w1",date:"2026-08-01",muscles:["m1"],exercises:[]}],
 activeWorkout:{date:"2026-08-29",muscles:["m1"]}
};

assert.strictEqual(hasCompletedWorkouts(state),true);
assert.strictEqual(hasCompletedWorkouts({workouts:[]}),false);

const snap=driveSnapshot(state,{version:"1",savedAt:"t",deviceId:local});
assert.strictEqual(snap.format,"workout-tracker-drive");
assert.ok(!("activeWorkout" in snap.state));
assert.strictEqual(snap.state.workouts.length,1);
assert.ok(snap.state.bin);
assert.deepStrictEqual(snap.state.bin,{workouts:[],exercises:[],muscles:[]});

const parsed=parseDriveBackup(snap);
assert.strictEqual(parsed.deviceId,local);
assert.ok(parsed.state.bin);
assert.deepStrictEqual(parsed.state.bin,{workouts:[],exercises:[],muscles:[]});
assert.strictEqual(parseDriveBackup({format:"workout-tracker-backup",state}),null);
assert.strictEqual(parseDriveBackup({foo:1}),null);

function p(extra){return drivePolicy({localDeviceId:local,...extra})}

assert.strictEqual(p({hasLocalWorkouts:true,remoteExists:false}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:true,remoteExists:true,remoteDeviceId:local}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:true,remoteExists:true,remoteDeviceId:other}).action,"need-confirm");
assert.strictEqual(p({hasLocalWorkouts:true,remoteExists:true,remoteDeviceId:""}).action,"need-confirm");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:other}).action,"offer-restore");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:local}).action,"offer-restore");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,restoreDeclined:true,remoteDeviceId:local}).action,"idle");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:false}).action,"idle");
assert.strictEqual(p({hasLocalWorkouts:true,remoteExists:true,remoteDeviceId:other,forceOverwrite:true}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:other,forceOverwrite:true}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:true,remoteExists:true,remoteDeviceId:other,adopted:true}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:true,remoteExists:true,remoteDeviceId:other,restoreDeclined:true}).action,"need-confirm");
assert.strictEqual(p({hasLocalWorkouts:true,remoteExists:true,remoteDeviceId:local,restoreDeclined:true}).action,"need-confirm");
assert.strictEqual(p({hasLocalWorkouts:true,remoteExists:true,remoteDeviceId:local,restoreDeclined:true,forceOverwrite:true}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:local,flushEmpty:true}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:false,flushEmpty:true}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:other,flushEmpty:true}).action,"need-confirm");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:local,remoteHasWorkouts:false}).action,"idle");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:local,remoteHasWorkouts:true}).action,"offer-restore");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:false,flushLibrary:true}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:local,flushLibrary:true,remoteHasWorkouts:false}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:true,remoteExists:true,remoteDeviceId:local,flushLibrary:true}).action,"upload");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:other,flushLibrary:true}).action,"need-confirm");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:local,flushLibrary:true}).action,"offer-restore");
assert.strictEqual(p({hasLocalWorkouts:false,remoteExists:true,remoteDeviceId:local,flushLibrary:true,restoreDeclined:true}).action,"need-confirm");

console.log("drive-policy tests passed");
