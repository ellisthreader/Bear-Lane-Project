type Props = {
  designType?: string;
  setDesignType: (v: string) => void;
  onBack: () => void;
  onAdd: () => void;
};

export default function EmbroideryStep({
  designType = "",
  setDesignType,
  onBack,
  onAdd,
}: Props) {
  const gold = "#C9A24D";

  const isValid =
    designType && designType.trim() !== "";

  const embroideryOptions = [
    { name: "Logo", image: "/images/embroidery/logo.png" },
    { name: "Custom Artwork Upload", image: "/images/embroidery/custom.png" },
    { name: "Complex Pattern", image: "/images/embroidery/pattern.png" },
    { name: "Personalised Text", image: "/images/embroidery/text.png" },
    { name: "Event / Team Branding", image: "/images/embroidery/teambranding.png" },
    { name: "Image & Text", image: "/images/embroidery/imagetext.png" },
  ];

  return (
    <div className="bg-white px-4 md:px-0 pt-0 pb-10 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="mb-8">
        <div className="w-fit">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
            Embroidery
          </h2>
          <div className="h-[2px] mt-3" style={{ backgroundColor: gold }} />
        </div>
      </div>

      {/* DESIGN TYPE GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-14">
        {embroideryOptions.map((option) => {
          const selected = designType === option.name;

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
              <div className="aspect-[5/4] bg-gray-100 overflow-hidden">
                <img
                  src={option.image}
                  alt={option.name}
                  className="w-full h-full object-contain p-0 scale-105 hover:scale-110 transition-transform duration-500"
                />
              </div>

              <div className="p-4">
                <p
                  className="font-semibold"
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
      <div className="flex flex-col md:flex-row gap-5">
        <button
          onClick={onBack}
          className="flex-1 py-5 rounded-2xl border-2 font-semibold tracking-wide transition-all duration-300 hover:bg-[#C9A24D] hover:text-white"
          style={{ borderColor: gold, color: gold }}
        >
          Back
        </button>

        <button
          onClick={() => {
            if (!isValid) return;
            onAdd();
          }}
          className="flex-1 py-5 rounded-2xl text-white font-semibold tracking-wide transition-all duration-300"
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
