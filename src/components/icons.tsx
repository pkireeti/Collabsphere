import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

/**
 * Pixel-grid icon renderer: each icon is a character map drawn as 1x1 rects
 * with crisp edges, so it scales like a bitmap instead of smoothing.
 */
const Pix = ({ grid, ...p }: { grid: string[] } & P) => {
  const rows = grid
  const w = rows[0].length
  const h = rows.length
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      {...p}
    >
      {rows.map((row, y) =>
        row
          .split('')
          .map((ch, x) =>
            ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />,
          ),
      )}
    </svg>
  )
}

const size = 'h-5 w-5'

export const IconHome = (p: P) => (
  <Pix
    grid={[
      '.....XX.....',
      '....XXXX....',
      '...XXXXXX...',
      '..XXXXXXXX..',
      '.XXXXXXXXXX.',
      'XX........XX',
      'X..........X',
      'X..........X',
      'X..........X',
      'X....XX....X',
      'X....XX....X',
      'X....XX....X',
    ]}
    className={size}
    {...p}
  />
)

export const IconCompass = (p: P) => (
  <Pix
    grid={[
      '....XXXX....',
      '..XXXXXXXX..',
      '.XX......XX.',
      '.X........X.',
      'XX.......XX.',
      'X......XX..X',
      'X.....XX...X',
      'XX...XX....X',
      '.X..XX.....X',
      '.XX......XX.',
      '..XXXXXXXX..',
      '....XXXX....',
    ]}
    className={size}
    {...p}
  />
)

export const IconPlus = (p: P) => (
  <Pix
    grid={[
      '............',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      '.XXXXXXXXXX.',
      '.XXXXXXXXXX.',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      '............',
    ]}
    className={size}
    {...p}
  />
)

export const IconQr = (p: P) => (
  <Pix
    grid={[
      'XXXX....XXXX',
      'X..X....X..X',
      'X..X....X..X',
      'XXXX....XXXX',
      '............',
      '..X.XX.X....',
      '.XX..X..XX..',
      '..X.X..X..X.',
      'XXXX..X..X.X',
      'X..X....X..X',
      'X..X..X....X',
      'XXXX....XX..',
    ]}
    className={size}
    {...p}
  />
)

export const IconTrophy = (p: P) => (
  <Pix
    grid={[
      '.XXXXXXXXXX.',
      'XX........XX',
      'XX........XX',
      'XX........XX',
      '.X........X.',
      '.XXXXXXXXXX.',
      '..XXXXXXXX..',
      '...XXXXXX...',
      '.....XX.....',
      '.....XX.....',
      '....XXXX....',
      '.XXXXXXXXXX.',
    ]}
    className={size}
    {...p}
  />
)

export const IconUser = (p: P) => (
  <Pix
    grid={[
      '....XXXX....',
      '...XXXXXX...',
      '..XX....XX..',
      '..XX....XX..',
      '...XXXXXX...',
      '....XXXX....',
      '............',
      '...XXXXXX...',
      '..XXXXXXXX..',
      '.XXXXXXXXXX.',
      'XXXXXXXXXXXX',
      'XXXXXXXXXXXX',
    ]}
    className={size}
    {...p}
  />
)

export const IconUsers = (p: P) => (
  <Pix
    grid={[
      '.......XXX..',
      '.......XXX..',
      '..XXXX.XXX..',
      '..X..X.XXX..',
      '..X..X.XXXXX',
      '..XXXX.XXXXX',
      '............',
      '.XXXXXXXX...',
      'XXXXXXXXXX..',
      'XXXXXXXXXX..',
      'XXXXXXXXXX..',
      'XXXXXXXXXX..',
    ]}
    className={size}
    {...p}
  />
)

export const IconShield = (p: P) => (
  <Pix
    grid={[
      '..XXXXXXXX..',
      '..XXXXXXXX..',
      '.XXXXXXXXXX.',
      '.XXXXXXX.X..',
      '.XXXXXX.XXX.',
      '.XX.XX.XXXX.',
      '.XXX..XXXXX.',
      '..XXXXXXXX..',
      '..XXXXXXXX..',
      '...XXXXXX...',
      '....XXXX....',
      '.....XX.....',
    ]}
    className={size}
    {...p}
  />
)

export const IconCalendar = (p: P) => (
  <Pix
    grid={[
      '............',
      '...X....X...',
      '...X....X...',
      '.XXXXXXXXXX.',
      '.XXXXXXXXXX.',
      '.X........X.',
      '.XXXXXXXXXX.',
      '.XX.XX.XX.X.',
      '.XXXXXXXXXX.',
      '.XX.XX.XX.X.',
      '.XXXXXXXXXX.',
      '.XXXXXXXXXX.',
    ]}
    className={size}
    {...p}
  />
)

export const IconPin = (p: P) => (
  <Pix
    grid={[
      '....XXXX....',
      '...XXXXXX...',
      '..XXXXXXXX..',
      '.XXXX..XXXX.',
      '.XXXX..XXXX.',
      '..XXXXXXXX..',
      '...XXXXXX...',
      '....XXXX....',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
    ]}
    className={size}
    {...p}
  />
)

export const IconClock = (p: P) => (
  <Pix
    grid={[
      '....XXXX....',
      '..XXXXXXXX..',
      '.XX......XX.',
      '.X...X....X.',
      'XX...X....XX',
      'X...XXXX...X',
      'X..........X',
      'XX........XX',
      '.X........X.',
      '.XX......XX.',
      '..XXXXXXXX..',
      '....XXXX....',
    ]}
    className={size}
    {...p}
  />
)

export const IconSearch = (p: P) => (
  <Pix
    grid={[
      '..XXX......',
      '.XXXXX.....',
      'XXXXXXX....',
      'XXXXXXX....',
      'XXXXXXX....',
      '.XXXXX.....',
      '..XXX..XX..',
      '.......XX..',
      '........XX.',
      '.........XX',
      '.........XX',
      '..........X',
    ]}
    className={size}
    {...p}
  />
)

export const IconCheck = (p: P) => (
  <Pix
    grid={[
      '............',
      '...........X',
      '..........X.',
      '.........X..',
      '..X.....X...',
      '...XX..X....',
      '....XXX.....',
      '.....X......',
      '............',
      '............',
      '............',
      '............',
    ]}
    className={size}
    {...p}
  />
)

export const IconX = (p: P) => (
  <Pix
    grid={[
      'XX........XX',
      '.XX......XX.',
      '..XX....XX..',
      '...XX..XX...',
      '....XXXX....',
      '.....XX.....',
      '....XXXX....',
      '...XX..XX...',
      '..XX....XX..',
      '.XX......XX.',
      'XX........XX',
      '............',
    ]}
    className={size}
    {...p}
  />
)

export const IconAlert = (p: P) => (
  <Pix
    grid={[
      '.....XX.....',
      '....XXXX....',
      '...XXXXXX...',
      '...XX..XX...',
      '..XXX..XXX..',
      '..XXX..XXX..',
      '.XXXX..XXXX.',
      '.XXXX..XXXX.',
      'XXXXXXXXXXXX',
      'XXXXX..XXXXX',
      'XXXXXXXXXXXX',
      'XXXXXXXXXXXX',
    ]}
    className={size}
    {...p}
  />
)

export const IconSpark = (p: P) => (
  <Pix
    grid={[
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      '....XXXX....',
      '...XXXXXX...',
      '.XXXXXXXXXX.',
      '.XXXXXXXXXX.',
      '...XXXXXX...',
      '....XXXX....',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
    ]}
    className={size}
    {...p}
  />
)

export const IconMenu = (p: P) => (
  <Pix
    grid={[
      '............',
      '.XXXXXXXXXX.',
      '.XXXXXXXXXX.',
      '............',
      '............',
      '.XXXXXXXXXX.',
      '.XXXXXXXXXX.',
      '............',
      '............',
      '.XXXXXXXXXX.',
      '.XXXXXXXXXX.',
      '............',
    ]}
    className={size}
    {...p}
  />
)

export const IconLogout = (p: P) => (
  <Pix
    grid={[
      '.......XXXXX',
      '.......X...X',
      '.......X...X',
      '.......X...X',
      '..XX...X...X',
      'XXXXXXXX...X',
      'XXXXXXXX...X',
      '..XX...X...X',
      '.......X...X',
      '.......X...X',
      '.......X...X',
      '.......XXXXX',
    ]}
    className={size}
    {...p}
  />
)

export const IconArrow = (p: P) => (
  <Pix
    grid={[
      '............',
      '............',
      '.......XX...',
      '........XX..',
      '.........XX.',
      'XXXXXXXXXXXX',
      'XXXXXXXXXXXX',
      '.........XX.',
      '........XX..',
      '.......XX...',
      '............',
      '............',
    ]}
    className={size}
    {...p}
  />
)

export const IconTicket = (p: P) => (
  <Pix
    grid={[
      '............',
      '.XXXXXXXXXX.',
      'XXXXXXXXXXXX',
      'XXXX.XXXXXXX',
      'XXXX.XXXXXXX',
      '.XXX.XXXXXX.',
      '.XXX.XXXXXX.',
      'XXXX.XXXXXXX',
      'XXXX.XXXXXXX',
      'XXXXXXXXXXXX',
      'XXXXXXXXXXXX',
      '............',
    ]}
    className={size}
    {...p}
  />
)

export const Logo = ({ className = 'h-7 w-7' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} shapeRendering="crispEdges" aria-hidden="true">
    <g fill="#3EC8F2">
      <rect x="6" y="2" width="4" height="1" />
      <rect x="4" y="3" width="8" height="1" />
      <rect x="3" y="4" width="10" height="3" />
      <rect x="2" y="7" width="12" height="4" />
      <rect x="3" y="11" width="10" height="1" />
      <rect x="4" y="12" width="8" height="1" />
      <rect x="6" y="13" width="4" height="1" />
    </g>
    <g fill="#F2761A">
      <rect x="2" y="7" width="12" height="2" />
    </g>
    <g fill="#070B18">
      <rect x="4" y="4" width="2" height="1" />
      <rect x="4" y="5" width="1" height="1" />
    </g>
  </svg>
)
