import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--vel-black)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.png" alt="Velocity Fitness PH" style={{ height: "48px" }} />
          </Link>
        </div>

        <div
          className="p-8 rounded-2xl text-center"
          style={{
            background: "var(--vel-surface)",
            border: "1px solid var(--vel-border)",
          }}
        >
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-black mb-3" style={{ color: "var(--vel-text-primary)" }}>
            Reset Password
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--vel-text-secondary)" }}>
            To reset your password, please message us on Instagram{" "}
            <span style={{ color: "var(--vel-teal)", fontWeight: 600 }}>
              @velocityfitness.ph
            </span>{" "}
            or contact your coach directly.
          </p>
          <Link
            href="/login"
            className="btn-ghost inline-flex px-6 py-2.5 rounded-xl text-sm"
          >
            ← Back to Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
