import React from 'react';
import { ArrowRight, Shield, Zap, Globe, TrendingUp, Lock } from 'lucide-react';

// ── Landing Page Hero Component ─────────────────────────────────────────────
// First impression — the "why" of INQUISITIVE

export default function LandingHero() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d20 0%, #1a0f2e 50%, #0d1f0d 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px'
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)'
      }} />

      {/* Content */}
      <div style={{
        maxWidth: 1200,
        width: '100%',
        textAlign: 'center',
        zIndex: 1
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: 'rgba(124,58,237,0.2)',
          border: '1px solid rgba(124,58,237,0.4)',
          borderRadius: 50,
          marginBottom: 32,
          fontSize: 13,
          fontWeight: 600,
          color: '#a78bfa'
        }}>
          <Zap size={16} />
          AI-Managed Asset-Backed Token
        </div>

        {/* Main Headline */}
        <h1 style={{
          fontSize: 72,
          fontWeight: 900,
          color: 'white',
          margin: '0 0 24px',
          lineHeight: 1.1,
          letterSpacing: '-0.02em'
        }}>
          Own 66 Assets.<br />
          <span style={{
            background: 'linear-gradient(135deg, #7c3aed, #10b981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Hold One Token.
          </span>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: 20,
          color: 'rgba(255,255,255,0.6)',
          maxWidth: 600,
          margin: '0 auto 48px',
          lineHeight: 1.6
        }}>
          INQAI represents proportional ownership in a professionally managed portfolio 
          of 66 digital assets, continuously optimized by proprietary AI systems 24/7.
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          marginBottom: 64
        }}>
          <a
            href="/buy"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              borderRadius: 12,
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
          >
            Get INQAI
            <ArrowRight size={20} />
          </a>
          <a
            href="/analytics"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 32px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12,
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            View Portfolio
          </a>
        </div>

        {/* Key Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24,
          maxWidth: 800,
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'white', marginBottom: 4 }}>
              66
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Assets Managed</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#10b981', marginBottom: 4 }}>
              24/7
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>AI Trading</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#a855f7', marginBottom: 4 }}>
              100M
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Fixed Supply</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#ef4444', marginBottom: 4 }}>
              20%
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>APY Target</div>
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 32,
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          <Shield size={16} />
          <span>Audited Contracts</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          <Lock size={16} />
          <span>Zero Private Keys</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          <Globe size={16} />
          <span>Fully Autonomous</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          <TrendingUp size={16} />
          <span>Chainlink Automation</span>
        </div>
      </div>
    </div>
  );
}
