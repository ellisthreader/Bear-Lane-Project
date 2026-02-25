import React, { useState, useEffect, useRef } from "react";

// Code typed at the prompt
const codeLines = [
  "const skills = {",
  "  frontend: ['React', 'Next.js'],",
  "  backend: ['Node.js', 'Express'],",
  "  styling: ['Tailwind CSS', 'ShadCN/UI'],",
  "};",
  "",
  "// Developer summary",
  "I have strong experience in modern web development, writing clean and efficient code in JavaScript and TypeScript.",
  "I build dynamic front-end applications using React and Next.js, and I work with Node.js and Express for backend development.",
  "I also have experience with styling frameworks like Tailwind CSS and UI libraries such as ShadCN/UI.",
];

// ASCII face shown after typing is fully complete
const asciiFace = [
  "⠀⠀⠀⠀⣀⡤⠴⠶⠲⠦⢤⣀⠀⠀⠀⠀⠀",
  "⠀⠀⢠⠞⠉⠀⠀⠀⠀⠀⠀⠉⠳⡄⠀⠀⠀",
  "⠀⢠⠏⠀⠀⣤⡄⠀⠀⢠⣤⠀⠀⠹⡆⠀⠀",
  "⠀⣾⠀⠀⠀⠉⠁⠀⠀⠈⠉⠀⠀⠀⣷⠀⠀",
  "⠀⢻⠀⠀⠘⣆⠀⠀⠀⠀⣰⠇⠀⠀⡟⠀⠀",
  "⠀⠘⣧⠀⠀⠈⠓⠶⠴⠚⠁⠀⠀⣰⠃⠀⠀",
  "⠀⠀⠈⠳⣄⡀⠀⠀⠀⠀⢀⣠⠞⠁⠀⠀⠀",
  "⠀⠀⠀⠀⠀⠉⠛⠒⠒⠚⠉⠁⠀⠀⠀⠀",
];

export default function CodingTerminal() {
  const [visibleChars, setVisibleChars] = useState(0);
  const [showFace, setShowFace] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((prev) => !prev), 500);
    return () => clearInterval(interval);
  }, []);

  const fullText = codeLines.join("\n");
  const totalChars = fullText.length;

  // Scroll-driven typing
  useEffect(() => {
    const SCROLL_SPEED = 1.8;
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      let progress = (windowHeight - rect.top) / (windowHeight + rect.height);
      progress = Math.min(1, Math.max(0, progress));

      const chars = Math.floor(progress * SCROLL_SPEED * totalChars);
      setVisibleChars(chars);

      // only reveal the face AFTER everything is typed
      if (chars >= totalChars) {
        setShowFace(true);
      } else {
        setShowFace(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [totalChars]);

  // Build typed code
  const typedCode = fullText.slice(0, visibleChars);

  return (
    <div
      ref={containerRef}
      className="bg-black font-mono p-6 rounded-lg w-full max-w-3xl shadow-lg relative"
      style={{ minHeight: "500px" }}
    >
      {/* Terminal top bar */}
      <div className="absolute top-0 left-0 w-full h-6 bg-gray-800 rounded-t-lg flex items-center px-3 text-sm text-gray-200">
        $ Terminal
      </div>

      <div className="pt-8">
        {/* Terminal prompt */}
        <div className="mb-2 text-sm whitespace-pre-wrap text-white">
          <span className="text-green-400">ellis@ellis-Z270P-D3</span>
          <span className="text-white">:</span>
          <span className="text-blue-400">~/Desktop/PortfolioWebsite</span>
          <span className="text-white">$ </span>
          <span className="text-white">{typedCode}</span>
          {/* Cursor */}
          <span
            className={`inline-block w-1 ${
              cursorVisible ? "bg-white" : "bg-transparent"
            }`}
          >
            &nbsp;
          </span>
        </div>

        {/* ASCII face appears ONLY after code finishes */}
        {showFace && (
          <pre className="whitespace-pre-wrap leading-relaxed text-white mt-4 text-sm">
            {asciiFace.join("\n")}
          </pre>
        )}
      </div>
    </div>
  );
}
