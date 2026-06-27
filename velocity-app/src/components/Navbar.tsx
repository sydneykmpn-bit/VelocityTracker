import Link from "next/link";
import { getSession } from "@/lib/session";
import { logout } from "@/app/actions/auth";

export default async function Navbar() {
  const session = await getSession();

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        background: "rgba(9,9,9,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--vel-border)",
      }}
    >
      <Link href="/dashboard" className="flex items-center">
        <img src="/logo.png" alt="Velocity Fitness PH" style={{ height: "36px" }} />
      </Link>

      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="nav-link">
          Dashboard
        </Link>
        <Link href="/workouts" className="nav-link">
          Workouts
        </Link>
        {session?.role === "coach" && (
          <Link href="/coach" className="nav-link">
            Coach
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium" style={{ color: "var(--vel-text-primary)" }}>
            {session?.name}
          </p>
          <p className="text-xs capitalize" style={{ color: "var(--vel-teal)" }}>
            {session?.role}
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="btn-ghost">
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
