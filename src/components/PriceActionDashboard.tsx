'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Target, Zap, Scale,
  AlertTriangle, Brain, ArrowRight, Activity,
  BarChart3, Flame, Shield, Eye, Lock,
} from 'lucide-react';

interface PAPattern {
  symbol: string;
  name: string;
  category: string;
  paScore: number;
  finalScore: number;
  action: string;
  priceUsd: number;
  change24h: number;
  change7d: number;
  patterns: string[];
  macroFilters: string[];
  macroMultiplier: number;
  riskGatePass: boolean;
}

interface PASignal {
  symbol: string;
  name: string;
  paScore: number;
  action: string;
  patterns: string[];
  riskGatePass: boolean;
  priceUsd: number;
  change24h: number;
}

const PATTERN_COLORS: Record<string, string> = {
  'Long Wick Reversal': '#10b981',    // Green - was Kangaroo Tail
  'Double Floor': '#3b82f6',           // Blue - was Wammie
  'Double Ceiling': '#ef4444',           // Red - was Moolah
  'Engulfing Bar': '#f59e0b',       // Amber - was Big Shadow
  'Breakout Test': '#8b5cf6',        // Purple - was Last Kiss
  'Support Zone': '#06b6d4',             // Cyan - was Zone
  'Stacked Wicks': '#84cc16',            // Lime - was Wicks
  'Trend Momentum': '#ec4899',            // Pink - was Trend
  'Volume Spike': '#f97316',           // Orange - was Volume
  'Consolidation': '#6366f1',       // Indigo - was Inside Bar
};

const ACTION_COL: Record<string, string> = {
  BUY: '#10b981', SELL: '#ef4444', REDUCE: '#f87171',
  STAKE: '#38bdf8', LEND: '#fbbf24', YIELD: '#a3e635',
  BORROW: '#22d3ee', SWAP: '#60a5fa', EARN: '#93c5fd',
  LOOP: '#fb923c', MULTIPLY: '#f472b6', REWARDS: '#facc15',
  HOLD: '#6b7280', SKIP: '#4b5563',
  ACCUMULATE: '#84cc16',
};

const fmtUsd = (n: number) => {
  if (!n || isNaN(n)) return '$0';
  if (n >= 1e9)  return '$' + (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3)  return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
};

const fmtPrice = (n: number) => {
  if (!n || isNaN(n)) return '—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1)    return '$' + n.toFixed(4);
  if (n >= 0.01) return '$' + n.toFixed(6);
  return '$' + n.toPrecision(4);
};

const pct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
const grc = (n: number) => n >= 0 ? '#10b981' : '#ef4444';

interface PriceActionDashboardProps {
  signals?: PASignal[];
  macro?: { regime?: string; fearGreed?: any; };
  onSignalClick?: (symbol: string) => void;
}

export default function PriceActionDashboard({ signals = [], macro, onSignalClick }: PriceActionDashboardProps) {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pattern breakdown
  const patternStats = useMemo(() => {
    const stats: Record<string, number> = {};
    signals.forEach(s => {
      s.patterns.forEach(p => {
        const key = Object.keys(PATTERN_COLORS).find(k => p.includes(k)) || 'Other';
        stats[key] = (stats[key] || 0) + 1;
      });
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [signals]);

  // Filter by selected pattern
  const filteredSignals = useMemo(() => {
    if (!selectedPattern) return signals;
    return signals.filter(s => s.patterns.some(p => p.includes(selectedPattern)));
  }, [signals, selectedPattern]);

  // High probability signals (PA > 70, risk gate passed)
  const highProb = useMemo(() =>
    signals.filter(s => s.paScore >= 0.70 && s.riskGatePass && s.action !== 'SKIP'),
    [signals]
  );

  const regime = macro?.regime || 'NEUTRAL';
  const regimeCol = regime === 'BULL' ? '#10b981' : regime === 'BEAR' ? '#ef4444' : '#f59e0b';
  const fg = macro?.fearGreed;
  const fgValue = typeof fg === 'object' ? fg?.value : fg;
  const fgLabel = typeof fg === 'object' ? fg?.classification : (fgValue < 25 ? 'Extreme Fear' : fgValue < 45 ? 'Fear' : fgValue < 55 ? 'Neutral' : fgValue < 75 ? 'Greed' : 'Extreme Greed');
  const fgColor = fgValue < 25 ? '#ef4444' : fgValue < 45 ? '#f97316' : fgValue < 55 ? '#f59e0b' : fgValue < 75 ? '#84cc16' : '#10b981';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {/* Pattern Count */}
        <div style={{ background: 'rgba(17,17,19,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Brain size={18} color="#3b82f6" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Price Action Signals</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#3b82f6', fontFamily: 'monospace' }}>{signals.length}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Active patterns detected</div>
        </div>

        {/* High Probability */}
        <div style={{ background: 'rgba(17,17,19,0.85)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Target size={18} color="#10b981" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>High Probability</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>{highProb.length}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>PA ≥70% + Risk gate passed</div>
        </div>

        {/* Regime */}
        <div style={{ background: 'rgba(17,17,19,0.85)', border: `1px solid ${regimeCol}30`, borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Scale size={18} color={regimeCol} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Market Regime</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: regimeCol, fontFamily: 'monospace' }}>{regime}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>BTC macro structure</div>
        </div>

        {/* Fear & Greed */}
        <div style={{ background: 'rgba(17,17,19,0.85)', border: `1px solid ${fgColor}30`, borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Activity size={18} color={fgColor} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Fear & Greed</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: fgColor, fontFamily: 'monospace' }}>{fgValue || '—'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{fgLabel || 'Loading...'}</div>
        </div>
      </div>

      {/* ── Pattern Filter Chips ── */}
      <div style={{ background: 'rgba(17,17,19,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Eye size={16} color="#93c5fd" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Filter by Pattern</span>
          {selectedPattern && (
            <button
              onClick={() => setSelectedPattern(null)}
              style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 11, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
            >
              Clear filter
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {patternStats.map(([pattern, count]) => (
            <button
              key={pattern}
              onClick={() => setSelectedPattern(selectedPattern === pattern ? null : pattern)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: `1px solid ${selectedPattern === pattern ? PATTERN_COLORS[pattern] || '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                background: selectedPattern === pattern ? `${PATTERN_COLORS[pattern] || '#3b82f6'}15` : 'rgba(255,255,255,0.03)',
                color: selectedPattern === pattern ? PATTERN_COLORS[pattern] || '#3b82f6' : 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: PATTERN_COLORS[pattern] || '#3b82f6' }} />
              {pattern}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 2 }}>({count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Signals Grid ── */}
      <div style={{ background: 'rgba(17,17,19,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color="#f59e0b" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
              {selectedPattern ? `${selectedPattern} Signals` : 'All Price Action Signals'}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 100 }}>
              {filteredSignals.length}
            </span>
          </div>
        </div>

        {filteredSignals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
            <Brain size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: 14 }}>No price action signals match current filters</div>
            <div style={{ fontSize: 11, marginTop: 8, opacity: 0.5 }}>Try adjusting pattern filters or wait for next AI cycle</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filteredSignals.map((s) => (
              <div
                key={s.symbol}
                onClick={() => onSignalClick?.(s.symbol)}
                style={{
                  padding: 16,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${s.riskGatePass ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                  borderRadius: 12,
                  cursor: onSignalClick ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{s.symbol}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{s.name}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 100,
                      background: `${ACTION_COL[s.action] || '#3b82f6'}20`,
                      color: ACTION_COL[s.action] || '#3b82f6',
                      border: `1px solid ${ACTION_COL[s.action] || '#3b82f6'}40`,
                      fontWeight: 700,
                    }}
                  >
                    {s.action}
                  </span>
                </div>

                {/* PA Score Bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Price Action Score</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', fontFamily: 'monospace' }}>
                      {(s.paScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${s.paScore * 100}%`,
                        background: s.paScore >= 0.70 ? '#10b981' : s.paScore >= 0.55 ? '#f59e0b' : '#ef4444',
                        borderRadius: 2,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>

                {/* Price & Change */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#fff' }}>{fmtPrice(s.priceUsd)}</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: grc(s.change24h) }}>
                    {pct(s.change24h)} 24h
                  </span>
                </div>

                {/* Pattern Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {s.patterns.slice(0, 3).map((p, i) => {
                    const patternType = Object.keys(PATTERN_COLORS).find(k => p.includes(k)) || 'Other';
                    return (
                      <span
                        key={i}
                        style={{
                          fontSize: 9,
                          padding: '3px 6px',
                          borderRadius: 4,
                          background: `${PATTERN_COLORS[patternType] || '#3b82f6'}15`,
                          color: PATTERN_COLORS[patternType] || '#3b82f6',
                          border: `1px solid ${PATTERN_COLORS[patternType] || '#3b82f6'}30`,
                        }}
                        title={p}
                      >
                        {patternType}
                      </span>
                    );
                  })}
                  {s.patterns.length > 3 && (
                    <span style={{ fontSize: 9, padding: '3px 6px', color: 'rgba(255,255,255,0.3)' }}>
                      +{s.patterns.length - 3} more
                    </span>
                  )}
                </div>

                {/* Risk Gate Indicator */}
                {!s.riskGatePass && (
                  <div style={{ marginTop: 8, fontSize: 10, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={10} />
                    Risk gate blocked
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: PATTERN_COLORS['Long Wick Reversal'] }} />
          <span>Long Wick Reversal: Extended shadow signaling rejection</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: PATTERN_COLORS['Double Floor'] }} />
          <span>Double Floor: Twin lows with bounce confirmation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: PATTERN_COLORS['Engulfing Bar'] }} />
          <span>Engulfing Bar: Candle fully consuming previous</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: PATTERN_COLORS['Breakout Test'] }} />
          <span>Breakout Test: Price returning to test breached level</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: PATTERN_COLORS['Support Zone'] }} />
          <span>Support Zone: Historical congestion area</span>
        </div>
      </div>
    </div>
  );
}

export { PATTERN_COLORS, ACTION_COL };
