const {
 isValidState,
 historicalWorkoutExerciseMuscleId,
 uniqueRestoredName
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

const chest="m-chest",tri="m-tri",bench="e-bench";
const afterMove={
 muscles:[{id:chest,name:"Chest"},{id:tri,name:"Triceps"}],
 exercises:[{id:bench,name:"Bench Press",muscleId:tri}]
};
const oldWorkout={muscles:[chest],exercises:[{exerciseId:bench,sets:[{weight:80,reps:5}]}]};
assert.strictEqual(historicalWorkoutExerciseMuscleId(oldWorkout.exercises[0],oldWorkout,afterMove),chest);

assert.strictEqual(uniqueRestoredName("Chest",["Chest"]),"Chest (Restored)");
assert.strictEqual(uniqueRestoredName("Chest",["Chest","Chest (Restored)"]),"Chest (Restored 2)");
assert.strictEqual(uniqueRestoredName("Bench Press",["Bench Press"]),"Bench Press (Restored)");
