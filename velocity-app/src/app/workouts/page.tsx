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
    <div style={{ background: "var(--vel-black)", minHeight: "100vh" }}>
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black" style={{ color: "var(--vel-text-primary)" }}>
            My Workouts
          </h1>
          <Link href="/workouts/new" className="btn-primary px-5 py-2.5 rounded-xl text-sm">
            + Log Workout
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { label: "All", value: undefined },
            { label: "🏋️ Conditioning", value: "conditioning" },
            { label: "🏀 Basketball", value: "basketball" },
          ].map((tab) => {
            const isActive = type === tab.value || (!type && !tab.value);
            return (
              <Link
                key={tab.label}
                href={tab.value ? `/workouts?type=${tab.value}` : "/workouts"}
                className={isActive ? "btn-primary px-4 py-2 rounded-lg text-sm" : "btn-ghost px-4 py-2 rounded-lg text-sm"}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {workouts.length === 0 ? (
          <div className="card-vel p-12 text-center">
            <p className="text-5xl mb-4">🏃</p>
            <p className="text-xl font-bold mb-2" style={{ color: "var(--vel-text-primary)" }}>
              No workouts found
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--vel-text-secondary)" }}>
              Start logging your training sessions
            </p>
            <Link
              href="/workouts/new"
              className="btn-primary inline-flex px-6 py-3 rounded-xl text-sm"
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
                className="card-interactive block p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{
                        background:
                          w.type === "basketball"
                            ? "rgba(30,58,95,0.5)"
                            : "rgba(26,46,26,0.5)",
                      }}
                    >
                      {w.type === "basketball" ? "🏀" : "🏋️"}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: "var(--vel-text-primary)" }}>
                        {w.title}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--vel-text-secondary)" }}>
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
                    <span className={w.type === "basketball" ? "tag-basketball" : "tag-conditioning"}>
                      {w.type === "basketball" ? "Basketball" : "Conditioning"}
                    </span>
                    <div className="flex gap-3 mt-2 text-xs" style={{ color: "var(--vel-text-secondary)" }}>
                      <span>{w.exercises.length} exercises</span>
                      {w.duration && <span>{w.duration} min</span>}
                    </div>
                  </div>
                </div>
                {w.notes && (
                  <p className="text-sm mt-3 line-clamp-2" style={{ color: "var(--vel-text-secondary)" }}>
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
