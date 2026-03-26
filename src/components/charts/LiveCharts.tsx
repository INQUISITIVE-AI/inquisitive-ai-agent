'use client';
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const fmtUsd = (n: number) => {
  if (n >= 1e9) return '$' + (n/1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
};

// ── Shared Tooltip ──
const DarkTooltip = ({ active, payload, label, prefix = '$', pricePrecision = 2 }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0d0d20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || '#a78bfa', fontWeight: 700 }}>
          {prefix}{typeof p.value === 'number' ? p.value.toFixed(pricePrecision) : p.value}
        </div>
      ))}
    </div>
  );
};

// ── Portfolio Equity Curve ─────────────────────────────────────
export function PortfolioChart({ data, height = 120 }: { data: any[]; height?: number }) {
  if (!data?.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12, flexDirection: 'column', gap: 6 }}><span>No sparkline data available</span><span style={{ fontSize: 10 }}>Live 168-point curve loads from CoinGecko</span></div>;
  const first  = data[0]?.v || 10000;
  const last   = data[data.length - 1]?.v || 10000;
  const isUp   = last >= first;
  const color  = isUp ? '#10b981' : '#ef4444';
  const gradId = `equity-${Math.random().toString(36).slice(2,6)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="ts" hide tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }} tickLine={false} axisLine={false} interval={Math.floor(data.length / 6)} />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip content={<DarkTooltip prefix="$" pricePrecision={2} />} />
        <ReferenceLine y={first} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Price History Chart ────────────────────────────────────────
export function PriceChart({ data, symbol, height = 200, days = 7 }: { data: any[]; symbol: string; height?: number; days?: number }) {
  if (!data?.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Loading price chart...</div>;
  const first  = data[0]?.p;
  const last   = data[data.length - 1]?.p;
  const isUp   = (last || 0) >= (first || 0);
  const color  = isUp ? '#10b981' : '#ef4444';
  const gradId = `price-${symbol.toLowerCase()}`;
  const prec   = last >= 1 ? 2 : last >= 0.01 ? 4 : 6;
  const fmt    = (v: number) => v >= 1000 ? '$' + (v/1000).toFixed(2) + 'k' : '$' + v.toFixed(prec);
  const xInterval = Math.floor(data.length / 7);
  const xFmt = (ts: string) => {
    try { const d = new Date(ts); return days <= 1 ? d.getHours() + ':00' : (d.getMonth()+1)+'/'+d.getDate(); } catch { return ts; }
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="ts" tickFormatter={xFmt} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} tickLine={false} axisLine={false} interval={xInterval} />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} tickLine={false} axisLine={false} tickFormatter={fmt} width={52} />
        <Tooltip content={<DarkTooltip prefix="$" pricePrecision={prec} />} />
        <ReferenceLine y={first} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="p" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: color }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Category Donut Chart ──────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  major: '#3b82f6', defi: '#7c3aed', ai: '#ec4899', l2: '#06b6d4',
  stablecoin: '#10b981', rwa: '#f97316', 'liquid-stake': '#f59e0b',
  interop: '#6366f1', privacy: '#6b7280', payment: '#84cc16',
  storage: '#0891b2', oracle: '#a78bfa', institutional: '#8b5cf6',
  gaming: '#f472b6', iot: '#34d399', data: '#60a5fa', other: '#374151',
};

export function CategoryDonut({ data, size = 180 }: { data: any[]; size?: number }) {
  if (!data?.length) return null;
  const top = data.slice(0, 8);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <PieChart width={size} height={size}>
        <Pie data={top} cx="50%" cy="50%" innerRadius={size * 0.28} outerRadius={size * 0.42}
          dataKey="mktCap" paddingAngle={2}>
          {top.map((entry: any, i: number) => (
            <Cell key={i} fill={CAT_COLORS[entry.category] || '#374151'} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip formatter={(v: any) => fmtUsd(v)} contentStyle={{ background: '#0d0d20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
      </PieChart>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {top.slice(0, 6).map((c: any) => (
          <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[c.category] || '#374151', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', flex: 1, textTransform: 'capitalize' }}>{c.category}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{c.pct?.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Volume Bar Chart ──────────────────────────────────────────
export function VolumeChart({ data, height = 60 }: { data: any[]; height?: number }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d: any) => d.v || 0));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Bar dataKey="v" fill="rgba(124,58,237,0.3)" radius={[1, 1, 0, 0]}>
          {data.map((_: any, i: number) => (
            <Cell key={i} fill={`rgba(124,58,237,${0.2 + (data[i]?.v / max) * 0.5})`} />
          ))}
        </Bar>
        <Tooltip content={<DarkTooltip prefix="$" pricePrecision={0} />} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Mini Sparkline (inline SVG, no recharts) ──────────────────
export function Sparkline({ prices, width = 60, height = 24, color }: { prices: number[]; width?: number; height?: number; color?: string }) {
  if (!prices || prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step = width / (prices.length - 1);
  const pts = prices.map((p, i) => `${i * step},${height - ((p - min) / range) * (height - 2) - 1}`).join(' ');
  const isUp = prices[prices.length - 1] >= prices[0];
  const c = color || (isUp ? '#10b981' : '#ef4444');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline fill="none" stroke={c} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
}

// ── Confidence Radial ────────────────────────────────────────
export function ConfidenceRing({ value, size = 56, color = '#7c3aed', label }: { value: number; size?: number; color?: string; label?: string }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const fill = circ * value;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontSize: size < 50 ? 9 : 11, fontWeight: 900, color, fontFamily: 'monospace' }}>{(value * 100).toFixed(0)}%</div>
        {label && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{label}</div>}
      </div>
    </div>
  );
}
