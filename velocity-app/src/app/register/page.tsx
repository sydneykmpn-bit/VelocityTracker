"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { register } from "@/app/actions/auth";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--vel-black)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.png" alt="Velocity Fitness PH" style={{ height: "48px" }} />
          </Link>
          <h1 className="text-3xl font-black" style={{ color: "var(--vel-text-primary)" }}>
            Create your account
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--vel-text-secondary)" }}>
            Join Velocity Fitness PH
          </p>
        </div>

        <div
          className="p-8 rounded-2xl"
          style={{
            background: "var(--vel-surface)",
            border: "1px solid var(--vel-border)",
          }}
        >
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

          <form action={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--vel-text-secondary)" }}
              >
                Full Name
              </label>
              <input name="name" type="text" placeholder="Juan dela Cruz" required />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--vel-text-secondary)" }}
              >
                Email
              </label>
              <input name="email" type="email" placeholder="you@email.com" required />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--vel-text-secondary)" }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  required
                  style={{ paddingRight: "2.75rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--vel-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--vel-text-primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--vel-text-secondary)")
                  }
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--vel-text-secondary)" }}
              >
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "member", label: "🏋️ Member", desc: "I train at the gym" },
                  { value: "coach", label: "👨‍💼 Coach", desc: "I manage athletes" },
                ].map((r) => (
                  <label
                    key={r.value}
                    className="flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer text-center has-[:checked]:border-teal-400"
                    style={{
                      border: "2px solid var(--vel-border)",
                      borderRadius: "12px",
                      transition: "border-color 0.18s",
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      defaultChecked={r.value === "member"}
                      className="sr-only"
                    />
                    <span className="text-2xl mb-1">{r.label.split(" ")[0]}</span>
                    <span
                      className="font-semibold text-sm"
                      style={{ color: "var(--vel-text-primary)" }}
                    >
                      {r.label.split(" ").slice(1).join(" ")}
                    </span>
                    <span className="text-xs mt-1" style={{ color: "var(--vel-text-secondary)" }}>
                      {r.desc}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl text-sm mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--vel-text-secondary)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--vel-teal)", fontWeight: 600 }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
