"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createWorkout } from "@/app/actions/workouts";

interface ExerciseRow {
  id: number;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  duration: string;
  notes: string;
}

const BASKETBALL_EXERCISES = [
  "Ball Handling Drills",
  "Shooting - Free Throws",
  "Shooting - Mid Range",
  "Shooting - Three Pointers",
  "Layup Drills",
  "Defensive Slides",
  "Cone Dribbling",
  "Passing Drills",
  "Speed Ladder",
  "Vertical Jump Training",
];

const CONDITIONING_EXERCISES = [
  "Squat",
  "Deadlift",
  "Bench Press",
  "Overhead Press",
  "Pull-ups",
  "Push-ups",
  "Romanian Deadlift",
  "Lunges",
  "Box Jumps",
  "Sprints",
  "Rowing",
  "Burpees",
  "Plank",
  "Battle Ropes",
  "Kettlebell Swings",
];

let nextId = 1;

export default function WorkoutForm() {
  const searchParams = useSearchParams();
  const defaultType = searchParams.get("type") ?? "conditioning";

  const [type, setType] = useState(defaultType);
  const [exercises, setExercises] = useState<ExerciseRow[]>([
    { id: nextId++, name: "", sets: "", reps: "", weight: "", duration: "", notes: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const suggestions = type === "basketball" ? BASKETBALL_EXERCISES : CONDITIONING_EXERCISES;

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { id: nextId++, name: "", sets: "", reps: "", weight: "", duration: "", notes: "" },
    ]);
  }

  function removeExercise(id: number) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function updateExercise(id: number, field: keyof ExerciseRow, value: string) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await createWorkout(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-sm" style={{ color: "var(--vel-text-secondary)" }}>
          ← Back
        </Link>
        <h1 className="text-2xl font-black" style={{ color: "var(--vel-text-primary)" }}>
          Log Workout
        </h1>
      </div>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            background: "var(--vel-error-bg)",
            color: "var(--vel-error-text)",
            border: "1px solid var(--vel-error-border)",
          }}
        >
          {error}
        </div>
      )}

      <form action={handleSubmit} className="flex flex-col gap-6">
        {/* Workout Type */}
        <div className="card-vel p-6">
          <h2 className="font-bold mb-4" style={{ color: "var(--vel-text-primary)" }}>
            Workout Type
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "conditioning", label: "🏋️ Conditioning", desc: "Strength & cardio" },
              { value: "basketball", label: "🏀 Basketball", desc: "Training & drills" },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className="flex flex-col items-center p-4 rounded-xl text-center"
                style={{
                  border: `2px solid ${type === t.value ? "var(--vel-orange)" : "var(--vel-border)"}`,
                  background: type === t.value ? "var(--vel-orange-dim)" : "transparent",
                  transition: "border-color 0.18s, background 0.18s",
                }}
              >
                <span className="text-2xl mb-1">{t.label.split(" ")[0]}</span>
                <span className="font-semibold text-sm" style={{ color: "var(--vel-text-primary)" }}>
                  {t.label.split(" ").slice(1).join(" ")}
                </span>
                <span className="text-xs mt-0.5" style={{ color: "var(--vel-text-secondary)" }}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
          <input type="hidden" name="type" value={type} />
        </div>

        {/* Details */}
        <div className="card-vel p-6 flex flex-col gap-4">
          <h2 className="font-bold" style={{ color: "var(--vel-text-primary)" }}>
            Session Details
          </h2>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--vel-text-secondary)" }}
            >
              Title *
            </label>
            <input
              name="title"
              type="text"
              placeholder={
                type === "basketball"
                  ? "e.g. Morning Shooting Practice"
                  : "e.g. Upper Body Strength"
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--vel-text-secondary)" }}
              >
                Date
              </label>
              <input name="date" type="date" defaultValue={today} />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--vel-text-secondary)" }}
              >
                Duration (min)
              </label>
              <input name="duration" type="number" placeholder="60" min="1" />
            </div>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--vel-text-secondary)" }}
            >
              Notes
            </label>
            <textarea
              name="notes"
              placeholder="How did the session go? Any PRs or observations..."
              rows={3}
              style={{
                background: "var(--vel-surface-2)",
                color: "var(--vel-text-primary)",
                border: "1px solid var(--vel-border)",
                borderRadius: "8px",
                padding: "10px 14px",
                width: "100%",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        {/* Exercises */}
        <div className="card-vel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{ color: "var(--vel-text-primary)" }}>
              Exercises
            </h2>
            <button
              type="button"
              onClick={addExercise}
              className="text-sm px-3 py-1.5 rounded-lg font-semibold"
              style={{
                background: "var(--vel-orange-dim)",
                color: "var(--vel-orange)",
                border: "1px solid rgba(255,85,0,0.25)",
              }}
            >
              + Add Exercise
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {exercises.map((ex, index) => (
              <div
                key={ex.id}
                className="p-4 rounded-xl"
                style={{
                  background: "var(--vel-surface-2)",
                  border: "1px solid var(--vel-border)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--vel-text-secondary)" }}
                  >
                    Exercise {index + 1}
                  </span>
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExercise(ex.id)}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        color: "var(--vel-error-text)",
                        background: "var(--vel-error-bg)",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <input
                      name="exercise_name"
                      type="text"
                      placeholder="Exercise name"
                      value={ex.name}
                      onChange={(e) => updateExercise(ex.id, "name", e.target.value)}
                      list={`suggestions-${ex.id}`}
                      required
                    />
                    <datalist id={`suggestions-${ex.id}`}>
                      {suggestions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>

                  {type === "conditioning" ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label
                          className="block text-xs mb-1"
                          style={{ color: "var(--vel-text-secondary)" }}
                        >
                          Sets
                        </label>
                        <input
                          name="exercise_sets"
                          type="number"
                          placeholder="3"
                          min="1"
                          value={ex.sets}
                          onChange={(e) => updateExercise(ex.id, "sets", e.target.value)}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs mb-1"
                          style={{ color: "var(--vel-text-secondary)" }}
                        >
                          Reps
                        </label>
                        <input
                          name="exercise_reps"
                          type="number"
                          placeholder="10"
                          min="1"
                          value={ex.reps}
                          onChange={(e) => updateExercise(ex.id, "reps", e.target.value)}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs mb-1"
                          style={{ color: "var(--vel-text-secondary)" }}
                        >
                          Weight (kg)
                        </label>
                        <input
                          name="exercise_weight"
                          type="number"
                          placeholder="50"
                          step="0.5"
                          value={ex.weight}
                          onChange={(e) => updateExercise(ex.id, "weight", e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          className="block text-xs mb-1"
                          style={{ color: "var(--vel-text-secondary)" }}
                        >
                          Sets / Reps
                        </label>
                        <input
                          name="exercise_sets"
                          type="number"
                          placeholder="Sets"
                          min="1"
                          value={ex.sets}
                          onChange={(e) => updateExercise(ex.id, "sets", e.target.value)}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs mb-1"
                          style={{ color: "var(--vel-text-secondary)" }}
                        >
                          Duration (min)
                        </label>
                        <input
                          name="exercise_duration"
                          type="number"
                          placeholder="15"
                          min="1"
                          value={ex.duration}
                          onChange={(e) => updateExercise(ex.id, "duration", e.target.value)}
                        />
                      </div>
                      <input type="hidden" name="exercise_reps" value={ex.reps} />
                      <input type="hidden" name="exercise_weight" value={ex.weight} />
                    </div>
                  )}

                  <input
                    name="exercise_notes"
                    type="text"
                    placeholder="Notes (optional)"
                    value={ex.notes}
                    onChange={(e) => updateExercise(ex.id, "notes", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-4 rounded-xl text-lg"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Saving..." : "Save Workout"}
        </button>
      </form>
    </div>
  );
}
