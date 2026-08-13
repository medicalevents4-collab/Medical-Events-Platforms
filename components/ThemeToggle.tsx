import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  /** Use "sidebar" variant for placement on the dark moss sidebar. */
  variant?: "default" | "sidebar";
}

export function ThemeToggle({ className, variant = "default" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const base =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const styles =
    variant === "sidebar"
      ? cn(
          base,
          "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
          className
        )
      : cn(
          base,
          "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
          className
        );

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={styles}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5" />
      ) : (
        <Moon className="h-4.5 w-4.5" />
      )}
    </button>
  );
}
