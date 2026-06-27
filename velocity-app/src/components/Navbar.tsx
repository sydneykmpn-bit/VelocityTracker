import Link from "next/link";
import { getSession } from "@/lib/session";
import { logout } from "@/app/actions/auth";

export default async function Navbar() {
  const session = await getSession();

  return (
    <nav
      className="flex items-center justify-between px-6 py-4"
      style={{ background: "#0d1424", borderBottom: "1px solid #1e293b" }}
    >
      <Link href="/dashboard" className="flex items-center gap-2">
        <span style={{ color: "#f97316", fontSize: "1.3rem" }}>⚡</span>
        <span className="font-bold text-lg tracking-tight" style={{ color: "#f0f4ff" }}>
          Velocity <span style={{ color: "#f97316" }}>PH</span>
        </span>
      </Link>

      <div className="flex items-center gap-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium"
          style={{ color: "#94a3b8" }}
        >
          Dashboard
        </Link>
        <Link
          href="/workouts"
          className="text-sm font-medium"
          style={{ color: "#94a3b8" }}
        >
          Workouts
        </Link>
        {session?.role === "coach" && (
          <Link
            href="/coach"
            className="text-sm font-medium"
            style={{ color: "#94a3b8" }}
          >
            Coach
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium" style={{ color: "#f0f4ff" }}>
            {session?.name}
          </p>
          <p className="text-xs capitalize" style={{ color: "#f97316" }}>
            {session?.role}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155" }}
          >
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
