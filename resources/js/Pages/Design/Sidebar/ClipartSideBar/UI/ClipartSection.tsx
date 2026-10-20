import React from "react";

interface ClipartSectionProps {
  title: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export default function ClipartSection({
  title,
  onClick,
  icon,
}: ClipartSectionProps) {
  return (
    <button
      onClick={onClick}
      className="
        group relative
        flex flex-col items-center justify-between
        p-4 w-full h-36
        bg-white
        rounded-2xl
        shadow-sm hover:shadow-md
        hover:-translate-y-1
        transition-all duration-300
        border border-gray-200
      "
    >
      <div className="
        flex items-center justify-center
        w-12 h-12
        rounded-full
        bg-gradient-to-br from-[#F7F1E2] to-[#E9DBB6]
        text-[#8A6D2B]
        text-3xl
        group-hover:scale-110 transition-transform
      ">
        {icon}
      </div>

      <h3 className="font-semibold text-sm text-center text-gray-900">
        {title}
      </h3>
    </button>
  );
}
