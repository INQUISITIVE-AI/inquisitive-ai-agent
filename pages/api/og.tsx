import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const config = { runtime: 'edge' };

export default function handler(_req: NextRequest) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0b',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Purple mesh background blobs */}
        <div style={{
          position: 'absolute', top: -120, left: -80,
          width: 700, height: 600,
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.18) 0%, transparent 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, right: -60,
          width: 600, height: 500,
          background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Top label */}
        <div style={{
          position: 'absolute', top: 48, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 13, letterSpacing: '4px', color: 'rgba(167,139,250,0.60)',
            fontWeight: 700, textTransform: 'uppercase',
          }}>
            AI-MANAGED CRYPTO PORTFOLIO
          </div>
        </div>

        {/* Main block */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

          {/* Coin + name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {/* Coin — matches InqaiLogo.tsx exactly */}
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: 'radial-gradient(circle at 32% 24%, #A855F7 0%, #7C3AED 8%, #4C1D95 22%, #1E0A4A 40%, #0A0225 60%, #050118 80%, #01000A 100%)',
              border: '3.5px solid rgba(167,139,250,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 90px rgba(59,130,246,0.5), 0 0 40px rgba(59,130,246,0.25), 0 10px 36px rgba(0,0,0,0.70)',
              position: 'relative',
            }}>
              {/* INQAI "I" letterform */}
              <svg width="78" height="78" viewBox="0 0 200 200" style={{ position: 'absolute' }}>
                {/* Top cap */}
                <rect x="76" y="54" width="48" height="14" rx="7" fill="white" opacity="0.95"/>
                {/* Bottom cap */}
                <rect x="76" y="132" width="48" height="14" rx="7" fill="white" opacity="0.75"/>
                {/* Stem */}
                <rect x="93" y="61" width="14" height="78" rx="4" fill="white" opacity="0.85"/>
                {/* Node dots */}
                <circle cx="70" cy="85"  r="5" fill="white" opacity="0.55"/>
                <circle cx="130" cy="85" r="5" fill="white" opacity="0.55"/>
                <circle cx="66" cy="100" r="5" fill="white" opacity="0.55"/>
                <circle cx="134" cy="100" r="5" fill="white" opacity="0.55"/>
                <circle cx="70" cy="115" r="5" fill="white" opacity="0.55"/>
                <circle cx="130" cy="115" r="5" fill="white" opacity="0.55"/>
              </svg>
            </div>

            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                fontSize: 78, fontWeight: 900, color: '#FFFFFF',
                letterSpacing: '-3px', lineHeight: 1,
              }}>
                INQUISITIVE
              </div>
              <div style={{
                fontSize: 20, color: 'rgba(167,139,250,0.70)',
                letterSpacing: '6px', fontWeight: 600,
              }}>
                INQAI TOKEN
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: 26, color: 'rgba(255,255,255,0.55)',
            textAlign: 'center', maxWidth: 820, lineHeight: 1.45,
            marginTop: 4,
          }}>
            Proportional ownership in 66 professionally managed digital assets.
            AI executes autonomously on-chain via Chainlink Automation.
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 0, marginTop: 12 }}>
            {[
              { label: 'PRESALE PRICE', value: '$8 / INQAI' },
              { label: 'TARGET APY',    value: '18.5%' },
              { label: 'ASSETS',        value: '66' },
              { label: 'FIXED SUPPLY',  value: '100M' },
            ].map((stat, i) => (
              <div key={stat.label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 6, padding: '18px 36px',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#a78bfa' }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', letterSpacing: '2.5px', fontWeight: 700 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL */}
        <div style={{
          position: 'absolute', bottom: 40, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 16, color: 'rgba(59,130,246,0.5)',
            letterSpacing: '2px', fontWeight: 600,
          }}>
            getinqai.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
