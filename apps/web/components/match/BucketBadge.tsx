import type { Bucket } from "@/lib/types";
import { cn } from "@/lib/utils";

export const BUCKET_LABEL: Record<Bucket, string> = {
  strong: "Strong match",
  good: "Good match",
  explore: "Worth exploring",
};

export const BUCKET_HINT: Record<Bucket, string> = {
  strong: "Most must-have skills evidenced",
  good: "About half the must-haves evidenced",
  explore: "Some related evidence — open questions",
};

export function BucketBadge({ bucket, className }: { bucket: Bucket; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        bucket === "strong" && "bg-emerald-50 text-emerald-700",
        bucket === "good" && "bg-signal-accentSoft text-signal-accent",
        bucket === "explore" && "bg-amber-50 text-amber-700",
        className,
      )}
      title={BUCKET_HINT[bucket]}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          bucket === "strong" && "bg-emerald-500",
          bucket === "good" && "bg-signal-accent",
          bucket === "explore" && "bg-amber-500",
        )}
      />
      {BUCKET_LABEL[bucket]}
    </span>
  );
}
