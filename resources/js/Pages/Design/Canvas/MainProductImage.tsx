// 🧱 Displays the main product image centered in the canvas as a non-interactive background reference.


export default function MainProductImage({ src }: { src: string }) {
  if (!src) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-gray-200">
      <img
        key={src}               // 🔥 THIS IS THE FIX
        src={src}
        alt="Product"
        className="max-w-full max-h-full object-contain"
        draggable={false}
      />
    </div>
  );
}
