import { useTheme } from "../../hooks/useTheme.js";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      className="border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-white dark:hover:text-white"
      onClick={toggleTheme}
      type="button"
    >
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
