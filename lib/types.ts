export interface Profile {
  id: string
  name: string
  email: string
  role: 'admin' | 'coach' | 'member'
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  age?: number
  weight_kg?: number
  weight_unit?: 'kg' | 'lbs'
  created_at: string
}

export interface Workout {
  id: string
  user_id: string
  title: string
  type: 'conditioning' | 'basketball' | 'both'
  notes?: string
  duration?: number
  date: string
  created_at: string
}

export interface Exercise {
  id: string
  workout_id: string
  name: string
  sets?: number
  reps?: number
  weight?: number
  duration?: number
  distance?: number
  notes?: string
}

export interface WorkoutPlan {
  id: string
  coach_id: string
  member_id?: string
  title: string
  description?: string
  type: 'conditioning' | 'basketball' | 'both'
  scheduled_date: string
  status: 'pending' | 'completed' | 'skipped' | 'rescheduled'
  rescheduled_date?: string
  completed_at?: string
  auto_logged_workout_id?: string
  template_id?: string
  created_at: string
}

export interface WorkoutTemplate {
  id: string
  created_by: string
  title: string
  description?: string
  type: 'conditioning' | 'basketball' | 'both'
  is_shared: boolean
  is_default: boolean
  is_visible_to_members: boolean
  created_at: string
  updated_at: string
}

export interface WorkoutTemplateExercise {
  id: string
  template_id: string
  name: string
  sets?: number
  reps?: number
  weight?: number
  duration?: number
  distance?: number
  notes?: string
  order_index: number
}

export interface PersonalRecord {
  id: string
  user_id: string
  exercise_name: string
  value: number
  unit: string
  date: string
  recorded_at: string
  is_public: boolean
  month_year: string
}

export interface ScheduledClass {
  id: string
  title: string
  description?: string
  type: 'conditioning' | 'basketball' | 'both'
  group_id?: string
  coach_id?: string
  scheduled_date: string
  start_time: string
  end_time?: string
  location?: string
  is_recurring: boolean
  recurrence_rule?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  recurrence_days?: string[]
  recurrence_end_date?: string
  parent_class_id?: string
  created_by?: string
  created_at: string
}

export interface Group {
  id: string
  name: string
  description?: string
  coach_id?: string
  created_at: string
}
