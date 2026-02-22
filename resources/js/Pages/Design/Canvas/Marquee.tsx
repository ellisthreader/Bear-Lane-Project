// 🔲 Renders the visual marquee rectangle used for click-and-drag multi-selection without interfering with pointer events.


type Props = {
  marquee: {
    x: number;
    y: number;
    w: number;
    h: number;
  } | null;
};

export default function Marquee({ marquee }: Props) {
  if (!marquee) return null;

  return (
    <>
      {/* MUST NOT BLOCK MOUSE EVENTS */}
      <div className="absolute inset-0 z-[9999] pointer-events-none cursor-crosshair" />

      <div
        className="absolute border-2 border-[#C6A75E] bg-[#C6A75E]/20 z-[10000] pointer-events-none"
        style={{
          left: marquee.x,
          top: marquee.y,
          width: marquee.w,
          height: marquee.h,
        }}
      />
    </>
  );
}
