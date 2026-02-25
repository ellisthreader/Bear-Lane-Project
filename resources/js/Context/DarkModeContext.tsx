import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export const DarkModeProvider = ({ children }: { children: ReactNode }) => {
  // Initialize dark mode state from localStorage or OS preference
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("darkMode");
      if (saved !== null) return saved === "true";

      // fallback to system preference
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Apply 'dark' class whenever darkMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");

    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = () => useContext(DarkModeContext);
