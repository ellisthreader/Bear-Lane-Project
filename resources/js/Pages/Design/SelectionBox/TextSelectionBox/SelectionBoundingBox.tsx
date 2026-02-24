export default function SelectionBoundingBox({
  children,
  box
}: {
  children: React.ReactNode;
  box: { left: number; top: number; width: number; height: number };
}) {
  return (
    <div
      className="absolute border-2 border-[#C6A75E] pointer-events-none"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        background: "rgba(198,167,94,0.12)",
        zIndex: 310
      }}
    >
      {children}
    </div>
  );
}
