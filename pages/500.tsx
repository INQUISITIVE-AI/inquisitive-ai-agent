import Head from 'next/head';
import { useRouter } from 'next/router';
import { AlertCircle, RefreshCw, Home, MessageSquare } from 'lucide-react';
import InqaiLogo from '../src/components/InqaiLogo';

export default function Custom500() {
  const router = useRouter();
  
  return (
    <>
      <Head>
        <title>Server Error | INQUISITIVE</title>
        <meta name="description" content="We are experiencing technical difficulties. Please try again shortly." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        <div className="mesh-bg" />
        
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 480 }}>
          {/* Logo */}
          <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'center' }}>
            <div onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <InqaiLogo size={48} />
              <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.5px' }}>INQUISITIVE</span>
            </div>
          </div>
          
          {/* Error Icon */}
          <div style={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            background: 'rgba(245,158,11,0.1)', 
            border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px'
          }}>
            <AlertCircle size={36} color="#f59e0b" />
          </div>
          
          {/* Error Code */}
          <div style={{ fontSize: 72, fontWeight: 900, color: 'rgba(255,255,255,0.1)', letterSpacing: '-4px', lineHeight: 1, marginBottom: 8 }}>
            500
          </div>
          
          {/* Message */}
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Server Error</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 32 }}>
            We are experiencing technical difficulties. 
            Our team has been notified and is working to resolve the issue.
            Please try again in a few moments.
          </p>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 10,
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={18} />
              Retry
            </button>
            
            <button 
              onClick={() => router.push('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              <Home size={18} />
              Go Home
            </button>
          </div>
          
          {/* Support */}
          <div style={{ 
            marginTop: 32, 
            padding: '16px 20px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
              <MessageSquare size={14} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Need assistance?</span>
            </div>
            <a 
              href="mailto:support@getinqai.com" 
              style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none' }}
            >
              support@getinqai.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
