import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, cycle } = useTheme();
  return (
    <button
      type="button"
      onClick={cycle}
      className={`group relative inline-flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg ring-1 ring-line transition-[background-color,transform] duration-[180ms] ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-canvas active:scale-[0.96] ${className}`}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="relative grid h-4 w-4 place-items-center">
        <Sun
          size={16}
          weight="bold"
          className={`absolute transition-[opacity,transform] duration-[180ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
            mode === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-90 -rotate-90 opacity-0"
          }`}
        />
        <Moon
          size={16}
          weight="bold"
          className={`absolute transition-[opacity,transform] duration-[180ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
            mode === "light" ? "scale-100 rotate-0 opacity-100" : "scale-90 rotate-90 opacity-0"
          }`}
        />
      </span>
    </button>
  );
}
