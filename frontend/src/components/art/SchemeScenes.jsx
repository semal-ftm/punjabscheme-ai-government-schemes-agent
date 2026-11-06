/*
 * Illustrated scenes for scheme themes (flat, layered, "realistic illustration" style, matching PunjabScene).
 * Design space: viewBox 0 0 400 180, ground line at y = 142. Sky and ground are drawn far beyond the viewBox
 * so that `preserveAspectRatio="xMidYMax meet"` fills any card shape (narrow cards, wide banners) without
 * cropping the subject. Gradient ids are prefixed per theme so many cards can share one page safely.
 */

// ---------------------------------------------------------------- shared pieces
function Sky({ id, top, bottom, groundTop = "#9cc27a", groundBottom = "#6f9a52" }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} gradientUnits="userSpaceOnUse" x1="0" y1="-40" x2="0" y2="142">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <linearGradient id={`${id}-ground`} gradientUnits="userSpaceOnUse" x1="0" y1="142" x2="0" y2="200">
          <stop offset="0" stopColor={groundTop} />
          <stop offset="1" stopColor={groundBottom} />
        </linearGradient>
      </defs>
      <rect x="-800" y="-400" width="2000" height="545" fill={`url(#${id}-sky)`} />
      <rect x="-800" y="141" width="2000" height="300" fill={`url(#${id}-ground)`} />
    </>
  );
}

const Sun = ({ x, y, r = 14, color = "#ffd36a", glow = 0.35 }) => (
  <g>
    <circle cx={x} cy={y} r={r * 2.4} fill={color} opacity={glow * 0.5} />
    <circle cx={x} cy={y} r={r * 1.5} fill={color} opacity={glow} />
    <circle cx={x} cy={y} r={r} fill={color} />
  </g>
);

const Cloud = ({ x, y, s = 1, o = 0.85 }) => (
  <g fill="#fff" opacity={o}>
    <ellipse cx={x} cy={y} rx={16 * s} ry={6 * s} />
    <ellipse cx={x - 9 * s} cy={y + 1 * s} rx={9 * s} ry={5 * s} />
    <ellipse cx={x + 6 * s} cy={y - 4 * s} rx={9 * s} ry={6 * s} />
  </g>
);

const Hills = ({ c1 = "#b8d89e", c2 = "#9cc483" }) => (
  <g>
    <path d="M-800 142 L-800 120 Q-300 100 0 118 Q90 96 180 116 Q280 92 400 114 Q700 100 1200 118 L1200 142 Z" fill={c1} />
    <path d="M-800 142 L-800 130 Q-200 118 40 132 Q160 116 260 130 Q340 120 1200 130 L1200 142 Z" fill={c2} />
  </g>
);

const Tree = ({ x, y = 142, s = 1, c1 = "#3f8f4a", c2 = "#2f6f3a" }) => (
  <g>
    <rect x={x - 1.6 * s} y={y - 16 * s} width={3.2 * s} height={16 * s} fill="#6b4a2f" />
    <circle cx={x} cy={y - 24 * s} r={10 * s} fill={c2} />
    <circle cx={x - 6 * s} cy={y - 19 * s} r={7 * s} fill={c1} />
    <circle cx={x + 6 * s} cy={y - 20 * s} r={7.5 * s} fill={c1} />
    <circle cx={x + 1 * s} cy={y - 29 * s} r={6 * s} fill={c1} />
  </g>
);

/** Silhouette person. kind: man | woman | child | girl. y = feet. */
function Person({ x, y, s = 1.35, kind = "man", c = "#2b2d42", accent = "#c81e6f", bag, hat }) {
  const k = kind === "child" || kind === "girl" ? 0.68 : 1;
  const S = s * k;
  const female = kind === "woman" || kind === "girl";
  const head = <circle cx={x} cy={y - 31 * S} r={3.8 * S} fill="#8d5b3e" />;
  const body = female ? (
    <path d={`M${x - 4.6 * S} ${y - 25.5 * S} Q${x} ${y - 28 * S} ${x + 4.6 * S} ${y - 25.5 * S} L${x + 6 * S} ${y - 8 * S} L${x - 6 * S} ${y - 8 * S} Z`} fill={accent} />
  ) : (
    <path d={`M${x - 4.8 * S} ${y - 25.5 * S} Q${x} ${y - 28 * S} ${x + 4.8 * S} ${y - 25.5 * S} L${x + 4.4 * S} ${y - 9 * S} L${x - 4.4 * S} ${y - 9 * S} Z`} fill={c} />
  );
  return (
    <g>
      <rect x={x - 3.2 * S} y={y - 9.5 * S} width={2.5 * S} height={9.5 * S} rx={1 * S} fill={female ? "#f3e8ff" : "#e5e7eb"} />
      <rect x={x + 0.7 * S} y={y - 9.5 * S} width={2.5 * S} height={9.5 * S} rx={1 * S} fill={female ? "#f3e8ff" : "#e5e7eb"} />
      {body}
      {head}
      {female && (
        // dupatta over the head and shoulder
        <path d={`M${x - 4.6 * S} ${y - 30 * S} Q${x} ${y - 38 * S} ${x + 4.6 * S} ${y - 30 * S} L${x + 7 * S} ${y - 14 * S} L${x + 4 * S} ${y - 14 * S} L${x + 2.5 * S} ${y - 27 * S} Q${x} ${y - 33 * S} ${x - 2.6 * S} ${y - 28 * S} Z`} fill="#fbbf24" opacity="0.95" />
      )}
      {hat === "turban" && <ellipse cx={x} cy={y - 34 * S} rx={4.6 * S} ry={2.6 * S} fill="#f8fafc" />}
      {hat === "hardhat" && <path d={`M${x - 4.8 * S} ${y - 32.5 * S} Q${x} ${y - 40 * S} ${x + 4.8 * S} ${y - 32.5 * S} Z`} fill="#facc15" />}
      {hat === "helmet" && <circle cx={x} cy={y - 32 * S} r={4.8 * S} fill="#0f172a" />}
      {bag && <rect x={x - 8.5 * S} y={y - 25 * S} width={4.5 * S} height={10 * S} rx={1.2 * S} fill={bag} />}
    </g>
  );
}

const Window = ({ x, y, w = 10, h = 12, frame = "#fff", glass = "#6b93c4" }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={glass} stroke={frame} strokeWidth="1.4" />
    <path d={`M${x + w / 2} ${y} V${y + h}`} stroke={frame} strokeWidth="0.8" />
  </g>
);

const MiniFlag = ({ x, y, s = 1 }) => (
  <g>
    <rect x={x - 0.8} y={y} width="1.6" height={48 * s} fill="#cbd5e1" />
    <rect x={x + 0.8} y={y + 1} width={6 * s} height={14 * s} fill="#fff" />
    <rect x={x + 0.8 + 6 * s} y={y + 1} width={16 * s} height={14 * s} fill="#01411c" />
    <circle cx={x + 15 * s} cy={y + 8 * s} r={4.4 * s} fill="#fff" />
    <circle cx={x + 16.4 * s} cy={y + 7 * s} r={3.8 * s} fill="#01411c" />
  </g>
);

// ---------------------------------------------------------------- scenes
function Housing({ id }) {
  return (
    <>
      <Sky id={id} top="#6fbdf2" bottom="#ffe4ad" groundTop="#c8b38a" groundBottom="#a8916a" />
      <Sun x={330} y={34} />
      <Cloud x={80} y={30} /><Cloud x={250} y={20} s={0.7} />
      <Hills c1="#c9dcb0" c2="#b7cf98" />
      {/* side houses for wide banners */}
      <rect x="-150" y="104" width="70" height="38" fill="#e7cfa8" /><rect x="-60" y="96" width="50" height="46" fill="#d58b63" />
      <rect x="420" y="100" width="60" height="42" fill="#b9cfe0" /><rect x="490" y="108" width="70" height="34" fill="#e7cfa8" />
      {/* house 3 (left) */}
      <rect x="56" y="98" width="60" height="44" fill="#b8d3e3" />
      <rect x="53" y="94" width="66" height="5" fill="#9cbdd0" />
      <Window x={66} y={108} /><Window x={92} y={108} />
      <rect x="80" y="122" width="12" height="20" fill="#6b4a2f" />
      {/* house 1 (two storey brick) */}
      <rect x="120" y="66" width="82" height="76" fill="#ecd6b2" />
      <rect x="117" y="61" width="88" height="6" fill="#d9bf95" />
      <rect x="120" y="102" width="82" height="3" fill="#d9bf95" />
      <Window x={130} y={74} w={14} h={16} /><Window x={176} y={74} w={14} h={16} />
      <Window x={130} y={112} w={14} h={14} />
      <path d="M150 74 h20 v20 h-20z" fill="#7aa0cc" stroke="#fff" strokeWidth="1.4" />
      <path d="M146 96 h28" stroke="#8a6a4a" strokeWidth="1.5" />
      {[148, 153, 158, 163, 168, 172].map((x) => <path key={x} d={`M${x} 96 v6`} stroke="#8a6a4a" strokeWidth="0.8" />)}
      <path d="M170 142 V120 Q178 112 186 120 V142 Z" fill="#7b4a2b" />
      {/* house 2 (terracotta) with water tank */}
      <rect x="206" y="90" width="62" height="52" fill="#cf7a52" />
      <rect x="203" y="86" width="68" height="5" fill="#b8643f" />
      <rect x="248" y="74" width="14" height="12" rx="3" fill="#2f6fd6" />
      <Window x={216} y={100} w={12} h={14} frame="#f8e4d4" /><Window x={246} y={100} w={12} h={14} frame="#f8e4d4" />
      <rect x="230" y="120" width="12" height="22" fill="#5b3420" />
      <Tree x={30} s={1.1} /><Tree x={300} s={1.2} /><Tree x={360} s={0.9} />
      {/* road + family */}
      <rect x="-800" y="150" width="2000" height="10" fill="#9c8a6c" opacity="0.6" />
      <Person x={256} y={168} kind="man" c="#334155" />
      <Person x={268} y={168} kind="woman" accent="#be185d" />
      <Person x={279} y={168} kind="child" c="#0e7490" />
    </>
  );
}

function Technology({ id }) {
  return (
    <>
      <Sky id={id} top="#241a66" bottom="#6f5ed6" groundTop="#3a2c84" groundBottom="#261b5c" />
      {/* window with night city */}
      <rect x="22" y="22" width="92" height="76" rx="4" fill="#0f1640" stroke="#c4b5fd" strokeWidth="3" />
      <path d="M68 22 V98 M22 60 H114" stroke="#c4b5fd" strokeWidth="2" />
      <path d="M24 96 V78 h10 v-8 h8 v16 h10 v-20 h10 v20 h12 v-10 h10 v14 h14 v8 Z" fill="#312e81" />
      {[[30, 82], [48, 74], [60, 86], [78, 80], [96, 84], [44, 30], [90, 40], [100, 28]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1" fill="#fde68a" />
      ))}
      {/* desk */}
      <rect x="-800" y="126" width="2000" height="8" fill="#9a6a44" />
      <rect x="-800" y="134" width="2000" height="10" fill="#6f4a2e" />
      {/* screen glow */}
      <ellipse cx="200" cy="96" rx="80" ry="44" fill="#a78bfa" opacity="0.25" />
      {/* laptop */}
      <rect x="156" y="62" width="88" height="60" rx="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
      <defs>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect x="161" y="67" width="78" height="50" rx="2" fill={`url(#${id}-screen)`} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="166" y={73 + i * 7} width={[34, 22, 40, 18, 28][i]} height="3" rx="1.5" fill="#e0f2fe" opacity="0.85" />)}
      {[0, 1, 2, 3].map((i) => <rect key={i} x={212 + i * 6} y={104 - [10, 18, 14, 24][i]} width="4" height={[10, 18, 14, 24][i]} fill="#fde68a" />)}
      <path d="M146 122 H254 L264 128 H136 Z" fill="#cbd5e1" />
      <rect x="186" y="123" width="28" height="2" rx="1" fill="#94a3b8" />
      {/* mug, books, plant */}
      <rect x="282" y="108" width="14" height="18" rx="2" fill="#f59e0b" />
      <path d="M296 112 q7 0 7 6 q0 6 -7 6" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
      <rect x="312" y="116" width="44" height="10" fill="#22c55e" /><rect x="316" y="106" width="40" height="10" fill="#ef4444" /><rect x="314" y="96" width="36" height="10" fill="#3b82f6" />
      <path d="M100 126 l4 -14 h14 l4 14z" fill="#b45309" />
      <path d="M111 112 q-10 -14 -2 -24 q4 10 2 24 M111 112 q8 -16 18 -18 q-6 12 -18 18" fill="#22c55e" />
    </>
  );
}

function Education({ id }) {
  return (
    <>
      <Sky id={id} top="#5ab6f0" bottom="#dff1ff" groundTop="#9cc27a" groundBottom="#78a35a" />
      <Sun x={60} y={30} r={12} />
      <Cloud x={300} y={26} /><Cloud x={150} y={18} s={0.6} />
      <Hills />
      {/* school */}
      <rect x="112" y="64" width="176" height="78" fill="#f3e3c3" />
      <path d="M104 66 L200 34 L296 66 Z" fill="#b9553a" />
      <path d="M118 66 L200 40 L282 66" fill="none" stroke="#f3e3c3" strokeWidth="2" />
      <circle cx="200" cy="54" r="7" fill="#fff" stroke="#7c2d12" strokeWidth="1.5" />
      <path d="M200 54 V49 M200 54 H204" stroke="#7c2d12" strokeWidth="1.2" />
      {[120, 140, 160, 232, 252, 272].map((x) => <Window key={x} x={x} y={74} w={10} h={14} glass="#7fb2e5" />)}
      {[120, 140, 160, 232, 252, 272].map((x) => <Window key={`b${x}`} x={x} y={102} w={10} h={14} glass="#7fb2e5" />)}
      {[180, 192, 208, 220].map((x) => <rect key={x} x={x - 2} y="70" width="4" height="56" fill="#e7d3ad" />)}
      <path d="M186 142 V118 Q200 106 214 118 V142 Z" fill="#6b3a24" />
      <rect x="172" y="138" width="56" height="4" fill="#d6c3a0" />
      <MiniFlag x={318} y={70} />
      <Tree x={70} s={1.2} /><Tree x={350} s={1} /><Tree x={-40} s={1.3} /><Tree x={460} s={1.2} />
      {/* students */}
      <Person x={84} y={168} kind="child" c="#1d4ed8" bag="#ef4444" />
      <Person x={98} y={168} kind="girl" accent="#0ea5e9" bag="#f59e0b" />
      <Person x={300} y={168} kind="child" c="#047857" bag="#7c3aed" />
    </>
  );
}

function Transport({ id }) {
  return (
    <>
      <Sky id={id} top="#123c56" bottom="#f4a56a" groundTop="#2d3142" groundBottom="#1f2233" />
      <Sun x={300} y={110} r={16} color="#ffb36b" glow={0.4} />
      {/* city */}
      <path d="M-800 142 V110 H-200 V98 H20 V84 h22 v58 h6 V96 h26 v46 h8 V76 h20 v66 h10 V100 h30 v42 h60 V90 h24 v52 h10 V80 h18 v62 h14 V104 h30 v38 H1200 V142 Z" fill="#20374f" />
      {[[26, 92], [32, 104], [58, 104], [90, 86], [96, 100], [152, 108], [208, 98], [214, 112], [242, 88], [248, 104], [300, 112]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="3" height="3" fill="#fde68a" opacity="0.9" />
      ))}
      {/* street lights */}
      {[70, 330].map((x) => (
        <g key={x}>
          <rect x={x - 1} y="104" width="2" height="40" fill="#94a3b8" />
          <path d={`M${x} 104 q0 -4 8 -4`} stroke="#94a3b8" strokeWidth="2" fill="none" />
          <circle cx={x + 9} cy="101" r="2.4" fill="#fde68a" />
          <path d={`M${x + 9} 102 L${x - 4} 144 L${x + 22} 144 Z`} fill="#fde68a" opacity="0.12" />
        </g>
      ))}
      {/* road markings */}
      {[-60, 0, 60, 120, 180, 240, 300, 360, 420].map((x) => <rect key={x} x={x} y="160" width="30" height="2.5" fill="#e5e7eb" opacity="0.7" />)}
      {/* headlight beam */}
      <path d="M234 146 L330 132 L330 166 Z" fill="#fde68a" opacity="0.18" />
      {/* e-bike + rider */}
      <circle cx="176" cy="154" r="11" fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle cx="226" cy="154" r="11" fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <path d="M176 154 L194 140 L216 140 L226 154" fill="none" stroke="#14b8a6" strokeWidth="4" strokeLinejoin="round" />
      <rect x="192" y="138" width="22" height="9" rx="3" fill="#0f766e" />
      <path d="M216 140 L222 128 L230 126" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
      <circle cx="232" cy="134" r="2.6" fill="#fde68a" />
      {/* rider */}
      <path d="M196 138 L200 118 L212 120 L214 136 Z" fill="#334155" />
      <path d="M210 122 L224 128" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
      <path d="M200 136 L192 150" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
      <circle cx="206" cy="112" r="6" fill="#0f172a" />
      <path d="M202 110 h8" stroke="#38bdf8" strokeWidth="2" />
    </>
  );
}

function Energy({ id }) {
  const panel = (x, y, w = 26) => (
    <g key={`${x}-${y}`}>
      <path d={`M${x} ${y} L${x + w} ${y} L${x + w + 5} ${y - 14} L${x + 5} ${y - 14} Z`} fill="#1e3a8a" stroke="#93c5fd" strokeWidth="0.8" />
      <path d={`M${x + w / 3} ${y} L${x + w / 3 + 5} ${y - 14} M${x + (2 * w) / 3} ${y} L${x + (2 * w) / 3 + 5} ${y - 14} M${x + 2.5} ${y - 7} L${x + w + 2.5} ${y - 7}`} stroke="#93c5fd" strokeWidth="0.6" />
    </g>
  );
  return (
    <>
      <Sky id={id} top="#3fb2f5" bottom="#fff0c2" groundTop="#9cc27a" groundBottom="#6f9a52" />
      <Sun x={70} y={36} r={16} color="#ffd04d" glow={0.45} />
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i * Math.PI) / 5;
        return <path key={i} d={`M${70 + Math.cos(a) * 24} ${36 + Math.sin(a) * 24} L${70 + Math.cos(a) * 32} ${36 + Math.sin(a) * 32}`} stroke="#ffd04d" strokeWidth="2.5" strokeLinecap="round" />;
      })}
      <Cloud x={300} y={28} />
      <Hills />
      {/* house with rooftop panels */}
      <rect x="140" y="96" width="120" height="46" fill="#f1e6d2" />
      <rect x="137" y="92" width="126" height="5" fill="#ddcbb0" />
      {[146, 176, 206, 232].map((x) => panel(x, 92, 24))}
      <Window x={152} y={106} w={14} h={14} /><Window x={234} y={106} w={14} h={14} />
      <rect x="194" y="114" width="14" height="28" fill="#7b4a2b" />
      {/* field array */}
      {[300, 334, 368].map((x) => (
        <g key={x}>
          {panel(x, 136, 28)}
          <path d={`M${x + 8} 136 v8 M${x + 26} 136 v8`} stroke="#64748b" strokeWidth="1.5" />
        </g>
      ))}
      {/* tubewell */}
      <rect x="86" y="120" width="22" height="22" fill="#94a3b8" />
      <path d="M108 128 h10 v6" stroke="#64748b" strokeWidth="3" fill="none" />
      <path d="M118 134 q2 8 -2 10 M120 134 q4 8 0 10" stroke="#60a5fa" strokeWidth="1.5" fill="none" />
      <Tree x={20} /><Tree x={-60} s={1.2} /><Tree x={440} s={1.1} />
    </>
  );
}

function Livestock({ id }) {
  return (
    <>
      <Sky id={id} top="#8fd8ff" bottom="#f2fbd2" groundTop="#8cc152" groundBottom="#5f8f34" />
      <Sun x={320} y={36} />
      <Cloud x={120} y={26} /><Cloud x={220} y={36} s={0.6} />
      <Hills c1="#b6dc8e" c2="#a2cf74" />
      {/* mud hut */}
      <rect x="300" y="108" width="60" height="34" fill="#b9855c" />
      <path d="M294 110 L330 88 L366 110 Z" fill="#d8b25a" />
      <rect x="324" y="122" width="12" height="20" fill="#5b3a24" />
      {/* haystack */}
      <path d="M60 142 Q60 102 86 98 Q112 102 112 142 Z" fill="#e2b64d" />
      {[72, 84, 96].map((x) => <path key={x} d={`M${x} 140 Q${x + 2} 118 ${x + 6} 108`} stroke="#c89a32" strokeWidth="1.2" fill="none" />)}
      {/* buffalo */}
      <g>
        <ellipse cx="184" cy="128" rx="34" ry="15" fill="#2b2626" />
        {[160, 170, 196, 206].map((x) => <rect key={x} x={x} y="134" width="5" height="18" rx="2" fill="#2b2626" />)}
        <ellipse cx="220" cy="124" rx="11" ry="8" fill="#2b2626" />
        <path d="M214 118 q-6 -8 2 -10 M226 118 q8 -8 0 -10" stroke="#9ca3af" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M150 124 q-6 10 -2 20" stroke="#2b2626" strokeWidth="2" fill="none" />
        <circle cx="224" cy="122" r="1.2" fill="#fff" />
      </g>
      {/* cow */}
      <g>
        <ellipse cx="262" cy="136" rx="22" ry="10" fill="#efe3cf" />
        <ellipse cx="256" cy="133" rx="7" ry="5" fill="#8b5a2b" /><ellipse cx="272" cy="138" rx="5" ry="4" fill="#8b5a2b" />
        {[246, 254, 270, 278].map((x) => <rect key={x} x={x} y="140" width="4" height="13" rx="1.5" fill="#efe3cf" />)}
        <ellipse cx="286" cy="132" rx="7" ry="5.5" fill="#efe3cf" />
        <path d="M282 127 l-3 -4 M290 127 l3 -4" stroke="#9ca3af" strokeWidth="1.5" />
      </g>
      <Person x={128} y={162} kind="man" c="#f8fafc" hat="turban" />
      <Tree x={30} s={1.1} /><Tree x={-60} s={1.3} /><Tree x={430} s={1.2} />
    </>
  );
}

function Agriculture({ id }) {
  return (
    <>
      <Sky id={id} top="#7cc6f2" bottom="#ffe2a0" groundTop="#e7b84a" groundBottom="#c88a20" />
      <Sun x={300} y={62} r={16} color="#ffcf5c" glow={0.5} />
      <Cloud x={90} y={26} />
      <path d="M-800 142 L-800 126 Q-200 116 100 124 Q220 112 400 124 Q800 116 1200 126 L1200 142 Z" fill="#8fbf62" />
      {/* furrows */}
      {Array.from({ length: 15 }).map((_, i) => {
        const k = i - 7;
        return <path key={i} d={`M${200 + k * 14} 142 L${200 + k * 80} 220`} stroke="#c58a1e" strokeWidth="2" />;
      })}
      {/* farmhouse + trees */}
      <rect x="320" y="110" width="44" height="32" fill="#f2e2c4" />
      <rect x="317" y="106" width="50" height="5" fill="#c9714a" />
      <rect x="336" y="124" width="10" height="18" fill="#6b3a24" />
      <Tree x={300} s={0.9} /><Tree x={380} s={1.1} /><Tree x={460} s={1.2} /><Tree x={-40} s={1.2} />
      {/* tractor */}
      <g>
        <rect x="118" y="126" width="46" height="16" rx="3" fill="#c62828" />
        <rect x="100" y="104" width="26" height="30" rx="2" fill="none" stroke="#7f1d1d" strokeWidth="3" />
        <rect x="102" y="106" width="22" height="14" fill="#bae6fd" opacity="0.6" />
        <rect x="98" y="122" width="30" height="12" fill="#b91c1c" />
        <rect x="148" y="112" width="3" height="14" fill="#374151" />
        <circle cx="110" cy="146" r="16" fill="#1f2937" /><circle cx="110" cy="146" r="7" fill="#f59e0b" />
        <circle cx="156" cy="152" r="9" fill="#1f2937" /><circle cx="156" cy="152" r="4" fill="#f59e0b" />
      </g>
      {/* wheat ears in the foreground */}
      {Array.from({ length: 26 }).map((_, i) => {
        const x = -20 + i * 17;
        return (
          <g key={i}>
            <path d={`M${x} 182 Q${x + 2} 168 ${x + 4} 158`} stroke="#b7791f" strokeWidth="1.5" fill="none" />
            <ellipse cx={x + 4.5} cy="155" rx="2.4" ry="5.5" fill="#f2c14e" transform={`rotate(14 ${x + 4.5} 155)`} />
          </g>
        );
      })}
    </>
  );
}

function Health({ id }) {
  return (
    <>
      <Sky id={id} top="#7fd6ff" bottom="#e6f8ff" groundTop="#a7cf86" groundBottom="#7aa55e" />
      <Cloud x={70} y={28} /><Cloud x={330} y={22} s={0.8} />
      <Hills c1="#cfe6bd" c2="#b9dba0" />
      {/* hospital */}
      <rect x="104" y="56" width="168" height="86" fill="#f8fafc" />
      <rect x="250" y="56" width="22" height="86" fill="#e2e8f0" />
      <rect x="100" y="52" width="176" height="6" fill="#cbd5e1" />
      {[0, 1, 2].map((r) => [0, 1, 2, 3, 4, 5].map((c) => (
        <rect key={`${r}${c}`} x={114 + c * 24} y={66 + r * 18} width="14" height="10" fill="#93c5fd" stroke="#e2e8f0" />
      )))}
      <rect x="168" y="30" width="40" height="24" rx="3" fill="#fff" stroke="#e2e8f0" />
      <path d="M184 34 h8 v6 h6 v8 h-6 v6 h-8 v-6 h-6 v-8 h6z" fill="#ef4444" transform="translate(0 -1) scale(1) " />
      <rect x="164" y="118" width="48" height="4" fill="#0ea5e9" />
      <rect x="176" y="122" width="24" height="20" fill="#bae6fd" stroke="#94a3b8" />
      <path d="M188 122 v20" stroke="#94a3b8" />
      {/* ambulance */}
      <g>
        <rect x="292" y="122" width="52" height="24" rx="3" fill="#fff" stroke="#cbd5e1" />
        <path d="M344 130 h12 l8 8 v8 h-20 z" fill="#fff" stroke="#cbd5e1" />
        <rect x="348" y="132" width="8" height="6" fill="#93c5fd" />
        <rect x="292" y="134" width="52" height="4" fill="#ef4444" />
        <path d="M314 124 h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4 v-4 h4z" fill="#ef4444" />
        <rect x="312" y="118" width="12" height="4" rx="1" fill="#3b82f6" />
        <circle cx="306" cy="148" r="6" fill="#1f2937" /><circle cx="350" cy="148" r="6" fill="#1f2937" />
      </g>
      <Tree x={60} s={1.1} /><Tree x={-30} s={1.2} /><Tree x={440} s={1.1} />
      <Person x={84} y={166} kind="woman" accent="#f8fafc" />
    </>
  );
}

function Women({ id }) {
  return (
    <>
      <Sky id={id} top="#5b21b6" bottom="#f9a8d4" groundTop="#7c3a5c" groundBottom="#4c1d3d" />
      {/* string lights */}
      <path d="M-40 20 Q100 60 200 26 Q300 60 440 20" fill="none" stroke="#fde68a" strokeWidth="0.8" opacity="0.7" />
      {Array.from({ length: 22 }).map((_, i) => {
        const t = i / 21;
        const x = -40 + t * 480;
        const y = 20 + Math.sin(t * Math.PI * 2) * -16 + 20 * Math.sin(t * Math.PI * 2) ** 2;
        return <circle key={i} cx={x} cy={y + 6} r="2.2" fill={["#fde68a", "#f472b6", "#a7f3d0"][i % 3]} />;
      })}
      {/* decorated home */}
      <rect x="120" y="68" width="160" height="74" fill="#f5e1c8" />
      <rect x="116" y="62" width="168" height="7" fill="#e0b98e" />
      <path d="M180 142 V104 Q200 84 220 104 V142 Z" fill="#7a2e4a" />
      <path d="M176 104 Q200 78 224 104" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="3 2" />
      {[134, 248].map((x) => <path key={x} d={`M${x} 120 V96 Q${x + 9} 86 ${x + 18} 96 V120 Z`} fill="#c084fc" opacity="0.8" />)}
      {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={124 + i * 14} cy="72" r="2.6" fill="#f97316" />)}
      {/* pots with flowers */}
      {[150, 250].map((x) => (
        <g key={x}>
          <path d={`M${x - 7} 142 l2 -10 h10 l2 10z`} fill="#b45309" />
          <circle cx={x} cy="128" r="4" fill="#f472b6" /><circle cx={x - 5} cy="130" r="3" fill="#fde047" /><circle cx={x + 5} cy="130" r="3" fill="#fb7185" />
        </g>
      ))}
      <Person x={194} y={166} kind="woman" accent="#be185d" />
      <Person x={208} y={166} kind="girl" accent="#a855f7" />
      <Tree x={60} c1="#4d7c0f" c2="#365314" /><Tree x={340} c1="#4d7c0f" c2="#365314" />
    </>
  );
}

function Industry({ id }) {
  return (
    <>
      <Sky id={id} top="#475569" bottom="#f6c58e" groundTop="#6b7280" groundBottom="#4b5563" />
      <Sun x={330} y={96} r={14} color="#ffb36b" />
      {/* smoke */}
      {[[118, 34], [128, 22], [146, 40], [160, 26]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={12 - i} ry={7 - i * 0.6} fill="#e5e7eb" opacity={0.55 - i * 0.08} />)}
      {/* chimneys */}
      {[112, 150].map((x) => (
        <g key={x}>
          <rect x={x} y="44" width="12" height="62" fill="#9ca3af" />
          <rect x={x} y="52" width="12" height="5" fill="#ef4444" /><rect x={x} y="66" width="12" height="5" fill="#ef4444" />
        </g>
      ))}
      {/* sawtooth factory */}
      <rect x="80" y="100" width="230" height="42" fill="#64748b" />
      <path d={`M80 100 ${Array.from({ length: 6 }).map((_, i) => `L${80 + i * 38.3} 82 L${80 + (i + 1) * 38.3} 100`).join(" ")}`} fill="#475569" />
      {Array.from({ length: 6 }).map((_, i) => <path key={i} d={`M${80 + i * 38.3} 82 L${80 + i * 38.3} 100 L${80 + i * 38.3 + 14} 92 Z`} fill="#93c5fd" opacity="0.7" />)}
      {[96, 130, 164, 198, 232, 266].map((x) => <rect key={x} x={x} y="110" width="18" height="10" fill="#fcd34d" opacity="0.85" />)}
      <rect x="282" y="118" width="22" height="24" fill="#334155" />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M282 ${122 + i * 5} h22`} stroke="#475569" />)}
      {/* gear */}
      <g transform="translate(40 110)">
        <circle r="14" fill="#94a3b8" />
        {Array.from({ length: 8 }).map((_, i) => <rect key={i} x="-3" y="-19" width="6" height="8" fill="#94a3b8" transform={`rotate(${i * 45})`} />)}
        <circle r="5" fill="#475569" />
      </g>
      <Person x={334} y={166} kind="man" c="#1d4ed8" hat="hardhat" />
      <Person x={350} y={166} kind="man" c="#ea580c" hat="hardhat" />
    </>
  );
}

function Business({ id }) {
  const shop = (x, stripe, wall) => (
    <g key={x}>
      <rect x={x} y="78" width="78" height="64" fill={wall} />
      <rect x={x + 8} y="66" width="62" height="12" fill="#1f2937" />
      <rect x={x + 14} y="69" width="50" height="6" rx="1" fill="#fde68a" opacity="0.85" />
      {Array.from({ length: 8 }).map((_, i) => (
        <path key={i} d={`M${x - 4 + i * 10.75} 92 L${x - 4 + (i + 1) * 10.75} 92 L${x - 4 + (i + 1) * 10.75} 98 Q${x - 4 + (i + 0.5) * 10.75} 103 ${x - 4 + i * 10.75} 98 Z`} fill={i % 2 ? "#fff" : stripe} />
      ))}
      <rect x={x - 4} y="84" width="86" height="8" fill={stripe} />
      <rect x={x + 8} y="104" width="62" height="38" fill="#3f3f46" />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
        <rect key={`${r}${c}`} x={x + 12 + c * 14} y={108 + r * 10} width="11" height="7" fill={["#f59e0b", "#22c55e", "#ef4444", "#3b82f6"][(r + c) % 4]} />
      )))}
    </g>
  );
  return (
    <>
      <Sky id={id} top="#7dd3fc" bottom="#fff4d1" groundTop="#d6c7a8" groundBottom="#b8a582" />
      <Cloud x={60} y={26} /><Cloud x={330} y={30} s={0.8} />
      {shop(40, "#10b981", "#f2e3c6")}
      {shop(122, "#f59e0b", "#e9d1ad")}
      {shop(204, "#ef4444", "#f2e3c6")}
      {shop(286, "#3b82f6", "#e9d1ad")}
      {shop(-42, "#a855f7", "#e9d1ad")}
      {shop(368, "#10b981", "#f2e3c6")}
      {/* crates of fruit */}
      <rect x="150" y="144" width="26" height="12" fill="#a16207" />
      {[154, 160, 166, 172].map((x) => <circle key={x} cx={x} cy="142" r="3.4" fill="#f97316" />)}
      <rect x="180" y="144" width="26" height="12" fill="#a16207" />
      {[184, 190, 196, 202].map((x) => <circle key={x} cx={x} cy="142" r="3.4" fill="#16a34a" />)}
      <Person x={226} y={168} kind="man" c="#0f766e" />
      <Person x={124} y={168} kind="woman" accent="#7c3aed" />
    </>
  );
}

function Social({ id }) {
  return (
    <>
      <Sky id={id} top="#2bb3a3" bottom="#ffe5a3" groundTop="#9cc27a" groundBottom="#6f9a52" />
      <Sun x={96} y={70} r={18} color="#ffcf5c" glow={0.5} />
      <Hills />
      {/* home */}
      <rect x="236" y="92" width="96" height="50" fill="#efe0c5" />
      <rect x="232" y="88" width="104" height="5" fill="#d6bf98" />
      <Window x={250} y={104} w={14} h={14} /><Window x={304} y={104} w={14} h={14} />
      <rect x="278" y="114" width="14" height="28" fill="#6b3a24" />
      <Tree x={360} s={1.2} /><Tree x={40} s={1.1} /><Tree x={-50} s={1.3} /><Tree x={450} s={1.2} />
      {/* family holding hands */}
      <path d="M160 150 h70" stroke="#8d5b3e" strokeWidth="1.6" />
      <Person x={160} y={170} kind="man" c="#1e3a8a" />
      <Person x={184} y={170} kind="child" c="#0e7490" />
      <Person x={204} y={170} kind="girl" accent="#e11d48" />
      <Person x={228} y={170} kind="woman" accent="#047857" />
      {/* ration bag */}
      <path d="M118 170 l4 -22 h18 l4 22 z" fill="#d9b779" />
      <path d="M124 148 q7 -8 14 0" fill="none" stroke="#a37b3c" strokeWidth="2" />
      <ellipse cx="128" cy="148" rx="4" ry="2.5" fill="#16a34a" /><ellipse cx="134" cy="146" rx="4" ry="2.5" fill="#22c55e" />
    </>
  );
}

function Youth({ id }) {
  return (
    <>
      <Sky id={id} top="#6d28d9" bottom="#f9a8d4" groundTop="#4c1d95" groundBottom="#2e1065" />
      {/* towers */}
      {[[220, 40, 46], [270, 24, 40], [314, 54, 44], [-120, 60, 60], [430, 50, 50]].map(([x, y, w]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={142 - y} fill="#3b2a7a" />
          {Array.from({ length: Math.floor((142 - y) / 10) }).map((_, r) =>
            Array.from({ length: Math.floor(w / 10) }).map((__, c) => (
              <rect key={`${r}${c}`} x={x + 3 + c * 10} y={y + 4 + r * 10} width="6" height="5" fill="#c4b5fd" opacity={(r + c) % 3 ? 0.35 : 0.85} />
            ))
          )}
        </g>
      ))}
      {/* paper plane + trail */}
      <path d="M40 60 Q90 30 140 46" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      <path d="M140 46 l14 -6 l-6 12 l-2 -4z" fill="#fff" />
      {/* young people */}
      <Person x={110} y={164} kind="man" c="#0ea5e9" bag="#f59e0b" />
      <Person x={128} y={164} kind="woman" accent="#db2777" />
      <Person x={146} y={164} kind="man" c="#16a34a" bag="#7c3aed" />
    </>
  );
}

function Punjab({ id }) {
  const onion = (cx, base, w, h) =>
    `M${cx - w / 2} ${base} C${cx - w / 2 - w * 0.08} ${base - h * 0.5} ${cx - w * 0.22} ${base - h * 0.78} ${cx} ${base - h} C${cx + w * 0.22} ${base - h * 0.78} ${cx + w / 2 + w * 0.08} ${base - h * 0.5} ${cx + w / 2} ${base} Z`;
  return (
    <>
      <Sky id={id} top="#2a2668" bottom="#f59e6a" groundTop="#3a1f3f" groundBottom="#1a1030" />
      <Sun x={200} y={110} r={20} color="#ffcf7a" glow={0.5} />
      {[[40, 20], [90, 36], [300, 18], [350, 40], [150, 14]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.2" fill="#fff" />)}
      <g fill="#b9472c">
        <rect x="130" y="108" width="140" height="34" />
        {[112, 288].map((x) => <rect key={x} x={x - 5} y="66" width="10" height="76" />)}
      </g>
      <g fill="#f3ebe0">
        <path d={onion(200, 108, 44, 36)} /><path d={onion(160, 108, 24, 18)} /><path d={onion(240, 108, 24, 18)} />
        <path d={onion(112, 66, 14, 12)} /><path d={onion(288, 66, 14, 12)} />
      </g>
      <path d="M186 142 V122 Q200 108 214 122 V142 Z" fill="#4a1810" />
      <Tree x={40} c1="#3f6b3a" c2="#2f5230" /><Tree x={360} c1="#3f6b3a" c2="#2f5230" />
    </>
  );
}

export const SCENES = {
  housing: Housing, technology: Technology, education: Education, transport: Transport, energy: Energy,
  livestock: Livestock, agriculture: Agriculture, health: Health, women: Women, industry: Industry,
  business: Business, social: Social, youth: Youth, punjab: Punjab,
};

// Scenes that are already set at dusk/night (or indoors) don't get the extra evening light.
const ALREADY_EVENING = new Set(["technology", "transport", "women", "youth", "punjab", "industry"]);

/**
 * Full-bleed scene for a theme key. Fills its parent; never crops the subject.
 * variant: 0 = as drawn, 1 = mirrored, 2 = evening light, 3 = mirrored + evening light.
 */
export default function SchemeScene({ theme = "punjab", variant = 0, className = "" }) {
  const Scene = SCENES[theme] || SCENES.punjab;
  const mirrored = variant === 1 || variant === 3;
  const evening = (variant === 2 || variant === 3) && !ALREADY_EVENING.has(theme);
  const id = `sc-${theme}`;
  return (
    <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax meet" className={`absolute inset-0 h-full w-full ${className}`} aria-hidden>
      <g transform={mirrored ? "translate(400 0) scale(-1 1)" : undefined}>
        <Scene id={id} />
      </g>
      {evening && (
        <>
          <defs>
            <linearGradient id={`${id}-eve`} gradientUnits="userSpaceOnUse" x1="0" y1="-40" x2="0" y2="200">
              <stop offset="0" stopColor="#3b1d6e" stopOpacity="0.55" />
              <stop offset="0.6" stopColor="#f97316" stopOpacity="0.22" />
              <stop offset="1" stopColor="#7c2d12" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <rect x="-800" y="-400" width="2000" height="800" fill={`url(#${id}-eve)`} />
        </>
      )}
    </svg>
  );
}
