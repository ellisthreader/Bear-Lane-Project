import { X } from "lucide-react";

type SidebarHeaderProps = {
  title: string;
  onClose: () => void;
};

export default function SidebarHeader({
  title,
  onClose,
}: SidebarHeaderProps) {
  return (
    <div
      className="
        sticky top-0 z-20
        flex items-center justify-between
        px-4 py-3
        bg-white/95
        backdrop-blur
        border-b border-gray-200
        shadow-sm
      "
    >
      <h2 className="font-semibold text-sm text-gray-900">
        {title}
      </h2>

      <button
        onClick={() => {
          console.log("[SidebarHeader] Close clicked");
          onClose();
        }}
        className="
          p-1.5 rounded-md
          text-gray-600
          hover:bg-[#C6A75E]/15 hover:text-[#8A6D2B]
          transition
        "
        aria-label="Close sidebar"
      >
        <X size={18} />
      </button>
    </div>
  );
}
