import type { ExerciseCatalogItem, MuscleGroup } from './types'

/**
 * Built-in exercise library (EXER-001).
 *
 * 45 standard compound + isolation movements spread across all six primary
 * muscle groups, covering every `type` (`weight_reps`, `bodyweight_reps`,
 * `assisted_weight`) and every `equipment` value the PRD allows.
 *
 * Ids are stable slugs (`ex_*`) instead of UUIDs for two reasons:
 *  1. they are human-readable in IndexedDB/backup JSON, and
 *  2. seeding is idempotent by id, so the catalog can grow in later versions
 *     without ever duplicating or overwriting user state.
 *
 * The `name` values are the catalogue surface shown in the Exercise Library;
 * `exercise_name_snap` on sessions snapshots them so later edits cannot rewrite
 * history (§9).
 */
const BUILT_IN = { is_custom: false, is_archived: false } as const

const SECONDARY_NONE: MuscleGroup[] = []

export const SEEDED_EXERCISES: ExerciseCatalogItem[] = [
  // ---------------------------------------------------------------- Chest --
  {
    ...BUILT_IN,
    id: 'ex_bench_press',
    name: 'Barbell Bench Press',
    target_muscle: 'chest',
    secondary_muscles: ['shoulders', 'arms'],
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'Lie flat, grip the bar just outside shoulder width, lower it to mid-chest and press back up without bouncing.',
  },
  {
    ...BUILT_IN,
    id: 'ex_incline_bench_press',
    name: 'Incline Barbell Bench Press',
    target_muscle: 'chest',
    secondary_muscles: ['shoulders', 'arms'],
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'Set the bench to 30–45°, keep the shoulder blades retracted and press the bar from the upper chest.',
  },
  {
    ...BUILT_IN,
    id: 'ex_dumbbell_bench_press',
    name: 'Dumbbell Bench Press',
    target_muscle: 'chest',
    secondary_muscles: ['arms', 'shoulders'],
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'Press both dumbbells from chest level until the arms are extended, keeping the wrists stacked over the elbows.',
  },
  {
    ...BUILT_IN,
    id: 'ex_incline_dumbbell_press',
    name: 'Incline Dumbbell Press',
    target_muscle: 'chest',
    secondary_muscles: ['shoulders', 'arms'],
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'On an incline bench, press the dumbbells up and slightly inward, stopping just short of lockout.',
  },
  {
    ...BUILT_IN,
    id: 'ex_machine_chest_press',
    name: 'Machine Chest Press',
    target_muscle: 'chest',
    secondary_muscles: ['arms'],
    equipment: 'machine',
    type: 'weight_reps',
    instructions:
      'Adjust the seat so the handles sit at mid-chest and press forward until the arms are extended.',
  },
  {
    ...BUILT_IN,
    id: 'ex_cable_fly',
    name: 'Cable Chest Fly',
    target_muscle: 'chest',
    secondary_muscles: ['shoulders'],
    equipment: 'cable',
    type: 'weight_reps',
    instructions:
      'With a slight elbow bend, bring both handles together in front of the chest and control the return.',
  },
  {
    ...BUILT_IN,
    id: 'ex_push_up',
    name: 'Push-Up',
    target_muscle: 'chest',
    secondary_muscles: ['arms', 'shoulders', 'core'],
    equipment: 'bodyweight',
    type: 'bodyweight_reps',
    instructions:
      'Keep the body in a straight line from head to heels, lower the chest to the floor and press back up.',
  },

  // ----------------------------------------------------------------- Back --
  {
    ...BUILT_IN,
    id: 'ex_deadlift',
    name: 'Barbell Deadlift',
    target_muscle: 'back',
    secondary_muscles: ['legs', 'core'],
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'Hinge at the hips with a flat back, drive through the floor and stand tall while keeping the bar close to the legs.',
  },
  {
    ...BUILT_IN,
    id: 'ex_barbell_row',
    name: 'Barbell Bent-Over Row',
    target_muscle: 'back',
    secondary_muscles: ['arms', 'shoulders'],
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'Hinge to roughly 45°, pull the bar to the lower ribs and lower it under control without jerking the torso.',
  },
  {
    ...BUILT_IN,
    id: 'ex_t_bar_row',
    name: 'T-Bar Row',
    target_muscle: 'back',
    secondary_muscles: ['arms'],
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'Keep the chest up, pull the handles toward the sternum and control the eccentric.',
  },
  {
    ...BUILT_IN,
    id: 'ex_one_arm_dumbbell_row',
    name: 'One-Arm Dumbbell Row',
    target_muscle: 'back',
    secondary_muscles: ['arms'],
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'Brace one hand on the bench, row the dumbbell toward the hip and lower it to a full stretch.',
  },
  {
    ...BUILT_IN,
    id: 'ex_lat_pulldown',
    name: 'Lat Pulldown',
    target_muscle: 'back',
    secondary_muscles: ['arms'],
    equipment: 'cable',
    type: 'weight_reps',
    instructions:
      'Pull the bar to the upper chest by driving the elbows down, then let it rise with control.',
  },
  {
    ...BUILT_IN,
    id: 'ex_seated_cable_row',
    name: 'Seated Cable Row',
    target_muscle: 'back',
    secondary_muscles: ['arms', 'shoulders'],
    equipment: 'cable',
    type: 'weight_reps',
    instructions:
      'Sit tall, pull the handle to the abdomen and squeeze the shoulder blades together.',
  },
  {
    ...BUILT_IN,
    id: 'ex_pull_up',
    name: 'Pull-Up',
    target_muscle: 'back',
    secondary_muscles: ['arms'],
    equipment: 'bodyweight',
    type: 'bodyweight_reps',
    instructions:
      'Hang with an overhand grip, pull the chin over the bar and lower back to a full hang.',
  },
  {
    ...BUILT_IN,
    id: 'ex_chin_up',
    name: 'Chin-Up',
    target_muscle: 'back',
    secondary_muscles: ['arms'],
    equipment: 'bodyweight',
    type: 'bodyweight_reps',
    instructions:
      'Use a supinated grip, pull the chest toward the bar and lower with control.',
  },
  {
    ...BUILT_IN,
    id: 'ex_weighted_pull_up',
    name: 'Weighted Pull-Up',
    target_muscle: 'back',
    secondary_muscles: ['arms'],
    equipment: 'weighted_bodyweight',
    type: 'weight_reps',
    instructions:
      'Add load with a dip belt or a dumbbell between the feet, then perform a strict pull-up. Log the added weight.',
  },
  {
    ...BUILT_IN,
    id: 'ex_assisted_pull_up',
    name: 'Assisted Pull-Up',
    target_muscle: 'back',
    secondary_muscles: ['arms'],
    equipment: 'machine',
    type: 'assisted_weight',
    instructions:
      'Set the assistance weight and perform a pull-up; log the assistance load as the weight.',
  },

  // ----------------------------------------------------------------- Legs --
  {
    ...BUILT_IN,
    id: 'ex_back_squat',
    name: 'Barbell Back Squat',
    target_muscle: 'legs',
    secondary_muscles: ['core'],
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'Brace the core, sit down between the hips to at least parallel and drive up through the mid-foot.',
  },
  {
    ...BUILT_IN,
    id: 'ex_front_squat',
    name: 'Barbell Front Squat',
    target_muscle: 'legs',
    secondary_muscles: ['core'],
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'Keep the elbows high with the bar on the front delts and squat down while keeping the torso upright.',
  },
  {
    ...BUILT_IN,
    id: 'ex_goblet_squat',
    name: 'Goblet Squat',
    target_muscle: 'legs',
    secondary_muscles: ['core'],
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'Hold a dumbbell at the chest, squat down between the knees and stand back up.',
  },
  {
    ...BUILT_IN,
    id: 'ex_bulgarian_split_squat',
    name: 'Bulgarian Split Squat',
    target_muscle: 'legs',
    secondary_muscles: ['core'],
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'With the rear foot elevated, lower the back knee toward the floor and drive up through the front heel.',
  },
  {
    ...BUILT_IN,
    id: 'ex_leg_press',
    name: 'Leg Press',
    target_muscle: 'legs',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'machine',
    type: 'weight_reps',
    instructions:
      'Lower the platform until the knees reach about 90° and press back without locking the knees.',
  },
  {
    ...BUILT_IN,
    id: 'ex_leg_extension',
    name: 'Leg Extension',
    target_muscle: 'legs',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'machine',
    type: 'weight_reps',
    instructions:
      'Extend the knees fully, pause briefly at the top and lower under control.',
  },
  {
    ...BUILT_IN,
    id: 'ex_lying_leg_curl',
    name: 'Lying Leg Curl',
    target_muscle: 'legs',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'machine',
    type: 'weight_reps',
    instructions:
      'Curl the pad toward the glutes and lower it slowly without lifting the hips.',
  },
  {
    ...BUILT_IN,
    id: 'ex_romanian_deadlift',
    name: 'Romanian Deadlift',
    target_muscle: 'legs',
    secondary_muscles: ['back'],
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'Keep a slight knee bend and push the hips back until the hamstrings stretch, then stand tall.',
  },
  {
    ...BUILT_IN,
    id: 'ex_hip_thrust',
    name: 'Barbell Hip Thrust',
    target_muscle: 'legs',
    secondary_muscles: ['core'],
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'With the upper back on a bench, drive the hips up until the torso is parallel and squeeze the glutes.',
  },
  {
    ...BUILT_IN,
    id: 'ex_standing_calf_raise',
    name: 'Standing Calf Raise',
    target_muscle: 'legs',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'machine',
    type: 'weight_reps',
    instructions:
      'Rise onto the balls of the feet, pause at the top and lower until the heels drop below the platform.',
  },

  // ------------------------------------------------------------ Shoulders --
  {
    ...BUILT_IN,
    id: 'ex_overhead_press',
    name: 'Overhead Barbell Press',
    target_muscle: 'shoulders',
    secondary_muscles: ['arms', 'core'],
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'From shoulder height, press the bar overhead and finish with the biceps next to the ears.',
  },
  {
    ...BUILT_IN,
    id: 'ex_dumbbell_shoulder_press',
    name: 'Dumbbell Shoulder Press',
    target_muscle: 'shoulders',
    secondary_muscles: ['arms'],
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'Press both dumbbells overhead until the arms are extended while keeping the ribs down.',
  },
  {
    ...BUILT_IN,
    id: 'ex_arnold_press',
    name: 'Arnold Press',
    target_muscle: 'shoulders',
    secondary_muscles: ['arms'],
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'Start with the palms facing you and rotate them outward while pressing overhead.',
  },
  {
    ...BUILT_IN,
    id: 'ex_lateral_raise',
    name: 'Dumbbell Lateral Raise',
    target_muscle: 'shoulders',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'Raise the dumbbells out to the sides to shoulder height with a slight elbow bend.',
  },
  {
    ...BUILT_IN,
    id: 'ex_rear_delt_fly',
    name: 'Rear Delt Fly',
    target_muscle: 'shoulders',
    secondary_muscles: ['back'],
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'Hinge forward slightly and raise the dumbbells out to the sides, squeezing the rear delts.',
  },
  {
    ...BUILT_IN,
    id: 'ex_face_pull',
    name: 'Cable Face Pull',
    target_muscle: 'shoulders',
    secondary_muscles: ['back'],
    equipment: 'cable',
    type: 'weight_reps',
    instructions:
      'Pull the rope toward the face with high elbows and rotate the hands outward at the end.',
  },

  // ----------------------------------------------------------------- Arms --
  {
    ...BUILT_IN,
    id: 'ex_barbell_curl',
    name: 'Barbell Curl',
    target_muscle: 'arms',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'Curl the bar without swinging the torso and lower it fully under control.',
  },
  {
    ...BUILT_IN,
    id: 'ex_dumbbell_curl',
    name: 'Dumbbell Bicep Curl',
    target_muscle: 'arms',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'Curl one dumbbell at a time while keeping the elbow pinned to the side.',
  },
  {
    ...BUILT_IN,
    id: 'ex_hammer_curl',
    name: 'Hammer Curl',
    target_muscle: 'arms',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'Keep a neutral grip and curl the dumbbells without rotating the wrists.',
  },
  {
    ...BUILT_IN,
    id: 'ex_triceps_pushdown',
    name: 'Cable Triceps Pushdown',
    target_muscle: 'arms',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'cable',
    type: 'weight_reps',
    instructions:
      'Keep the elbows at the sides, extend the arms fully and control the return.',
  },
  {
    ...BUILT_IN,
    id: 'ex_overhead_cable_triceps_extension',
    name: 'Overhead Cable Triceps Extension',
    target_muscle: 'arms',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'cable',
    type: 'weight_reps',
    instructions:
      'With the elbows high, extend the rope overhead and return slowly.',
  },
  {
    ...BUILT_IN,
    id: 'ex_lying_triceps_extension',
    name: 'Lying Triceps Extension',
    target_muscle: 'arms',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'barbell',
    type: 'weight_reps',
    instructions:
      'Lower the bar toward the forehead by bending the elbows, then extend without flaring them.',
  },
  {
    ...BUILT_IN,
    id: 'ex_triceps_dip',
    name: 'Triceps Dip',
    target_muscle: 'arms',
    secondary_muscles: ['chest', 'shoulders'],
    equipment: 'bodyweight',
    type: 'bodyweight_reps',
    instructions:
      'Lower until the elbows reach about 90° and press back up while keeping the torso fairly upright.',
  },
  {
    ...BUILT_IN,
    id: 'ex_weighted_dip',
    name: 'Weighted Dip',
    target_muscle: 'arms',
    secondary_muscles: ['chest', 'shoulders'],
    equipment: 'weighted_bodyweight',
    type: 'weight_reps',
    instructions:
      'Add load with a dip belt or a dumbbell between the feet, then lower and press to full extension. Log the added weight.',
  },

  // ----------------------------------------------------------------- Core --
  {
    ...BUILT_IN,
    id: 'ex_hanging_leg_raise',
    name: 'Hanging Leg Raise',
    target_muscle: 'core',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'bodyweight',
    type: 'bodyweight_reps',
    instructions:
      'Hang from the bar and raise the legs to hip height or above without swinging.',
  },
  {
    ...BUILT_IN,
    id: 'ex_cable_crunch',
    name: 'Cable Crunch',
    target_muscle: 'core',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'cable',
    type: 'weight_reps',
    instructions:
      'Kneel facing the stack, crunch down by rounding the spine and control the return.',
  },
  {
    ...BUILT_IN,
    id: 'ex_ab_wheel_rollout',
    name: 'Ab Wheel Rollout',
    target_muscle: 'core',
    secondary_muscles: ['shoulders'],
    equipment: 'bodyweight',
    type: 'bodyweight_reps',
    instructions:
      'Roll the wheel forward while keeping the hips tucked, then pull back to the start.',
  },
  {
    ...BUILT_IN,
    id: 'ex_russian_twist',
    name: 'Russian Twist',
    target_muscle: 'core',
    secondary_muscles: SECONDARY_NONE,
    equipment: 'dumbbell',
    type: 'weight_reps',
    instructions:
      'Sit with the torso leaned back and rotate the weight from side to side under control.',
  },
]
