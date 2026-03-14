/**
 * CssCharts — Pure CSS/SVG chart primitives.
 * Zero recharts dependency → no duplicate-key warnings.
 */

// ─── SVG Area/Line sparkline ──────────────────────────────────────────────────
export function SvgAreaChart({
  data,
  valueKey,
  labelKey = "month",
  color,
  height = 180,
  formatY,
}: {
  data: Record<string, any>[];
  valueKey: string;
  labelKey?: string;
  color: string;
  height?: number;
  formatY?: (v: number) => string;
}) {
  if (!data || data.length === 0) return null;
  const values = data.map((d) => (typeof d[valueKey] === "number" ? d[valueKey] : 0));
  const maxV = Math.max(...values, 1);
  const W = 500;
  const H = height;
  const pad = { top: 8, right: 12, bottom: 28, left: 52 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const gradId = `ag-${color.replace(/[^a-z0-9]/gi, "")}`;

  const xPos = (i: number) =>
    data.length === 1 ? pad.left + iW / 2 : pad.left + (i / (data.length - 1)) * iW;
  const yPos = (v: number) => pad.top + (1 - v / maxV) * iH;

  const linePts = data.map((_, i) => `${xPos(i)},${yPos(values[i])}`).join(" ");
  const areaPts = [
    `${xPos(0)},${pad.top + iH}`,
    ...data.map((_, i) => `${xPos(i)},${yPos(values[i])}`),
    `${xPos(data.length - 1)},${pad.top + iH}`,
  ].join(" ");

  const yTicks = [0, 0.5, 1].map((pct) => ({
    v: maxV * (1 - pct),
    yy: pad.top + pct * iH,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} y1={t.yy} x2={W - pad.right} y2={t.yy} stroke="#F3F4F6" strokeWidth="1" />
          <text x={pad.left - 4} y={t.yy + 4} textAnchor="end" fontSize="11" fill="#9CA3AF">
            {formatY ? formatY(t.v) : t.v >= 1000 ? `R$${(t.v / 1000).toFixed(0)}k` : t.v.toFixed(0)}
          </text>
        </g>
      ))}
      <polygon points={areaPts} fill={`url(#${gradId})`} />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((d, i) => {
        if (data.length > 8 && i % 2 !== 0) return null;
        return (
          <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize="11" fill="#9CA3AF">
            {String(d[labelKey] ?? "").slice(0, 4)}
          </text>
        );
      })}
      {data.map((d, i) => (
        <circle key={i} cx={xPos(i)} cy={yPos(values[i])} r="3" fill={color}>
          <title>{`${d[labelKey]}: ${formatY ? formatY(values[i]) : values[i]}`}</title>
        </circle>
      ))}
    </svg>
  );
}

// ─── SVG Vertical Bar Chart ───────────────────────────────────────────────────
export function SvgBarChart({
  data,
  bars,
  labelKey = "name",
  height = 160,
  formatY,
}: {
  data: Record<string, any>[];
  bars: {
    key: string;
    color: string | ((d: any, i: number) => string);
    label?: string;
  }[];
  labelKey?: string;
  height?: number;
  formatY?: (v: number) => string;
}) {
  if (!data || data.length === 0) return null;
  const allVals = data.flatMap((d) =>
    bars.map((b) => (typeof d[b.key] === "number" ? (d[b.key] as number) : 0))
  );
  const maxV = Math.max(...allVals, 1);
  const W = 500;
  const H = height;
  const pad = { top: 8, right: 12, bottom: 28, left: 52 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;
  const groupW = iW / data.length;
  const barW = Math.max(8, Math.min(36, (groupW / bars.length) * 0.65));

  const yTicks = [0, 0.5, 1].map((pct) => ({
    v: maxV * (1 - pct),
    yy: pad.top + pct * iH,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} y1={t.yy} x2={W - pad.right} y2={t.yy} stroke="#F3F4F6" strokeWidth="1" />
          <text x={pad.left - 4} y={t.yy + 4} textAnchor="end" fontSize="11" fill="#9CA3AF">
            {formatY ? formatY(t.v) : t.v >= 1000 ? `R$${(t.v / 1000).toFixed(0)}k` : t.v.toFixed(0)}
          </text>
        </g>
      ))}
      {data.map((d, di) => {
        const cx = pad.left + di * groupW + groupW / 2;
        const totalW = barW * bars.length + (bars.length - 1) * 2;
        return (
          <g key={di}>
            {bars.map((b, bi) => {
              const v = typeof d[b.key] === "number" ? (d[b.key] as number) : 0;
              const bH = (v / maxV) * iH;
              const bX = cx - totalW / 2 + bi * (barW + 2);
              const fill = typeof b.color === "function" ? b.color(d, di) : b.color;
              return (
                <rect key={bi} x={bX} y={pad.top + iH - bH} width={barW} height={bH} fill={fill} rx="3">
                  <title>{`${d[labelKey]}: ${formatY ? formatY(v) : v}`}</title>
                </rect>
              );
            })}
            <text x={cx} y={H - 4} textAnchor="middle" fontSize="11" fill="#9CA3AF">
              {String(d[labelKey] ?? "").slice(0, 5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG Donut / Pie ──────────────────────────────────────────────────────────
export function SvgDonut({
  data,
  size = 120,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const R = 40;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const segs = data.map((d) => {
    const len = (d.value / total) * circ;
    const seg = { ...d, dash: Math.max(len - 1.5, 0), offset };
    offset += len;
    return seg;
  });
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: size, height: size, transform: "rotate(-90deg)", flexShrink: 0 }}
    >
      {segs.map((s) => (
        <circle
          key={s.name}
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={s.color}
          strokeWidth="12"
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={-s.offset}
        >
          <title>{`${s.name}: ${s.value}`}</title>
        </circle>
      ))}
    </svg>
  );
}
