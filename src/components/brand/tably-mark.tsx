const MASKABLE_GLYPH_RATIO = 0.42;
const REGULAR_GLYPH_RATIO = 0.56;
const REGULAR_CORNER_RATIO = 0.22;

type TablyMarkProps = {
  size: number;
  isMaskable?: boolean;
};

export function TablyMark({ size, isMaskable = false }: TablyMarkProps) {
  const glyphSize = Math.round(
    size * (isMaskable ? MASKABLE_GLYPH_RATIO : REGULAR_GLYPH_RATIO),
  );
  const cornerRadius = isMaskable ? 0 : Math.round(size * REGULAR_CORNER_RATIO);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1f5a43",
        borderRadius: cornerRadius,
      }}
    >
      <div
        style={{
          width: glyphSize,
          height: glyphSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: Math.round(glyphSize * 0.28),
          color: "#1f5a43",
          fontSize: Math.round(glyphSize * 0.66),
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: "-0.04em",
        }}
      >
        t
      </div>
    </div>
  );
}
