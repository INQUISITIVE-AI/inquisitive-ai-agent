import React from 'react';
import { Shield, Lock, Globe, TrendingUp } from 'lucide-react';

// ── Landing Page Hero ────────────────────────────────────────────────────────
// Text-first, no gradient headline, single solid CTA hierarchy

export default function LandingHero() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px'
    }}>
      {/* Single subtle radial glow — accent color only */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
        top: '-200px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        maxWidth: 960,
        width: '100%',
        textAlign: 'center',
        zIndex: 1,
      }}>

        {/* Label badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 6,
          marginBottom: 32,
          fontSize: 12,
          fontWeight: 500,
          color: '#93c5fd',
          letterSpacing: '0.3px',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
          AI-MANAGED ON-CHAIN FUND
        </div>

        {/* Headline — plain white, no gradient */}
        <h1 style={{
          fontSize: 'clamp(2.8rem, 7vw, 4.5rem)',
          fontWeight: 700,
          color: '#f4f4f5',
          margin: '0 0 20px',
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
        }}>
          Own 66 Assets.<br />Hold One Token.
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)',
          color: '#71717a',
          maxWidth: 560,
          margin: '0 auto 48px',
          lineHeight: 1.7,
          fontWeight: 400,
        }}>
          INQAI delivers proportional ownership in a professionally managed 66-asset 
          digital portfolio. Five independent AI engines execute 11 strategies around 
          the clock — every decision published on-chain in real time.
        </p>

        {/* CTA — clear hierarchy: primary + ghost */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 80 }}>
          <a
            href="/analytics"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 28px',
              background: '#3b82f6',
              borderRadius: 8,
              color: '#fff',
              fontSize: 15,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
          >
            View Live Dashboard
          </a>
          <a
            href="/help"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 28px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              color: '#f4f4f5',
              fontSize: 15,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            Read the Docs
          </a>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          maxWidth: 720,
          margin: '0 auto',
        }}>
          {[
            { value: '66',   label: 'Assets Managed',  color: '#f4f4f5' },
            { value: '24/7', label: 'AI Trading',       color: '#10b981' },
            { value: '100M', label: 'Fixed Supply',     color: '#f4f4f5' },
            { value: '0%',   label: 'Management Fee',   color: '#f4f4f5' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#111113',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '20px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginBottom: 4, letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust bar */}
      <div style={{
        position: 'absolute',
        bottom: 36,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 28,
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {[
          { Icon: Shield, text: 'Audited Contracts' },
          { Icon: Lock,   text: 'Non-Custodial' },
          { Icon: Globe,  text: 'Fully On-Chain' },
          { Icon: TrendingUp, text: 'Chainlink Automation' },
        ].map(({ Icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#52525b', fontSize: 12 }}>
            <Icon size={14} />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
