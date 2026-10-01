import type { SVGProps } from "react";

type IllustrationProps = SVGProps<SVGSVGElement>;

const STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const WAVE_LENGTH = 10;
const WAVE_DEPTH = 2.6;

function buildWavyEdge(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  isInwardPositive: boolean,
): string {
  const length = Math.hypot(toX - fromX, toY - fromY);
  const steps = Math.max(Math.round(length / WAVE_LENGTH), 1);
  const unitX = (toX - fromX) / steps;
  const unitY = (toY - fromY) / steps;
  const normalX = (-unitY / Math.hypot(unitX, unitY)) * WAVE_DEPTH;
  const normalY = (unitX / Math.hypot(unitX, unitY)) * WAVE_DEPTH;
  const direction = isInwardPositive ? 1 : -1;

  return Array.from({ length: steps }, (_, step) => {
    const controlX = fromX + unitX * (step + 0.5) + normalX * direction;
    const controlY = fromY + unitY * (step + 0.5) + normalY * direction;
    const endX = fromX + unitX * (step + 1);
    const endY = fromY + unitY * (step + 1);
    return `Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }).join(" ");
}

const FRAME_PATH = [
  "M 12 10",
  buildWavyEdge(12, 10, 108, 10, false),
  buildWavyEdge(108, 10, 108, 130, false),
  buildWavyEdge(108, 130, 12, 130, false),
  buildWavyEdge(12, 130, 12, 10, false),
  "Z",
].join(" ");

function Sparkle({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <path
      {...STROKE_PROPS}
      strokeWidth={2.2}
      d={`M ${x} ${y - size} Q ${x} ${y} ${x + size} ${y} Q ${x} ${y} ${x} ${y + size} Q ${x} ${y} ${x - size} ${y} Q ${x} ${y} ${x} ${y - size} Z`}
    />
  );
}

export function CupFrameIllustration(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 140" aria-hidden {...props}>
      <path {...STROKE_PROPS} d={FRAME_PATH} />
      <rect
        {...STROKE_PROPS}
        strokeWidth={1.8}
        x={22}
        y={20}
        width={76}
        height={100}
        rx={3}
      />
      <Sparkle x={36} y={40} size={7} />
      <path {...STROKE_PROPS} d="M 54 36 q -4 6 0 12 q 4 6 0 12" />
      <path {...STROKE_PROPS} d="M 64 32 q -4 6 0 12 q 4 6 0 12" />
      <path {...STROKE_PROPS} d="M 74 36 q -4 6 0 12 q 4 6 0 12" />
      <path
        {...STROKE_PROPS}
        d="M 40 70 h 42 v 24 q 0 14 -14 14 h -14 q -14 0 -14 -14 Z"
      />
      <path {...STROKE_PROPS} d="M 82 76 h 6 q 8 0 8 9 q 0 9 -8 9 h -6" />
      <ellipse {...STROKE_PROPS} cx={61} cy={112} rx={30} ry={5} />
      <circle cx={53} cy={84} r={2.4} fill="currentColor" />
      <circle cx={69} cy={84} r={2.4} fill="currentColor" />
      <path {...STROKE_PROPS} d="M 52 92 q 9 8 18 0" />
    </svg>
  );
}

export function StackedCupsIllustration(props: IllustrationProps) {
  return (
    <svg viewBox="0 0 140 170" aria-hidden {...props}>
      <Sparkle x={18} y={38} size={9} />
      <Sparkle x={124} y={52} size={7} />
      <Sparkle x={122} y={150} size={5} />
      <path {...STROKE_PROPS} d="M 56 14 q -4 6 0 12 q 4 6 0 12" />
      <path {...STROKE_PROPS} d="M 66 8 q -4 6 0 12 q 4 6 0 12 q -4 6 0 12" />
      <path {...STROKE_PROPS} d="M 76 14 q -4 6 0 12 q 4 6 0 12" />

      <path
        {...STROKE_PROPS}
        d="M 44 46 h 46 l -4 26 q -2 6 -8 6 h -22 q -6 0 -8 -6 Z"
      />
      <path {...STROKE_PROPS} d="M 89 52 q 10 0 10 8 q 0 8 -12 8" />
      <path {...STROKE_PROPS} d="M 56 58 l 5 4 m 0 -4 l -5 4" />
      <path {...STROKE_PROPS} d="M 72 58 l 5 4 m 0 -4 l -5 4" />
      <path {...STROKE_PROPS} d="M 61 69 q 6 -4 12 0" />

      <path
        {...STROKE_PROPS}
        d="M 36 80 h 62 l -5 30 q -2 7 -9 7 h -34 q -7 0 -9 -7 Z"
      />
      <path {...STROKE_PROPS} d="M 97 87 q 12 0 12 10 q 0 10 -14 10" />
      <circle cx={56} cy={94} r={2.4} fill="currentColor" />
      <circle cx={78} cy={94} r={2.4} fill="currentColor" />
      <path {...STROKE_PROPS} d="M 58 104 h 18 v 4 q -9 5 -18 0 Z" />

      <path
        {...STROKE_PROPS}
        d="M 30 120 h 74 l -6 26 q -2 8 -10 8 h -42 q -8 0 -10 -8 Z"
      />
      <path {...STROKE_PROPS} d="M 103 126 q 13 0 13 10 q 0 10 -15 10" />
      <path {...STROKE_PROPS} d="M 50 132 q 4 -5 8 0" />
      <path {...STROKE_PROPS} d="M 74 132 q 4 -5 8 0" />
      <path {...STROKE_PROPS} d="M 56 141 q 10 9 20 0 Z" />

      <ellipse {...STROKE_PROPS} cx={67} cy={160} rx={48} ry={6} />
      <path
        {...STROKE_PROPS}
        strokeWidth={2}
        d="M 14 112 l 8 2 m -6 10 l 8 -2"
      />
      <path
        {...STROKE_PROPS}
        strokeWidth={2}
        d="M 120 110 l -8 3 m 6 9 l -8 -2"
      />
    </svg>
  );
}
