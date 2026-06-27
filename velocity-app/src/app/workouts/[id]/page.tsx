import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { deleteWorkout } from "@/app/actions/workouts";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const workout = await prisma.workout.findUnique({
    where: { id },
    include: { exercises: true, plan: true },
  });

  if (!workout || workout.userId !== session.userId) notFound();

  const isBasketball = workout.type === "basketball";

  async function handleDelete() {
    "use server";
    await deleteWorkout(id);
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/workouts" className="text-sm" style={{ color: "#64748b" }}>
            ← Workouts
          </Link>
        </div>

        {/* Header Card */}
        <div
          className="p-6 rounded-2xl mb-6"
          style={{ background: "#111827", border: "1px solid #1e293b" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: isBasketball ? "#1e3a5f" : "#1a2e1a" }}
              >
                {isBasketball ? "🏀" : "🏋️"}
              </div>
              <div>
                <h1 className="text-2xl font-black" style={{ color: "#f0f4ff" }}>
                  {workout.title}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: isBasketball ? "#1e3a5f" : "#1a2e1a",
                      color: isBasketball ? "#60a5fa" : "#4ade80",
                    }}
                  >
                    {isBasketball ? "Basketball" : "Conditioning"}
                  </span>
                  <span className="text-sm" style={{ color: "#64748b" }}>
                    {new Date(workout.date).toLocaleDateString("en-PH", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
            <form action={handleDelete}>
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: "#7f1d1d30", color: "#ef4444", border: "1px solid #7f1d1d" }}
              >
                Delete
              </button>
            </form>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-5 pt-5" style={{ borderTop: "1px solid #1e293b" }}>
            <div>
              <p className="text-2xl font-black" style={{ color: "#f97316" }}>
                {workout.exercises.length}
              </p>
              <p className="text-xs" style={{ color: "#64748b" }}>
                Exercises
              </p>
            </div>
            {workout.duration && (
              <div>
                <p className="text-2xl font-black" style={{ color: "#f97316" }}>
                  {workout.duration}
                </p>
                <p className="text-xs" style={{ color: "#64748b" }}>
                  Minutes
                </p>
              </div>
            )}
            {!isBasketball && (
              <div>
                <p className="text-2xl font-black" style={{ color: "#f97316" }}>
                  {workout.exercises.reduce((acc, e) => acc + (e.sets ?? 0), 0)}
                </p>
                <p className="text-xs" style={{ color: "#64748b" }}>
                  Total Sets
                </p>
              </div>
            )}
          </div>

          {workout.notes && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: "#0d1424" }}>
              <p className="text-sm font-medium mb-1" style={{ color: "#94a3b8" }}>
                Notes
              </p>
              <p className="text-sm" style={{ color: "#f0f4ff" }}>
                {workout.notes}
              </p>
            </div>
          )}

          {workout.plan && (
            <p className="text-xs mt-3" style={{ color: "#64748b" }}>
              From plan: <span style={{ color: "#94a3b8" }}>{workout.plan.title}</span>
            </p>
          )}
        </div>

        {/* Exercises */}
        <h2 className="text-lg font-bold mb-4" style={{ color: "#f0f4ff" }}>
          Exercises
        </h2>

        {workout.exercises.length === 0 ? (
          <div
            className="p-6 rounded-2xl text-center"
            style={{ background: "#111827", border: "1px solid #1e293b" }}
          >
            <p style={{ color: "#64748b" }}>No exercises logged for this workout.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {workout.exercises.map((ex, index) => (
              <div
                key={ex.id}
                className="p-4 rounded-xl"
                style={{ background: "#111827", border: "1px solid #1e293b" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "#f97316", color: "#fff" }}
                    >
                      {index + 1}
                    </span>
                    <span className="font-semibold" style={{ color: "#f0f4ff" }}>
                      {ex.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm" style={{ color: "#94a3b8" }}>
                    {ex.sets && (
                      <span>
                        <span style={{ color: "#f97316", fontWeight: 700 }}>{ex.sets}</span> sets
                      </span>
                    )}
                    {ex.reps && (
                      <span>
                        × <span style={{ color: "#f97316", fontWeight: 700 }}>{ex.reps}</span> reps
                      </span>
                    )}
                    {ex.weight && (
                      <span>
                        @ <span style={{ color: "#f97316", fontWeight: 700 }}>{ex.weight}</span> kg
                      </span>
                    )}
                    {ex.duration && (
                      <span>
                        <span style={{ color: "#f97316", fontWeight: 700 }}>{ex.duration}</span> min
                      </span>
                    )}
                  </div>
                </div>
                {ex.notes && (
                  <p className="text-xs mt-2 ml-10" style={{ color: "#64748b" }}>
                    {ex.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
