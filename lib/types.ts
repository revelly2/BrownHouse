// ============================================================================
// TypeScript Type Definitions
// Maps directly to the PostgreSQL schema defined in the DDL migration.
// ============================================================================

// ---- Enums (mapped from CHECK constraints) ----

export type UserRole = "admin" | "trainer" | "client";
export type EquipmentType = "cardio" | "strength";
export type EquipmentStatus = "available" | "maintenance" | "occupied";
export type ReservationStatus = "confirmed" | "cancelled" | "completed";
export type MaintenanceStatus = "pending" | "fixed";
export type DifficultyLevel = "beginner" | "advanced";
export type RecommendationType = "plan" | "exercise";

// ---- Table Row Types ----

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  email?: string | null;
  joined_date: string;
  profile_picture_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  fitness_goal: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  brand: string | null;
  model_number: string | null;
  description: string | null;
  image_url: string | null;
  muscle_group: string | null;
  status: EquipmentStatus;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  description: string | null;
  tutorial_url: string | null;
  equipment_id: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  client_id: string;
  equipment_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceLog {
  id: string;
  staff_id: string;
  equipment_id: string;
  log_date: string;
  description: string;
  status: MaintenanceStatus;
  created_at: string;
}

export interface WorkoutPlan {
  id: string;
  client_id: string;
  creation_date: string;
  goal: string;
  difficulty_level: DifficultyLevel;
  description: string | null;
  fitt_frequency: string | null;
  fitt_intensity: string | null;
  fitt_time: string | null;
  fitt_type: string | null;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutDetail {
  id: string;
  plan_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  rest_seconds: number | null;
  ordering: number;
  created_at: string;
}

export interface PerformanceMetrics {
  calories_burned?: number;
  avg_heart_rate?: number;
  exercises_completed?: number;
  satisfaction_rating?: number;
  [key: string]: unknown;
}

export interface CompletedSession {
  id: string;
  client_id: string;
  plan_id: string | null;
  date: string;
  duration_minutes: number | null;
  performance_metrics: PerformanceMetrics;
  notes: string | null;
  created_at: string;
}

export interface AIRecommendation {
  id: string;
  client_id: string;
  recommended_text: string;
  recommended_type: RecommendationType;
  payload: Record<string, unknown>;
  date_generated: string;
  created_at: string;
}

export interface Notification {
  id: string;
  client_id: string;
  title: string;
  message: string;
  date_sent: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface MeasurementHistory {
  id: string;
  client_id: string;
  weight_kg: number;
  height_cm: number | null;
  measured_at: string;
}

// ---- Supabase Database Type Map ----

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at" | "joined_date"> & {
          joined_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      equipment: {
        Row: Equipment;
        Insert: Omit<Equipment, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Equipment, "id" | "created_at">>;
      };
      exercises: {
        Row: Exercise;
        Insert: Omit<Exercise, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Exercise, "id" | "created_at">>;
      };
      reservations: {
        Row: Reservation;
        Insert: Omit<Reservation, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Reservation, "id" | "created_at">>;
      };
      maintenance_log: {
        Row: MaintenanceLog;
        Insert: Omit<MaintenanceLog, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<MaintenanceLog, "id" | "created_at">>;
      };
      workout_plans: {
        Row: WorkoutPlan;
        Insert: Omit<WorkoutPlan, "id" | "created_at" | "updated_at" | "creation_date"> & {
          id?: string;
          creation_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WorkoutPlan, "id" | "created_at">>;
      };
      workout_details: {
        Row: WorkoutDetail;
        Insert: Omit<WorkoutDetail, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<WorkoutDetail, "id" | "created_at">>;
      };
      completed_sessions: {
        Row: CompletedSession;
        Insert: Omit<CompletedSession, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<CompletedSession, "id" | "created_at">>;
      };
      ai_recommendations: {
        Row: AIRecommendation;
        Insert: Omit<AIRecommendation, "id" | "created_at" | "date_generated"> & {
          id?: string;
          date_generated?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AIRecommendation, "id" | "created_at">>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at" | "date_sent"> & {
          id?: string;
          date_sent?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Notification, "id" | "created_at">>;
      };
      measurement_history: {
        Row: MeasurementHistory;
        Insert: Omit<MeasurementHistory, "id" | "measured_at"> & {
          id?: string;
          measured_at?: string;
        };
        Update: Partial<Omit<MeasurementHistory, "id">>;
      };
    };
  };
}
