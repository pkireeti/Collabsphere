/**
 * Pixel-art hero illustration: a banded-sky city block with an orange
 * "MEET HERE" storefront, meetup pins, pixel passers-by and floating chips.
 * Every shape snaps to a 4px grid and renders with crisp edges.
 */
export function HeroArt({ className = '' }: { className?: string }) {
  const INK = '#070B18'
  const CYAN = '#3EC8F2'
  const ORANGE = '#F2761A'
  const CREAM = '#F4F1E4'
  const MID = '#2C7BB0'
  const DARKWIN = '#123A56'

  return (
    <svg
      viewBox="0 0 1200 420"
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Illustration of a pixel city block with meetup location pins"
    >
      {/* far skyline */}
      <g fill={MID}>
        <rect x="40" y="180" width="120" height="150" />
        <rect x="170" y="140" width="88" height="190" />
        <rect x="272" y="200" width="64" height="130" />
        <rect x="896" y="160" width="104" height="170" />
        <rect x="1010" y="196" width="72" height="134" />
        <rect x="1094" y="150" width="80" height="180" />
      </g>
      <g fill={DARKWIN}>
        <rect x="64" y="204" width="16" height="20" />
        <rect x="96" y="204" width="16" height="20" />
        <rect x="64" y="244" width="16" height="20" />
        <rect x="194" y="168" width="16" height="20" />
        <rect x="226" y="168" width="16" height="20" />
        <rect x="194" y="212" width="16" height="20" />
        <rect x="920" y="192" width="16" height="20" />
        <rect x="956" y="192" width="16" height="20" />
        <rect x="920" y="236" width="16" height="20" />
        <rect x="1116" y="180" width="16" height="20" />
        <rect x="1148" y="180" width="16" height="20" />
        <rect x="1116" y="224" width="16" height="20" />
      </g>

      {/* clouds */}
      <g fill="#FFFFFF">
        <rect x="330" y="44" width="190" height="24" />
        <rect x="354" y="24" width="130" height="24" />
        <rect x="386" y="8" width="66" height="20" />
        <rect x="900" y="152" width="92" height="20" />
        <rect x="918" y="134" width="56" height="20" />
      </g>

      {/* utility pole + stepped wires */}
      <g fill={INK}>
        <rect x="1036" y="70" width="8" height="260" />
        <rect x="1000" y="92" width="80" height="6" />
        <rect x="1006" y="122" width="68" height="6" />
        <rect x="1028" y="62" width="24" height="10" />
      </g>
      <g stroke={INK} strokeWidth="4" fill="none" opacity="0.85">
        <path d="M1000 95 L460 118" />
        <path d="M1074 95 L640 146" />
        <path d="M1006 125 L560 176" />
      </g>

      {/* main store block */}
      <g>
        <rect x="330" y="150" width="540" height="180" fill={CREAM} stroke={INK} strokeWidth="6" />

        {/* roof units */}
        <rect x="420" y="118" width="88" height="34" fill={CREAM} stroke={INK} strokeWidth="6" />
        <g fill={INK}>
          <rect x="456" y="126" width="4" height="18" />
          <rect x="448" y="132" width="20" height="4" />
          <rect x="540" y="124" width="68" height="28" fill={CREAM} />
          <rect x="556" y="130" width="4" height="16" />
          <rect x="568" y="130" width="4" height="16" />
          <rect x="580" y="130" width="4" height="16" />
          <rect x="592" y="130" width="4" height="16" />
        </g>
        <rect x="540" y="124" width="68" height="28" fill="none" stroke={INK} strokeWidth="6" />

        {/* sign band */}
        <rect x="334" y="178" width="532" height="54" fill={ORANGE} />
        <rect x="334" y="178" width="532" height="54" fill="none" stroke={INK} strokeWidth="6" />
        <text
          x="600"
          y="214"
          textAnchor="middle"
          fill={CREAM}
          fontFamily='"Press Start 2P", monospace'
          fontSize="26"
          style={{ paintOrder: 'stroke' }}
        >
          MEET HERE
        </text>

        {/* windows + door */}
        <g fill={DARKWIN}>
          <rect x="356" y="250" width="148" height="64" />
          <rect x="516" y="250" width="84" height="80" />
          <rect x="616" y="250" width="230" height="64" />
        </g>
        <g fill={CYAN}>
          <rect x="366" y="260" width="40" height="24" />
          <rect x="414" y="260" width="40" height="24" />
          <rect x="462" y="260" width="32" height="24" />
          <rect x="626" y="260" width="44" height="24" />
          <rect x="682" y="260" width="44" height="24" />
          <rect x="738" y="260" width="44" height="24" />
          <rect x="794" y="260" width="44" height="24" />
        </g>
        <g fill={INK}>
          <rect x="556" y="260" width="6" height="60" />
          <rect x="586" y="286" width="8" height="8" />
        </g>
        <rect x="330" y="330" width="540" height="8" fill={INK} />
      </g>

      {/* hut on the left */}
      <g>
        <path d="M116 252 L215 200 L314 252" fill={ORANGE} stroke={INK} strokeWidth="6" />
        <rect x="140" y="252" width="152" height="78" fill={CREAM} stroke={INK} strokeWidth="6" />
        <rect x="164" y="278" width="44" height="52" fill={DARKWIN} />
        <rect x="226" y="274" width="48" height="36" fill={CYAN} stroke={INK} strokeWidth="6" />
        <rect x="246" y="274" width="6" height="36" fill={INK} />
        <rect x="226" y="288" width="48" height="6" fill={INK} />
      </g>

      {/* ground */}
      <rect x="0" y="330" width="1200" height="8" fill={INK} />
      <rect x="0" y="338" width="1200" height="30" fill="#E8E4D4" />
      <rect x="0" y="368" width="1200" height="52" fill="#1D2849" />
      <g fill="#35436E">
        <rect x="20" y="392" width="40" height="6" />
        <rect x="100" y="392" width="40" height="6" />
        <rect x="180" y="392" width="40" height="6" />
        <rect x="260" y="392" width="40" height="6" />
        <rect x="340" y="392" width="40" height="6" />
        <rect x="420" y="392" width="40" height="6" />
        <rect x="500" y="392" width="40" height="6" />
        <rect x="580" y="392" width="40" height="6" />
        <rect x="660" y="392" width="40" height="6" />
        <rect x="740" y="392" width="40" height="6" />
        <rect x="820" y="392" width="40" height="6" />
        <rect x="900" y="392" width="40" height="6" />
        <rect x="980" y="392" width="40" height="6" />
        <rect x="1060" y="392" width="40" height="6" />
        <rect x="1140" y="392" width="40" height="6" />
      </g>

      {/* route dashes */}
      <g fill={ORANGE} opacity="0.9">
        <rect x="110" y="352" width="34" height="8" />
        <rect x="174" y="352" width="34" height="8" />
        <rect x="238" y="352" width="34" height="8" />
        <rect x="884" y="352" width="34" height="8" />
        <rect x="948" y="352" width="34" height="8" />
        <rect x="1012" y="352" width="34" height="8" />
        <rect x="1076" y="352" width="34" height="8" />
      </g>

      {/* pixel passers-by */}
      <g>
        <PixelPerson x={246} shirt={ORANGE} skin="#D89A64" />
        <PixelPerson x={288} shirt={CYAN} skin="#A5673F" />
        <PixelPerson x={926} shirt={CYAN} skin="#F2C79B" />
        <PixelPerson x={966} shirt={ORANGE} skin="#7A4A2B" />
      </g>

      {/* big pixel pin above the store */}
      <g transform="translate(596 36)">
        <rect x="8" y="0" width="48" height="48" fill={ORANGE} stroke={INK} strokeWidth="6" />
        <rect x="24" y="16" width="16" height="16" fill={CREAM} />
        <rect x="20" y="48" width="20" height="8" fill={ORANGE} />
        <rect x="24" y="56" width="12" height="8" fill={ORANGE} />
        <rect x="27" y="64" width="6" height="8" fill={ORANGE} />
      </g>

      {/* small street pins */}
      <g transform="translate(150 296)">
        <rect x="0" y="0" width="24" height="24" fill={CYAN} stroke={INK} strokeWidth="4" />
        <rect x="8" y="8" width="8" height="8" fill={INK} />
        <rect x="8" y="24" width="8" height="6" fill={CYAN} />
      </g>
      <g transform="translate(1044 300)">
        <rect x="0" y="0" width="24" height="24" fill={ORANGE} stroke={INK} strokeWidth="4" />
        <rect x="8" y="8" width="8" height="8" fill={CREAM} />
        <rect x="8" y="24" width="8" height="6" fill={ORANGE} />
      </g>

      {/* floating chips */}
      <g fontFamily='"Press Start 2P", monospace' fontSize="11">
        <rect x="40" y="40" width="252" height="44" fill={CREAM} stroke={INK} strokeWidth="6" />
        <text x="58" y="67" fill={INK}>
          CHENNAI · 12 GOING
        </text>
        <rect x="760" y="40" width="248" height="44" fill={CREAM} stroke={INK} strokeWidth="6" />
        <text x="778" y="67" fill={INK}>
          BENGALURU · 9 SEATS
        </text>
      </g>
    </svg>
  )
}

function PixelPerson({ x, shirt, skin }: { x: number; shirt: string; skin: string }) {
  const INK = '#070B18'
  return (
    <g transform={`translate(${x} 300)`}>
      <rect x="4" y="0" width="16" height="6" fill={INK} />
      <rect x="2" y="6" width="20" height="10" fill={skin} />
      <rect x="6" y="10" width="4" height="4" fill={INK} />
      <rect x="16" y="10" width="4" height="4" fill={INK} />
      <rect x="0" y="16" width="24" height="18" fill={shirt} />
      <rect x="0" y="16" width="24" height="4" fill={INK} opacity="0.35" />
      <rect x="4" y="34" width="7" height="10" fill={INK} />
      <rect x="14" y="34" width="7" height="10" fill={INK} />
    </g>
  )
}
