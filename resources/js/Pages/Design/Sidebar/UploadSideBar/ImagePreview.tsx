export default function ImagePreview({ image }: any) {
  if (!image) return null;

  const scaleX = image.flip === "horizontal" ? -1 : 1;
  const scaleY = image.flip === "vertical" ? -1 : 1;

  return (
    <div className="h-48 border rounded flex justify-center items-center">
      <img
        src={image.url}
        style={{
          width: image.size.w,
          height: image.size.h,
          transform: `rotate(${image.rotation}deg) scaleX(${scaleX}) scaleY(${scaleY})`,
        }}
        className="object-contain"
      />
    </div>
  );
}