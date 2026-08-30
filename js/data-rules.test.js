const {
 isValidState,
 historicalWorkoutExerciseMuscleId,
 uniqueRestoredName,
 findWorkoutOnDate,
 stampWorkoutExerciseMuscleIds
}=require("./data-rules.js");
const assert=require("assert");

const good={
 muscles:[{id:"m1",name:"Chest"}],
 exercises:[{id:"e1",name:"Bench Press",muscleId:"m1"}],
 workouts:[{
  id:"w1",
  date:"2026-08-01",
  muscles:["m1"],
  exercises:[{exerciseId:"e1",sets:[{weight:60,reps:8}],unit:"kg"}]
 }]
};
assert.strictEqual(isValidState(good),true);

const dup={
 ...good,
 workouts:[
  {...good.workouts[0],id:"w1",date:"2026-08-01"},
  {...good.workouts[0],id:"w1",date:"2026-08-02"}
 ]
};
assert.strictEqual(isValidState(dup),false);

const sameDay={
 ...good,
 workouts:[
  {...good.workouts[0],id:"w1",date:"2026-08-01"},
  {...good.workouts[0],id:"w2",date:"2026-08-01"}
 ]
};
assert.strictEqual(isValidState(sameDay),false);

const chest="m-chest",tri="m-tri",bench="e-bench";
const afterMove={
 muscles:[{id:chest,name:"Chest"},{id:tri,name:"Triceps"}],
 exercises:[{id:bench,name:"Bench Press",muscleId:tri}]
};
const oldWorkout={muscles:[chest],exercises:[{exerciseId:bench,sets:[{weight:80,reps:5}]}]};
assert.strictEqual(historicalWorkoutExerciseMuscleId(oldWorkout.exercises[0],oldWorkout,afterMove),chest);
const stamped=stampWorkoutExerciseMuscleIds(oldWorkout,afterMove);
assert.strictEqual(stamped.exercises[0].muscleId,chest);

const day="2026-08-01";
const listed=[{id:"w1",date:day},{id:"w2",date:"2026-08-02"}];
assert.strictEqual(findWorkoutOnDate(listed,day).id,"w1");
assert.strictEqual(findWorkoutOnDate(listed,day,"w1"),null);
assert.strictEqual(findWorkoutOnDate(listed,"2026-08-03"),null);

assert.strictEqual(uniqueRestoredName("Chest",["Chest"]),"Chest (Restored)");
assert.strictEqual(uniqueRestoredName("Chest",["Chest","Chest (Restored)"]),"Chest (Restored 2)");
assert.strictEqual(uniqueRestoredName("Bench Press",["Bench Press"]),"Bench Press (Restored)");
