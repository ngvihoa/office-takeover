import type { MapDef } from '@ot/sim';

export function MapThumbnail({ map, class: className }: { map: MapDef; class?: string }) {
  const { building, corridor, towers, id } = map;
  const nodes = corridor.nodes;

  return (
    <svg
      viewBox="0 0 640 360"
      class={`map-thumb-svg ${className ?? ''}`}
      shape-rendering="geometricPrecision"
      aria-hidden="true"
    >
      <rect width="640" height="360" fill="#1b1a29" />
      <rect
        x={building.x}
        y={building.y}
        width={building.w}
        height={building.h}
        fill="#262438"
        stroke="#3c3858"
        stroke-width="2"
        rx="4"
      />

      {/* Special backdrop landmarks */}
      {id === 'office-03' && (
        <g>
          <rect x={180} y={120} width={280} height={120} fill="#142119" stroke="#22543d" stroke-width="2" rx="8" />
          <text
            x={320}
            y={185}
            fill="#48bb78"
            font-size="24"
            font-family="monospace"
            text-anchor="middle"
            font-weight="bold"
          >
            🌿 ATRIUM
          </text>
        </g>
      )}

      {id === 'office-04' && (
        <g>
          {/* Central skybridge chokepoints */}
          <rect x={225} y={96} width={190} height={18} fill="#1a2536" stroke="#38bdf8" stroke-width="2" rx="2" />
          <rect x={225} y={246} width={190} height={18} fill="#1a2536" stroke="#38bdf8" stroke-width="2" rx="2" />
          <text
            x={320}
            y={109}
            fill="#38bdf8"
            font-size="12"
            font-family="monospace"
            text-anchor="middle"
            font-weight="bold"
          >
            🌉 CẦU KÍNH
          </text>
          <text
            x={320}
            y={259}
            fill="#38bdf8"
            font-size="12"
            font-family="monospace"
            text-anchor="middle"
            font-weight="bold"
          >
            🌉 CẦU KÍNH
          </text>
        </g>
      )}

      {/* Corridor wide paths */}
      {corridor.edges.map(([fromId, toId]) => {
        const p1 = nodes[fromId];
        const p2 = nodes[toId];
        if (!p1 || !p2) return null;
        return (
          <line
            key={`corridor-w-${fromId}-${toId}`}
            x1={p1[0]}
            y1={p1[1]}
            x2={p2[0]}
            y2={p2[1]}
            stroke="#3b3754"
            stroke-width={id === 'office-02' ? 32 : 22}
            stroke-linecap="round"
          />
        );
      })}

      {/* Corridor core paths */}
      {corridor.edges.map(([fromId, toId]) => {
        const p1 = nodes[fromId];
        const p2 = nodes[toId];
        if (!p1 || !p2) return null;
        return (
          <line
            key={`corridor-c-${fromId}-${toId}`}
            x1={p1[0]}
            y1={p1[1]}
            x2={p2[0]}
            y2={p2[1]}
            stroke="#4e4b70"
            stroke-width={id === 'office-02' ? 14 : 10}
            stroke-linecap="round"
          />
        );
      })}

      {/* Towers */}
      {towers.map((t) => {
        const [x, y, w, h] = t.rect;
        let fill = '#8b9bb4';
        let stroke = '#181425';
        let strokeWidth = 2;
        let icon = '';

        if (t.seat === 0) fill = '#0099db';
        else if (t.seat === 1) fill = '#e43b44';
        else if (t.seat === 2) fill = '#63c74d';
        else if (t.seat === 3) fill = '#feae34';
        else if (t.kind === 'pantry') {
          fill = '#f6757a';
          icon = '☕';
        } else if (t.kind === 'meeting') {
          fill = '#fee761';
          icon = '📅';
        } else if (t.kind === 'server') {
          fill = '#3e8948';
          icon = '🖥️';
        } else if (t.kind === 'boss') {
          fill = '#b55088';
          stroke = '#ffffff';
          strokeWidth = 2.5;
          icon = '👑';
        }

        return (
          <g key={`tower-${t.id}`}>
            <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} stroke-width={strokeWidth} rx="4" />
            {icon && (
              <text
                x={x + w / 2}
                y={y + h / 2 + (h > 60 ? 10 : 7)}
                fill="#ffffff"
                font-size={h > 60 ? 28 : 20}
                text-anchor="middle"
              >
                {icon}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
