import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function LandingPage() {
  const session = await getSession();

  return (
    <main className="flex flex-col min-h-screen" style={{ background: "var(--background)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1e293b" }}>
        <div className="flex items-center gap-2">
          <span style={{ color: "#f97316", fontSize: "1.5rem" }}>⚡</span>
          <span className="font-bold text-xl tracking-tight" style={{ color: "#f0f4ff" }}>
            Velocity Fitness <span style={{ color: "#f97316" }}>PH</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
              style={{ background: "#f97316", color: "#fff" }}
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg font-semibold text-sm"
                style={{ color: "#f0f4ff", border: "1px solid #334155", borderRadius: "8px" }}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg font-semibold text-sm"
                style={{ background: "#f97316", color: "#fff", borderRadius: "8px" }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6"
          style={{ background: "#1e293b", color: "#f97316", border: "1px solid #f9731640" }}
        >
          🏀 Sports · Conditioning · Basketball Training
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight" style={{ color: "#f0f4ff" }}>
          Train Smarter.
          <br />
          <span style={{ color: "#f97316" }}>Track Everything.</span>
        </h1>

        <p className="text-lg md:text-xl max-w-2xl mb-10" style={{ color: "#94a3b8" }}>
          Velocity Fitness PH&apos;s official workout tracker. Members log conditioning
          sessions and basketball drills. Coaches monitor progress and assign training plans.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={session ? "/dashboard" : "/register"}
            className="px-8 py-4 rounded-xl font-bold text-lg"
            style={{ background: "#f97316", color: "#fff", boxShadow: "0 4px 24px #f9731640" }}
          >
            {session ? "Go to Dashboard" : "Start Tracking Free"}
          </Link>
          {!session && (
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl font-bold text-lg"
              style={{ background: "#1e293b", color: "#f0f4ff", border: "1px solid #334155" }}
            >
              Log In
            </Link>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20" style={{ background: "#0d1424" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: "#f0f4ff" }}>
            Everything You Need
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🏋️",
                title: "Log Workouts",
                desc: "Record conditioning sessions with exercises, sets, reps, weights and duration.",
              },
              {
                icon: "🏀",
                title: "Basketball Training",
                desc: "Track basketball-specific drills, shooting practice, and skill development.",
              },
              {
                icon: "📈",
                title: "Track Progress",
                desc: "View your history, see trends, and measure improvements over time.",
              },
              {
                icon: "👨‍💼",
                title: "Coach Dashboard",
                desc: "Coaches can assign workout plans and monitor all member activity.",
              },
              {
                icon: "📋",
                title: "Workout Plans",
                desc: "Coaches create structured training programs for individual members.",
              },
              {
                icon: "⚡",
                title: "Fast & Simple",
                desc: "Log your session in seconds. No complexity, just results.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl"
                style={{ background: "#111827", border: "1px solid #1e293b" }}
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2" style={{ color: "#f0f4ff" }}>
                  {f.title}
                </h3>
                <p className="text-sm" style={{ color: "#64748b" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-8 text-center text-sm"
        style={{ color: "#475569", borderTop: "1px solid #1e293b" }}
      >
        © {new Date().getFullYear()} Velocity Fitness PH. Built for athletes.
      </footer>
    </main>
  );
}
