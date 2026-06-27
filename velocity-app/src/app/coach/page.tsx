import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { createPlan } from "@/app/actions/workouts";

export default async function CoachPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "coach") redirect("/dashboard");

  const members = await prisma.user.findMany({
    where: { role: "member" },
    orderBy: { name: "asc" },
  });

  const plans = await prisma.workoutPlan.findMany({
    where: { coachId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { name: true } },
      workouts: true,
    },
  });

  const recentMemberActivity = await prisma.workout.findMany({
    where: { user: { role: "member" } },
    orderBy: { date: "desc" },
    take: 10,
    include: {
      user: { select: { name: true } },
      exercises: true,
    },
  });

  const totalMemberWorkouts = await prisma.workout.count({
    where: { user: { role: "member" } },
  });

  return (
    <div style={{ background: "var(--vel-black)", minHeight: "100vh" }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black" style={{ color: "var(--vel-text-primary)" }}>
            Coach Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--vel-text-secondary)" }}>
            Monitor members and manage training plans
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Members", value: members.length, icon: "👥" },
            { label: "Member Workouts", value: totalMemberWorkouts, icon: "🏋️" },
            { label: "Training Plans", value: plans.length, icon: "📋" },
            {
              label: "Active This Month",
              value: new Set(
                recentMemberActivity
                  .filter(
                    (w) =>
                      new Date(w.date) >=
                      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                  )
                  .map((w) => w.userId)
              ).size,
              icon: "⚡",
            },
          ].map((s) => (
            <div key={s.label} className="card-vel p-5">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-3xl font-black mb-1" style={{ color: "var(--vel-teal)" }}>
                {s.value}
              </div>
              <div className="text-xs" style={{ color: "var(--vel-text-secondary)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Members + Activity */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Members */}
            <div>
              <h2 className="text-lg font-bold mb-4" style={{ color: "var(--vel-text-primary)" }}>
                Members ({members.length})
              </h2>
              {members.length === 0 ? (
                <div className="card-vel p-8 text-center">
                  <p style={{ color: "var(--vel-text-secondary)" }}>
                    No members have signed up yet.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {members.map((member) => {
                    const workoutCount = recentMemberActivity.filter(
                      (w) => w.userId === member.id
                    ).length;
                    const lastWorkout = recentMemberActivity.find(
                      (w) => w.userId === member.id
                    );
                    return (
                      <div
                        key={member.id}
                        className="card-interactive p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                            style={{
                              background: "var(--vel-surface-2)",
                              color: "var(--vel-teal)",
                            }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p
                              className="font-semibold text-sm"
                              style={{ color: "var(--vel-text-primary)" }}
                            >
                              {member.name}
                            </p>
                            <p className="text-xs" style={{ color: "var(--vel-text-secondary)" }}>
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {lastWorkout ? (
                            <>
                              <p
                                className="text-xs font-medium"
                                style={{ color: "var(--vel-text-secondary)" }}
                              >
                                Last:{" "}
                                {new Date(lastWorkout.date).toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: "var(--vel-text-secondary)" }}
                              >
                                {workoutCount} recent workout{workoutCount !== 1 ? "s" : ""}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs" style={{ color: "var(--vel-text-secondary)" }}>
                              No workouts yet
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-lg font-bold mb-4" style={{ color: "var(--vel-text-primary)" }}>
                Recent Member Activity
              </h2>
              {recentMemberActivity.length === 0 ? (
                <div className="card-vel p-8 text-center">
                  <p style={{ color: "var(--vel-text-secondary)" }}>No member activity yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentMemberActivity.map((w) => (
                    <div key={w.id} className="card-interactive p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {w.type === "basketball" ? "🏀" : "🏋️"}
                          </span>
                          <div>
                            <p
                              className="font-semibold text-sm"
                              style={{ color: "var(--vel-text-primary)" }}
                            >
                              {w.title}
                            </p>
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: "var(--vel-text-secondary)" }}
                            >
                              {w.user.name} ·{" "}
                              {new Date(w.date).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              · {w.exercises.length} exercises
                            </p>
                          </div>
                        </div>
                        <span
                          className={
                            w.type === "basketball" ? "tag-basketball" : "tag-conditioning"
                          }
                        >
                          {w.type === "basketball" ? "Basketball" : "Conditioning"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Plans */}
          <div className="flex flex-col gap-6">
            {/* Create Plan */}
            <div className="card-vel p-6">
              <h2 className="font-bold mb-4" style={{ color: "var(--vel-text-primary)" }}>
                Create Training Plan
              </h2>
              <form action={createPlan} className="flex flex-col gap-3">
                <input name="title" type="text" placeholder="Plan title" required />
                <textarea
                  name="description"
                  placeholder="Description (optional)"
                  rows={2}
                  style={{
                    background: "var(--vel-surface-2)",
                    color: "var(--vel-text-primary)",
                    border: "1px solid var(--vel-border)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    width: "100%",
                    outline: "none",
                    resize: "vertical",
                    fontSize: "14px",
                  }}
                />
                <select name="type" required>
                  <option value="conditioning">🏋️ Conditioning</option>
                  <option value="basketball">🏀 Basketball</option>
                </select>
                <select name="memberId">
                  <option value="">Assign to member (optional)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-primary py-2.5 rounded-xl text-sm">
                  Create Plan
                </button>
              </form>
            </div>

            {/* Existing Plans */}
            {plans.length > 0 && (
              <div>
                <h2 className="font-bold mb-3" style={{ color: "var(--vel-text-primary)" }}>
                  Your Plans
                </h2>
                <div className="flex flex-col gap-3">
                  {plans.map((plan) => (
                    <div key={plan.id} className="card-vel p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{plan.type === "basketball" ? "🏀" : "🏋️"}</span>
                        <p
                          className="font-semibold text-sm"
                          style={{ color: "var(--vel-text-primary)" }}
                        >
                          {plan.title}
                        </p>
                      </div>
                      {plan.member && (
                        <p className="text-xs" style={{ color: "var(--vel-text-secondary)" }}>
                          → {plan.member.name}
                        </p>
                      )}
                      {plan.description && (
                        <p className="text-xs mt-1" style={{ color: "var(--vel-text-secondary)" }}>
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
