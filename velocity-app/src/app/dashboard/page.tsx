import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const recentWorkouts = await prisma.workout.findMany({
    where: { userId: session.userId },
    orderBy: { date: "desc" },
    take: 5,
    include: { exercises: true },
  });

  const totalWorkouts = await prisma.workout.count({ where: { userId: session.userId } });
  const thisMonth = await prisma.workout.count({
    where: {
      userId: session.userId,
      date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    },
  });
  const totalExercises = await prisma.exercise.count({
    where: { workout: { userId: session.userId } },
  });

  const assignedPlans = await prisma.workoutPlan.findMany({
    where: { memberId: session.userId },
    include: { coach: { select: { name: true } } },
  });

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black" style={{ color: "#f0f4ff" }}>
              Hey, {session.name.split(" ")[0]} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: "#64748b" }}>
              {new Date().toLocaleDateString("en-PH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Link
            href="/workouts/new"
            className="px-5 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: "#f97316", color: "#fff" }}
          >
            + Log Workout
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Workouts", value: totalWorkouts, icon: "🏋️" },
            { label: "This Month", value: thisMonth, icon: "📅" },
            { label: "Total Exercises", value: totalExercises, icon: "💪" },
          ].map((s) => (
            <div
              key={s.label}
              className="p-5 rounded-2xl"
              style={{ background: "#111827", border: "1px solid #1e293b" }}
            >
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-3xl font-black mb-1" style={{ color: "#f97316" }}>
                {s.value}
              </div>
              <div className="text-xs" style={{ color: "#64748b" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Workouts */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: "#f0f4ff" }}>
                Recent Workouts
              </h2>
              <Link href="/workouts" className="text-sm" style={{ color: "#f97316" }}>
                View all →
              </Link>
            </div>

            {recentWorkouts.length === 0 ? (
              <div
                className="p-8 rounded-2xl text-center"
                style={{ background: "#111827", border: "1px solid #1e293b" }}
              >
                <p className="text-4xl mb-3">🏃</p>
                <p className="font-semibold" style={{ color: "#f0f4ff" }}>
                  No workouts yet
                </p>
                <p className="text-sm mt-1 mb-4" style={{ color: "#64748b" }}>
                  Log your first session to get started
                </p>
                <Link
                  href="/workouts/new"
                  className="inline-block px-5 py-2 rounded-xl font-bold text-sm"
                  style={{ background: "#f97316", color: "#fff" }}
                >
                  Log First Workout
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentWorkouts.map((w) => (
                  <Link
                    key={w.id}
                    href={`/workouts/${w.id}`}
                    className="block p-4 rounded-xl"
                    style={{ background: "#111827", border: "1px solid #1e293b" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {w.type === "basketball" ? "🏀" : "🏋️"}
                        </span>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "#f0f4ff" }}>
                            {w.title}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                            {new Date(w.date).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            · {w.exercises.length} exercise{w.exercises.length !== 1 ? "s" : ""}
                            {w.duration ? ` · ${w.duration}min` : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-xs px-2 py-1 rounded-full capitalize"
                        style={{
                          background: w.type === "basketball" ? "#1e3a5f" : "#1a2e1a",
                          color: w.type === "basketball" ? "#60a5fa" : "#4ade80",
                        }}
                      >
                        {w.type === "basketball" ? "Basketball" : "Conditioning"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-bold mb-4" style={{ color: "#f0f4ff" }}>
                Quick Log
              </h2>
              <div className="flex flex-col gap-3">
                <Link
                  href="/workouts/new?type=conditioning"
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{ background: "#111827", border: "1px solid #1e293b" }}
                >
                  <span className="text-2xl">🏋️</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#f0f4ff" }}>
                      Conditioning
                    </p>
                    <p className="text-xs" style={{ color: "#64748b" }}>
                      Strength & cardio
                    </p>
                  </div>
                </Link>
                <Link
                  href="/workouts/new?type=basketball"
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{ background: "#111827", border: "1px solid #1e293b" }}
                >
                  <span className="text-2xl">🏀</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#f0f4ff" }}>
                      Basketball Training
                    </p>
                    <p className="text-xs" style={{ color: "#64748b" }}>
                      Drills & skills
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Assigned Plans */}
            {assignedPlans.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-4" style={{ color: "#f0f4ff" }}>
                  Your Training Plans
                </h2>
                <div className="flex flex-col gap-3">
                  {assignedPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="p-4 rounded-xl"
                      style={{ background: "#111827", border: "1px solid #1e293b" }}
                    >
                      <p className="font-semibold text-sm" style={{ color: "#f0f4ff" }}>
                        {plan.title}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "#64748b" }}>
                        by Coach {plan.coach.name}
                      </p>
                      {plan.description && (
                        <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>
                          {plan.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
