import { useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  totalSeconds: number;
}

function computeCountdown(target: number): CountdownParts {
  const now = Date.now();
  const totalSeconds = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, isPast: target <= now, totalSeconds };
}

/**
 * Live countdown hook — recomputes every `intervalMs` (default 1000ms).
 * Returns a stable object that updates on the interval.
 */
export function useCountdown(targetIso: string, intervalMs = 1000): CountdownParts {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [parts, setParts] = useState<CountdownParts>(() => computeCountdown(target));

  useEffect(() => {
    setParts(computeCountdown(target));
    const id = setInterval(() => setParts(computeCountdown(target)), intervalMs);
    return () => clearInterval(id);
  }, [target, intervalMs]);

  return parts;
}

interface CountdownTimerProps {
  targetIso: string;
  /** Compact style: "3d 4h" — otherwise "3d 04h 12m" */
  compact?: boolean;
  className?: string;
  /** Show the timer icon */
  showIcon?: boolean;
}

/**
 * Self-contained countdown timer that ticks every second and shows
 * days + hours remaining until the target ISO date.
 */
export default function CountdownTimer({
  targetIso,
  compact = false,
  className,
  showIcon = true,
}: CountdownTimerProps) {
  const { days, hours, minutes, isPast } = useCountdown(targetIso);

  if (isPast) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground",
          className,
        )}
      >
        {showIcon && <Timer className="h-3 w-3" />}
        Started
      </span>
    );
  }

  const dayLabel = days > 0 ? `${days}d` : "";
  const hourLabel = `${hours}h`;
  const minLabel = !compact ? ` ${String(minutes).padStart(2, "0")}m` : "";

  const label = `${dayLabel} ${hourLabel}${minLabel}`.trim();

  const isUrgent = days === 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        isUrgent
          ? "animate-pulse bg-red-500/10 text-red-600 dark:text-red-400"
          : "bg-primary/10 text-primary",
        className,
      )}
    >
      {showIcon && <Timer className="h-3 w-3" />}
      {label}
    </span>
  );
}
