import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { type } = await searchParams;

  const workouts = await prisma.workout.findMany({
    where: {
      userId: session.userId,
      ...(type ? { type } : {}),
    },
    orderBy: { date: "desc" },
    include: { exercises: true },
  });

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black" style={{ color: "#f0f4ff" }}>
            My Workouts
          </h1>
          <Link
            href="/workouts/new"
            className="px-5 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: "#f97316", color: "#fff" }}
          >
            + Log Workout
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { label: "All", value: undefined },
            { label: "🏋️ Conditioning", value: "conditioning" },
            { label: "🏀 Basketball", value: "basketball" },
          ].map((tab) => (
            <Link
              key={tab.label}
              href={tab.value ? `/workouts?type=${tab.value}` : "/workouts"}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: type === tab.value || (!type && !tab.value) ? "#f97316" : "#1e293b",
                color: type === tab.value || (!type && !tab.value) ? "#fff" : "#94a3b8",
              }}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {workouts.length === 0 ? (
          <div
            className="p-12 rounded-2xl text-center"
            style={{ background: "#111827", border: "1px solid #1e293b" }}
          >
            <p className="text-5xl mb-4">🏃</p>
            <p className="text-xl font-bold mb-2" style={{ color: "#f0f4ff" }}>
              No workouts found
            </p>
            <p className="text-sm mb-6" style={{ color: "#64748b" }}>
              Start logging your training sessions
            </p>
            <Link
              href="/workouts/new"
              className="inline-block px-6 py-3 rounded-xl font-bold text-sm"
              style={{ background: "#f97316", color: "#fff" }}
            >
              Log Your First Workout
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {workouts.map((w) => (
              <Link
                key={w.id}
                href={`/workouts/${w.id}`}
                className="block p-5 rounded-2xl"
                style={{ background: "#111827", border: "1px solid #1e293b" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: w.type === "basketball" ? "#1e3a5f" : "#1a2e1a" }}
                    >
                      {w.type === "basketball" ? "🏀" : "🏋️"}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: "#f0f4ff" }}>
                        {w.title}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
                        {new Date(w.date).toLocaleDateString("en-PH", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className="text-xs px-2 py-1 rounded-full capitalize"
                      style={{
                        background: w.type === "basketball" ? "#1e3a5f" : "#1a2e1a",
                        color: w.type === "basketball" ? "#60a5fa" : "#4ade80",
                      }}
                    >
                      {w.type === "basketball" ? "Basketball" : "Conditioning"}
                    </span>
                    <div className="flex gap-3 mt-2 text-xs" style={{ color: "#64748b" }}>
                      <span>{w.exercises.length} exercises</span>
                      {w.duration && <span>{w.duration} min</span>}
                    </div>
                  </div>
                </div>
                {w.notes && (
                  <p className="text-sm mt-3 line-clamp-2" style={{ color: "#94a3b8" }}>
                    {w.notes}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
