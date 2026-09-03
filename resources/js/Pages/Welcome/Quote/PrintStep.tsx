type Props = {
  designType?: string;
  setDesignType: (v: string) => void;
  onBack: () => void;
  onAdd: () => void;
};

export default function PrintStep({
  designType = "",
  setDesignType,
  onBack,
  onAdd,
}: Props) {
  const gold = "#C9A24D";

  const isValid =
    designType && designType.trim() !== "";

  const printOptions = [
    { name: "Logo", icon: Badge },
    { name: "Custom Artwork Upload", icon: FileImage },
    { name: "Complex Pattern", icon: Layers3 },
    { name: "Personalised Text", icon: Type },
    { name: "Event / Team Branding", icon: Users },
    { name: "Image & Text", icon: ImagePlus },
  ];

  return (
    <div className="bg-white px-3 sm:px-4 md:px-0 pt-0 pb-10 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="mb-8">
        <div className="w-fit">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Print Style
          </h2>
          <div className="h-[2px] mt-3" style={{ backgroundColor: gold }} />
        </div>
      </div>

      {/* DESIGN TYPE GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-10 sm:mb-14">
        {printOptions.map((option) => {
          const selected = designType === option.name;
          const Icon = option.icon;

          return (
            <button
              key={option.name}
              type="button"
              onClick={() => {
                setDesignType(option.name);
              }}
              className="rounded-2xl border transition-all duration-300 text-left overflow-hidden"
              style={{
                borderColor: selected ? gold : "#E5E7EB",
                boxShadow: selected ? `0 0 0 2px ${gold}20` : "none",
              }}
            >
              <div className="flex aspect-[5/4] items-center justify-center bg-gradient-to-br from-[#FFF9EC] to-[#F4E4BD]">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D8BD7A] bg-white text-[#80621F] shadow-sm transition-transform duration-300 hover:scale-105">
                  <Icon className="h-8 w-8" aria-hidden="true" />
                </span>
              </div>

              <div className="p-3 sm:p-4">
                <p
                  className="text-sm sm:text-base font-semibold leading-snug"
                  style={{ color: selected ? gold : "#111827" }}
                >
                  {option.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* BUTTONS */}
      <div className="flex flex-col md:flex-row gap-3 sm:gap-5">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 sm:py-5 rounded-2xl border-2 text-sm sm:text-base font-semibold tracking-wide transition-all duration-300 hover:bg-[#C9A24D] hover:text-white"
          style={{ borderColor: gold, color: gold }}
        >
          Back
        </button>

        <button
          onClick={() => {
            if (!isValid) return;
            onAdd();
          }}
          className="flex-1 py-3.5 sm:py-5 rounded-2xl text-sm sm:text-base text-white font-semibold tracking-wide transition-all duration-300"
          style={{
            backgroundColor: gold,
            opacity: isValid ? 1 : 0.6,
            cursor: isValid ? "pointer" : "not-allowed",
          }}
        >
          Add Item
        </button>
      </div>
    </div>
  );
}
import { Badge, FileImage, ImagePlus, Layers3, Type, Users } from "lucide-react";
