interface PixelAvatarProps {
  id: number;
  size?: number;
  className?: string;
}

export default function PixelAvatar({ id, size = 160, className = "" }: PixelAvatarProps) {
  return (
    <img
      src={`https://api.normies.art/normie/${id}/image.png`}
      alt={`Normie #${id}`}
      width={size}
      height={size}
      className={`block ${className}`}
      style={{ imageRendering: "pixelated" }}
      loading="lazy"
    />
  );
}
