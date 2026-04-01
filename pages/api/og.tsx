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
          background: '#07071a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Purple mesh background blobs */}
        <div style={{
          position: 'absolute', top: -120, left: -80,
          width: 700, height: 600,
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, transparent 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, right: -60,
          width: 600, height: 500,
          background: 'radial-gradient(ellipse, rgba(79,70,229,0.16) 0%, transparent 70%)',
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
            {/* Coin */}
            <div style={{
              width: 108, height: 108, borderRadius: '50%',
              background: 'radial-gradient(circle at 32% 24%, #8B3CF7 0%, #3D1580 20%, #0D0430 45%, #040115 72%, #010008 100%)',
              border: '3px solid rgba(167,139,250,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 80px rgba(124,58,237,0.55), 0 8px 32px rgba(0,0,0,0.60)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Specular ellipse */}
              <div style={{
                position: 'absolute', top: 4, left: 4,
                width: 72, height: 56,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(255,255,255,0.60) 0%, rgba(224,216,255,0.25) 40%, transparent 100%)',
                transform: 'rotate(-22deg)',
                display: 'flex',
              }} />
              {/* Waveform symbol */}
              <svg width="68" height="68" viewBox="0 0 200 200" style={{ position: 'absolute' }}>
                <path d="M36,100 L66,100 L88,46 L112,154 L134,100 L164,100"
                  stroke="white" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none"
                  opacity="0.95"/>
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
            fontSize: 16, color: 'rgba(124,58,237,0.65)',
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
