// 🚧 Visually outlines the restricted area within the canvas where images are allowed to be positioned and manipulated.

export default function RestrictedArea({ box }: { box: any }) {
  return (
    <div
      className="absolute border-2 border-dashed border-[#C6A75E] pointer-events-none"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      }}
    />
  );
}
