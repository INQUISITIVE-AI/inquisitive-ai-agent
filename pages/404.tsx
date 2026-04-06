import Head from 'next/head';
import { useRouter } from 'next/router';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import InqaiLogo from '../src/components/InqaiLogo';

export default function Custom404() {
  const router = useRouter();
  
  return (
    <>
      <Head>
        <title>Page Not Found | INQUISITIVE</title>
        <meta name="description" content="The page you are looking for does not exist. Navigate back to INQUISITIVE." />
        <meta name="robots" content="noindex, follow" />
      </Head>
      
      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
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
            background: 'rgba(239,68,68,0.1)', 
            border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px'
          }}>
            <AlertTriangle size={36} color="#ef4444" />
          </div>
          
          {/* Error Code */}
          <div style={{ fontSize: 72, fontWeight: 900, color: 'rgba(255,255,255,0.1)', letterSpacing: '-4px', lineHeight: 1, marginBottom: 8 }}>
            404
          </div>
          
          {/* Message */}
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Page Not Found</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 32 }}>
            The page you are looking for does not exist or has been moved. 
            Check the URL or navigate back to the homepage.
          </p>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => router.push('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              <Home size={18} />
              Go Home
            </button>
            
            <button 
              onClick={() => router.back()}
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
              <ArrowLeft size={18} />
              Go Back
            </button>
          </div>
          
          {/* Footer */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span onClick={() => router.push('/buy')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.15s' }}>Acquire INQAI</span>
              <span onClick={() => router.push('/analytics')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.15s' }}>Analytics</span>
              <span onClick={() => router.push('/help')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.15s' }}>Documentation</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
