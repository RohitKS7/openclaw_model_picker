"use client";

import { AnimatedCountUp } from "@/components/shared/AnimatedCountUp";

interface CostEstimateProps {
  low: number;
  high: number;
  isFlatRate?: boolean;
}

export function CostEstimate({ low, high, isFlatRate }: CostEstimateProps) {
  const safeLow = typeof low === "number" && !isNaN(low) ? low : null;
  const safeHigh = typeof high === "number" && !isNaN(high) ? high : null;

  return (
    <section className="rounded-brand border border-primary/20 bg-secondary/40 p-5 hover-lift">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Estimated Monthly Cost</p>
      {isFlatRate && safeLow === 0 && safeHigh === 0 ? (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <span className="text-4xl font-bold text-foreground">Included in your plan</span>
            <span className="pb-1 text-sm text-muted-foreground">— verify rate limits</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Subscription cost included. Check your plan for usage limits.
          </p>
        </>
      ) : isFlatRate ? (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <AnimatedCountUp value={safeLow || 0} prefix="$" className="text-4xl font-bold text-foreground" />
            <span className="pb-1 text-sm text-muted-foreground">/ month flat — included in your subscription plan</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Fixed subscription cost. No variable usage charges.
          </p>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <AnimatedCountUp value={safeLow !== null ? safeLow : 0} prefix="$" className="text-4xl font-bold text-foreground" />
            <span className="pb-1 text-2xl font-bold text-muted-foreground">-</span>
            <AnimatedCountUp value={safeHigh !== null ? safeHigh : 0} prefix="$" className="text-4xl font-bold text-foreground" />
            <span className="pb-1 text-sm text-muted-foreground">/ month</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Typical cost for this use case. Verify exact spend in the Token Cost Calculator before budgeting.
          </p>
        </>
      )}
    </section>
  );
}
