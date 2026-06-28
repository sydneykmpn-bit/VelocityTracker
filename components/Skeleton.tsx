import React from "react";

interface SkeletonProps {
  height?: number | string;
  width?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ height = 20, width = "100%", className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, width, ...style }}
      aria-hidden="true"
    />
  );
}

export function WorkoutCardSkeleton() {
  return (
    <div className="card-vel p-4 space-y-2" aria-hidden="true">
      <Skeleton height={16} width="60%" />
      <Skeleton height={12} width="40%" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card-vel p-4 text-center" aria-hidden="true">
      <Skeleton height={40} width="50%" style={{ margin: "0 auto 0.5rem" }} />
      <Skeleton height={12} width="70%" style={{ margin: "0 auto" }} />
    </div>
  );
}
