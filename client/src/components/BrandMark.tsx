type BrandMarkProps = {
  size?: number;
  className?: string;
  alt?: string;
};

export function BrandMark({ size = 32, className = "", alt = "" }: BrandMarkProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`rounded-[22%] ${className}`}
    />
  );
}

export function BrandLockup({
  inverted = false,
  size = 32,
}: {
  inverted?: boolean;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={size} />
      <span className={`text-[15px] font-semibold tracking-tight ${inverted ? "text-white" : "text-ink"}`}>
        Fleetify
      </span>
    </span>
  );
}
