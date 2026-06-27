"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createWorkout(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const title = (formData.get("title") as string)?.trim();
  const type = formData.get("type") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const duration = formData.get("duration") ? parseInt(formData.get("duration") as string) : null;
  const dateStr = formData.get("date") as string;
  const date = dateStr ? new Date(dateStr) : new Date();

  if (!title || !type) {
    return { error: "Title and type are required." };
  }

  const exerciseNames = formData.getAll("exercise_name") as string[];
  const exerciseSets = formData.getAll("exercise_sets") as string[];
  const exerciseReps = formData.getAll("exercise_reps") as string[];
  const exerciseWeights = formData.getAll("exercise_weight") as string[];
  const exerciseDurations = formData.getAll("exercise_duration") as string[];
  const exerciseNotes = formData.getAll("exercise_notes") as string[];

  const workout = await prisma.workout.create({
    data: {
      title,
      type,
      notes,
      duration,
      date,
      userId: session.userId,
      exercises: {
        create: exerciseNames
          .filter((n) => n.trim())
          .map((name, i) => ({
            name: name.trim(),
            sets: exerciseSets[i] ? parseInt(exerciseSets[i]) : null,
            reps: exerciseReps[i] ? parseInt(exerciseReps[i]) : null,
            weight: exerciseWeights[i] ? parseFloat(exerciseWeights[i]) : null,
            duration: exerciseDurations[i] ? parseInt(exerciseDurations[i]) : null,
            notes: exerciseNotes[i]?.trim() || null,
          })),
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/workouts");
  redirect(`/workouts/${workout.id}`);
}

export async function deleteWorkout(id: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const workout = await prisma.workout.findUnique({ where: { id } });
  if (!workout || workout.userId !== session.userId) {
    redirect("/workouts");
  }

  await prisma.workout.delete({ where: { id } });
  revalidatePath("/dashboard");
  revalidatePath("/workouts");
  redirect("/workouts");
}

export async function createPlan(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "coach") redirect("/dashboard");

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const type = formData.get("type") as string;
  const memberId = (formData.get("memberId") as string) || null;

  if (!title || !type) {
    redirect("/coach");
  }

  await prisma.workoutPlan.create({
    data: {
      title,
      description,
      type,
      coachId: session.userId,
      memberId,
    },
  });

  revalidatePath("/coach");
  redirect("/coach");
}
