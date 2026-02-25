// Use the same path where your context file is
import { useDarkMode } from "@/Context/DarkModeContext";

export const DarkModeToggle = () => {
  const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
    >
      {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
    </button>
  );
};
