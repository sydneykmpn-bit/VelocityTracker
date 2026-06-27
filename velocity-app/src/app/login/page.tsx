"use client";

import Link from "next/link";
import { useState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--vel-black)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span style={{ color: "var(--vel-teal)", fontSize: "1.5rem" }}>⚡</span>
            <span
              className="font-display text-3xl"
              style={{ color: "var(--vel-text-primary)", letterSpacing: "0.06em" }}
            >
              VELOCITY <span style={{ color: "var(--vel-teal)" }}>PH</span>
            </span>
          </Link>
          <h1 className="text-3xl font-black" style={{ color: "var(--vel-text-primary)" }}>
            Welcome back
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--vel-text-secondary)" }}>
            Log in to your account
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
              <input name="password" type="password" placeholder="••••••••" required />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl text-sm mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--vel-text-secondary)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "var(--vel-teal)", fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
