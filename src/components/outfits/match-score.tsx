"use client";

import { Calculator, Gauge, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MatchScore } from "@/types";

function scoreTone(score: number) {
  if (score >= 85)
    return "text-emerald-700 bg-emerald-500/12 ring-emerald-600/25 dark:text-emerald-400";
  if (score >= 70) return "text-sky-700 bg-sky-500/12 ring-sky-600/25 dark:text-sky-400";
  if (score >= 50) return "text-amber-700 bg-amber-500/12 ring-amber-600/25 dark:text-amber-400";
  return "text-rose-700 bg-rose-500/12 ring-rose-600/25 dark:text-rose-400";
}

// Compact "94% Match" pill, used on the canvas panel and gallery cards.
export function MatchBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1",
        scoreTone(score),
        className,
      )}
    >
      <Gauge className="size-3.5" />
      {score}% Match
    </span>
  );
}

// Canvas panel: shows the score and explanation, or a button to request one.
export function MatchScorePanel({
  match,
  stale,
  pending,
  canScore,
  onCheck,
}: {
  match: MatchScore | null;
  // The items changed since this score was computed.
  stale: boolean;
  pending: boolean;
  canScore: boolean;
  onCheck: () => void;
}) {
  return (
    <div
      className="flex w-full max-w-xl flex-col gap-2 rounded-xl border bg-card p-3 text-sm"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {match ? (
            <MatchBadge score={match.score} className={cn(stale && "opacity-50")} />
          ) : (
            <span className="font-medium">Color &amp; style match</span>
          )}
          {match && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {match.source === "estimate" ? (
                <Calculator className="size-3" />
              ) : (
                <Sparkles className="size-3" />
              )}
              {{ ai: "Gemini", estimate: "Estimated", saved: "Saved score" }[match.source]}
            </span>
          )}
        </div>
        {(!match || stale) && (
          <Button variant="outline" size="sm" onClick={onCheck} disabled={pending || !canScore}>
            {pending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : match ? (
              <RefreshCw data-icon="inline-start" />
            ) : (
              <Gauge data-icon="inline-start" />
            )}
            {match ? "Re-check" : "Check match"}
          </Button>
        )}
      </div>
      {match ? (
        <p
          className={cn(
            "text-muted-foreground",
            stale && "line-through decoration-muted-foreground/40",
          )}
        >
          {match.summary}
        </p>
      ) : (
        <p className="text-muted-foreground">
          {canScore
            ? "Ask the AI stylist how well these pieces work together."
            : "Add at least two items to get a match score."}
        </p>
      )}
      {match && stale && (
        <p className="text-xs text-muted-foreground">
          The outfit changed since this score. Re-check to update it.
        </p>
      )}
    </div>
  );
}
