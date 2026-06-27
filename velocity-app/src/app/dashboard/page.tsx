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
    <div style={{ background: "var(--vel-black)", minHeight: "100vh" }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black" style={{ color: "var(--vel-text-primary)" }}>
              Hey, {session.name.split(" ")[0]} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--vel-text-secondary)" }}>
              {new Date().toLocaleDateString("en-PH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Link href="/workouts/new" className="btn-primary px-5 py-2.5 rounded-xl text-sm">
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
            <div key={s.label} className="card-vel p-5">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-3xl font-black mb-1" style={{ color: "var(--vel-orange)" }}>
                {s.value}
              </div>
              <div className="text-xs" style={{ color: "var(--vel-text-secondary)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Workouts */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: "var(--vel-text-primary)" }}>
                Recent Workouts
              </h2>
              <Link href="/workouts" className="text-sm" style={{ color: "var(--vel-orange)" }}>
                View all →
              </Link>
            </div>

            {recentWorkouts.length === 0 ? (
              <div className="card-vel p-8 text-center">
                <p className="text-4xl mb-3">🏃</p>
                <p className="font-semibold" style={{ color: "var(--vel-text-primary)" }}>
                  No workouts yet
                </p>
                <p className="text-sm mt-1 mb-4" style={{ color: "var(--vel-text-secondary)" }}>
                  Log your first session to get started
                </p>
                <Link
                  href="/workouts/new"
                  className="btn-primary inline-flex px-5 py-2 rounded-xl text-sm"
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
                    className="card-interactive block p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {w.type === "basketball" ? "🏀" : "🏋️"}
                        </span>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "var(--vel-text-primary)" }}>
                            {w.title}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--vel-text-secondary)" }}>
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
                      <span className={w.type === "basketball" ? "tag-basketball" : "tag-conditioning"}>
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
              <h2 className="text-lg font-bold mb-4" style={{ color: "var(--vel-text-primary)" }}>
                Quick Log
              </h2>
              <div className="flex flex-col gap-3">
                <Link
                  href="/workouts/new?type=conditioning"
                  className="card-interactive flex items-center gap-3 p-4"
                >
                  <span className="text-2xl">🏋️</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--vel-text-primary)" }}>
                      Conditioning
                    </p>
                    <p className="text-xs" style={{ color: "var(--vel-text-secondary)" }}>
                      Strength & cardio
                    </p>
                  </div>
                </Link>
                <Link
                  href="/workouts/new?type=basketball"
                  className="card-interactive flex items-center gap-3 p-4"
                >
                  <span className="text-2xl">🏀</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--vel-text-primary)" }}>
                      Basketball Training
                    </p>
                    <p className="text-xs" style={{ color: "var(--vel-text-secondary)" }}>
                      Drills & skills
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Assigned Plans */}
            {assignedPlans.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-4" style={{ color: "var(--vel-text-primary)" }}>
                  Your Training Plans
                </h2>
                <div className="flex flex-col gap-3">
                  {assignedPlans.map((plan) => (
                    <div key={plan.id} className="card-vel p-4">
                      <p className="font-semibold text-sm" style={{ color: "var(--vel-text-primary)" }}>
                        {plan.title}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--vel-text-secondary)" }}>
                        by Coach {plan.coach.name}
                      </p>
                      {plan.description && (
                        <p className="text-xs mt-2" style={{ color: "var(--vel-text-secondary)" }}>
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
