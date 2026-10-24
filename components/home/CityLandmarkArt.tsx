// components/home/CityLandmarkArt.tsx
//
// Hand-drawn vector landmark art for the "Explore Properties by Major Cities"
// carousel. Used only when a city has no real photograph in the database, so
// the section never shows a bare letter tile or a broken image.
//
// Every scene shares the same 4:3 canvas, horizon and palette so the cards read
// as one set. Nothing here claims to be a photograph: it is a flat, brand-navy
// illustration of the city's best-known landmark.

import React, { useId } from "react";

interface CityLandmarkArtProps {
  city: string;
  className?: string;
}

type SceneProps = { skyId: string; glowId: string; stoneId: string };

const STONE = "rgba(255,255,255,0.92)";
const STONE_SOFT = "rgba(255,255,255,0.62)";
const STONE_FAINT = "rgba(255,255,255,0.28)";

function Minaret({ x, top, height, width = 7 }: { x: number; top: number; height: number; width?: number }) {
  return (
    <g fill={STONE_SOFT}>
      <rect x={x} y={top} width={width} height={height} rx={1} />
      <path d={`M${x - 3} ${top} h${width + 6} l-${width / 2 + 3} -8 h-${width / 2 + 3} z`} />
      <rect x={x - 3} y={top + height * 0.35} width={width + 6} height={3} rx={1} />
    </g>
  );
}

function Dome({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g fill={STONE}>
      <path d={`M${cx - r} ${cy} a${r} ${r} 0 0 1 ${r * 2} 0 z`} />
      <rect x={cx - 1.6} y={cy - r - 9} width={3.2} height={9} rx={1.2} />
      <circle cx={cx} cy={cy - r - 12} r={3} />
    </g>
  );
}

function Battlements({ x, y, width, count = 7 }: { x: number; y: number; width: number; count?: number }) {
  const step = width / count;
  return (
    <g fill={STONE_SOFT}>
      {Array.from({ length: count }).map((_, index) => (
        <rect key={index} x={x + index * step} y={y} width={step * 0.55} height={8} rx={1} />
      ))}
    </g>
  );
}

// ── Landmarks ───────────────────────────────────────────────────────────────

function FaisalMosque({ stoneId }: SceneProps) {
  return (
    <g>
      <Minaret x={112} top={96} height={84} />
      <Minaret x={148} top={110} height={70} />
      <Minaret x={245} top={110} height={70} />
      <Minaret x={281} top={96} height={84} />
      <polygon points="200,74 258,190 142,190" fill={`url(#${stoneId})`} />
      <polygon points="200,74 222,190 178,190" fill={STONE_FAINT} />
      <path d="M200 62 l4 8 h-8 z" fill={STONE} />
      <rect x={138} y={186} width={124} height={6} rx={2} fill={STONE_SOFT} />
    </g>
  );
}

function BadshahiMosque({ stoneId }: SceneProps) {
  return (
    <g>
      <Minaret x={104} top={104} height={78} width={8} />
      <Minaret x={288} top={104} height={78} width={8} />
      <rect x={128} y={150} width={144} height={40} rx={2} fill={`url(#${stoneId})`} />
      <Dome cx={200} cy={150} r={40} />
      <Dome cx={152} cy={156} r={22} />
      <Dome cx={248} cy={156} r={22} />
      <g fill="rgba(0,64,99,0.55)">
        <path d="M176 190 v-18 a10 10 0 0 1 20 0 v18 z" />
        <path d="M200 190 v-18 a10 10 0 0 1 20 0 v18 z" />
        <path d="M152 190 v-12 a8 8 0 0 1 16 0 v12 z" />
        <path d="M232 190 v-12 a8 8 0 0 1 16 0 v12 z" />
      </g>
      <Battlements x={128} y={142} width={144} count={9} />
    </g>
  );
}

function MazarEQuaid({ stoneId }: SceneProps) {
  return (
    <g>
      <rect x={140} y={128} width={120} height={62} rx={3} fill={`url(#${stoneId})`} />
      <Dome cx={200} cy={128} r={38} />
      {[146, 166, 234, 254].map((x) => (
        <rect key={x} x={x} y={118} width={6} height={14} rx={1} fill={STONE_SOFT} />
      ))}
      <rect x={192} y={160} width={16} height={30} rx={1} fill="rgba(0,64,99,0.45)" />
      <rect x={136} y={186} width={128} height={5} rx={2} fill={STONE_SOFT} />
    </g>
  );
}

function FortScene({ stoneId, towers = 2 }: SceneProps & { towers?: number }) {
  return (
    <g>
      <rect x={110} y={140} width={180} height={50} rx={2} fill={`url(#${stoneId})`} />
      <Battlements x={110} y={132} width={180} count={11} />
      {/* Arrow slits + a gate arch keep the wall from reading as a blank slab. */}
      <g fill="rgba(0,64,99,0.45)">
        {[126, 142, 158, 226, 242, 258, 274].map((x) => (
          <rect key={x} x={x} y={150} width={4} height={12} rx={2} />
        ))}
      </g>
      {Array.from({ length: towers }).map((_, index) => {
        const x = towers === 2 ? 104 + index * 176 : 170 + index * 44;
        return (
          <g key={index}>
            <rect x={x} y={112} width={22} height={78} rx={3} fill={STONE} />
            <path d={`M${x - 3} 112 h28 l-14 -12 z`} fill={STONE_SOFT} />
            <rect x={x + 8} y={128} width={5} height={9} rx={2} fill="rgba(0,64,99,0.4)" />
          </g>
        );
      })}
      {/* Pennant on the left tower — one warm accent in an otherwise navy scene. */}
      <rect x={115} y={86} width={2} height={26} rx={1} fill="rgba(255,255,255,0.55)" />
      <path d="M117 86 l18 5 l-18 5 z" fill="#029bba" />
      <path d="M186 190 v-26 a14 14 0 0 1 28 0 v26 z" fill="rgba(0,64,99,0.5)" />
    </g>
  );
}

function ClockTower({ stoneId }: SceneProps) {
  return (
    <g>
      <rect x={176} y={150} width={48} height={42} rx={2} fill={`url(#${stoneId})`} />
      <polygon points="176,150 200,108 224,150" fill={STONE} />
      <rect x={192} y={118} width={16} height={16} rx={8} fill="rgba(0,64,99,0.6)" />
      <circle cx={200} cy={126} r={5.5} fill={STONE} />
      <path d="M200 126 v-3.5 M200 126 h3" stroke="rgba(0,64,99,0.75)" strokeWidth={1.4} strokeLinecap="round" />
      <rect x={196} y={96} width={8} height={14} rx={2} fill={STONE_SOFT} />
      <path d="M200 88 l3 8 h-6 z" fill={STONE} />
      <rect x={148} y={166} width={104} height={24} rx={2} fill={STONE_FAINT} />
    </g>
  );
}

function ShrineScene({ stoneId }: SceneProps) {
  return (
    <g>
      <polygon points="150,190 160,146 240,146 250,190" fill={`url(#${stoneId})`} />
      <Dome cx={200} cy={146} r={40} />
      <Dome cx={158} cy={152} r={16} />
      <Dome cx={242} cy={152} r={16} />
      <rect x={192} y={164} width={16} height={26} rx={1} fill="rgba(0,64,99,0.45)" />
      <rect x={146} y={186} width={108} height={5} rx={2} fill={STONE_SOFT} />
    </g>
  );
}

function Mountains({ stoneId }: SceneProps) {
  return (
    <g>
      <polygon points="70,190 140,104 206,190" fill={`url(#${stoneId})`} />
      <polygon points="150,190 226,118 300,190" fill={STONE_SOFT} />
      <polygon points="140,104 158,128 122,128" fill={STONE} />
      <polygon points="226,118 242,140 210,140" fill={STONE} />
      <rect x={244} y={158} width={54} height={32} rx={2} fill={STONE_FAINT} />
      <Battlements x={244} y={152} width={54} count={4} />
    </g>
  );
}

function SkylineScene({ stoneId }: SceneProps) {
  return (
    <g>
      <rect x={78} y={148} width={38} height={42} rx={2} fill={STONE_FAINT} />
      <rect x={124} y={124} width={44} height={66} rx={2} fill={`url(#${stoneId})`} />
      <rect x={176} y={140} width={34} height={50} rx={2} fill={STONE_SOFT} />
      <rect x={218} y={108} width={48} height={82} rx={2} fill={`url(#${stoneId})`} />
      <rect x={274} y={152} width={40} height={38} rx={2} fill={STONE_FAINT} />
      <rect x={238} y={88} width={6} height={20} rx={1} fill={STONE} />
      <g fill="rgba(0,64,99,0.45)">
        {[132, 146, 160, 228, 242, 256].map((x) =>
          [134, 150, 166].map((y) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={6} height={6} rx={1} />
          ))
        )}
      </g>
    </g>
  );
}

const SCENES: Record<string, (props: SceneProps) => React.ReactElement> = {
  Islamabad: FaisalMosque,
  Lahore: BadshahiMosque,
  Karachi: MazarEQuaid,
  Rawalpindi: (props) => <FortScene {...props} towers={2} />,
  Faisalabad: ClockTower,
  Multan: ShrineScene,
  Peshawar: (props) => <FortScene {...props} towers={3} />,
  Quetta: Mountains,
  Hyderabad: (props) => <FortScene {...props} towers={2} />,
  Gujranwala: SkylineScene,
  Sialkot: SkylineScene,
  Bahawalpur: SkylineScene,
};

export function CityLandmarkArt({ city, className = "" }: CityLandmarkArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const skyId = `city-sky-${uid}`;
  const glowId = `city-glow-${uid}`;
  const stoneId = `city-stone-${uid}`;
  const Scene = SCENES[city] ?? SkylineScene;

  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label={`${city} landmark illustration`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#001f2b" />
          <stop offset="55%" stopColor="#004063" />
          <stop offset="100%" stopColor="#026b80" />
        </linearGradient>
        <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#029bba" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#029bba" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={stoneId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.45)" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#${skyId})`} />
      <circle cx="318" cy="74" r="92" fill={`url(#${glowId})`} />
      <circle cx="318" cy="74" r="20" fill="rgba(255,255,255,0.14)" />
      <circle cx="318" cy="74" r="12" fill="rgba(255,255,255,0.35)" />

      {/* Distant ridge line keeps the horizon from looking empty. */}
      <path
        d="M0 196 L48 176 L96 194 L150 168 L206 192 L262 172 L318 194 L360 180 L400 196 L400 300 L0 300 Z"
        fill="rgba(0,31,43,0.55)"
      />

      <Scene skyId={skyId} glowId={glowId} stoneId={stoneId} />

      <rect y="190" width="400" height="110" fill="rgba(0,31,43,0.35)" />
      <rect y="188" width="400" height="2" fill="rgba(255,255,255,0.10)" />
    </svg>
  );
}

export default CityLandmarkArt;
