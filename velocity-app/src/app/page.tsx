import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function LandingPage() {
  const session = await getSession();

  return (
    <main className="flex flex-col min-h-screen" style={{ background: "var(--vel-black)" }}>
      {/* Sticky frosted-glass navbar */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: "rgba(9,9,9,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--vel-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--vel-teal)", fontSize: "1.4rem" }}>⚡</span>
          <span
            className="font-display text-2xl"
            style={{ color: "var(--vel-text-primary)", letterSpacing: "0.06em" }}
          >
            VELOCITY <span style={{ color: "var(--vel-teal)" }}>PH</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <Link href="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Log In
              </Link>
              <Link href="/register" className="btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center flex-1 px-6 py-28 text-center overflow-hidden"
        style={{ minHeight: "90vh" }}
      >
        {/* Watermark */}
        <span
          className="font-display pointer-events-none select-none absolute inset-0 flex items-center justify-center"
          style={{
            fontSize: "clamp(100px, 28vw, 320px)",
            color: "var(--vel-text-primary)",
            opacity: 0.03,
            lineHeight: 1,
            letterSpacing: "0.02em",
            zIndex: 0,
          }}
          aria-hidden
        >
          VELOCITY
        </span>

        {/* Radial teal glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(10,191,188,0.06) 0%, transparent 70%)",
            zIndex: 0,
          }}
          aria-hidden
        />

        <div className="relative z-10 flex flex-col items-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6 animate-fadeInUp stagger-1"
            style={{
              background: "var(--vel-teal-dim)",
              color: "var(--vel-teal)",
              border: "1px solid rgba(10,191,188,0.25)",
            }}
          >
            🏀 Sports · Conditioning · Basketball Training
          </div>

          <h1
            className="font-display animate-fadeInUp stagger-2 leading-none mb-6"
            style={{
              fontSize: "clamp(54px, 11vw, 128px)",
              color: "var(--vel-text-primary)",
            }}
          >
            Train Smarter.
            <br />
            <span style={{ color: "var(--vel-teal)" }}>Track Everything.</span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mb-10 animate-fadeInUp stagger-3"
            style={{ color: "var(--vel-text-secondary)" }}
          >
            Velocity Fitness PH&apos;s official workout tracker. Members log conditioning
            sessions and basketball drills. Coaches monitor progress and assign training plans.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-fadeInUp stagger-3">
            <Link
              href={session ? "/dashboard" : "/register"}
              className="btn-primary btn-glow px-8 py-4 text-lg rounded-xl"
            >
              {session ? "Go to Dashboard" : "Start Tracking Free"}
            </Link>
            {!session && (
              <Link href="/login" className="btn-ghost px-8 py-4 text-lg rounded-xl">
                Log In
              </Link>
            )}
          </div>
        </div>
      </section>

      <hr className="divider-teal" />

      {/* Features */}
      <section className="px-6 py-24" style={{ background: "var(--vel-surface)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-label">What We Offer</span>
            <h2
              className="font-display"
              style={{ fontSize: "clamp(36px, 6vw, 64px)", color: "var(--vel-text-primary)" }}
            >
              Everything You Need
            </h2>
          </div>

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
            ].map((f, i) => (
              <div
                key={f.title}
                className={`card-vel p-6 animate-fadeInUp stagger-${i + 1}`}
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3
                  className="font-bold text-lg mb-2"
                  style={{ color: "var(--vel-text-primary)" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--vel-text-secondary)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA strip */}
      <section
        className="px-6 py-16 text-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(10,191,188,0.07) 0%, var(--vel-black) 60%)",
          borderTop: "1px solid var(--vel-border)",
        }}
      >
        <h2
          className="font-display mb-4"
          style={{ fontSize: "clamp(32px, 5vw, 56px)", color: "var(--vel-text-primary)" }}
        >
          Ready to Level Up?
        </h2>
        <p className="mb-8 text-lg" style={{ color: "var(--vel-text-secondary)" }}>
          Join Velocity Fitness PH and start tracking your performance today.
        </p>
        <Link
          href={session ? "/dashboard" : "/register"}
          className="btn-primary btn-glow px-10 py-4 text-lg rounded-xl"
        >
          {session ? "Go to Dashboard" : "Get Started Free"}
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-8 text-center text-sm"
        style={{ color: "var(--vel-text-dim)", borderTop: "1px solid var(--vel-border)" }}
      >
        <span className="font-display text-lg mr-2" style={{ color: "var(--vel-text-secondary)" }}>
          VELOCITY PH
        </span>
        <br className="sm:hidden" />
        <span>© {new Date().getFullYear()} Velocity Fitness PH. Built for athletes.</span>
      </footer>
    </main>
  );
}
