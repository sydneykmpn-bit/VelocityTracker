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
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span style={{ color: "#f97316", fontSize: "1.5rem" }}>⚡</span>
            <span className="font-bold text-xl" style={{ color: "#f0f4ff" }}>
              Velocity Fitness <span style={{ color: "#f97316" }}>PH</span>
            </span>
          </Link>
          <h1 className="text-3xl font-black" style={{ color: "#f0f4ff" }}>
            Welcome back
          </h1>
          <p className="text-sm mt-2" style={{ color: "#64748b" }}>
            Log in to your account
          </p>
        </div>

        <div
          className="p-8 rounded-2xl"
          style={{ background: "#111827", border: "1px solid #1e293b" }}
        >
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ background: "#7f1d1d40", color: "#fca5a5", border: "1px solid #7f1d1d" }}
            >
              {error}
            </div>
          )}

          <form action={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#94a3b8" }}>
                Email
              </label>
              <input name="email" type="email" placeholder="you@email.com" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#94a3b8" }}>
                Password
              </label>
              <input name="password" type="password" placeholder="••••••••" required />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm mt-2 transition-opacity"
              style={{ background: "#f97316", color: "#fff", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "#64748b" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "#f97316", fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
