import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import WorkoutForm from "./WorkoutForm";
import { Suspense } from "react";

export default async function NewWorkoutPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div style={{ background: "var(--vel-black)", minHeight: "100vh" }}>
      <Navbar />
      <Suspense fallback={<div className="p-8 text-center" style={{ color: "var(--vel-text-secondary)" }}>Loading...</div>}>
        <WorkoutForm />
      </Suspense>
    </div>
  );
}
