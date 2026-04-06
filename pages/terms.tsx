import Head from 'next/head';
import { useRouter } from 'next/router';
import { Scale, FileText, AlertTriangle, ChevronRight, ExternalLink } from 'lucide-react';
import InqaiLogo from '../src/components/InqaiLogo';

export default function TermsPage() {
  const router = useRouter();
  const INQAI_TOKEN = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';
  
  const sections = [
    {
      id: 'agreement',
      title: '1. Agreement to Terms',
      content: `By accessing or using the INQUISITIVE platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all the terms and conditions herein, you may not access or use the Platform. These Terms constitute a legally binding agreement between you and INQUISITIVE ("we", "us", or "our").`
    },
    {
      id: 'eligibility',
      title: '2. Eligibility',
      content: `You must be at least 18 years old and have the legal capacity to enter into these Terms. By using the Platform, you represent and warrant that:
• You are not a resident of, or located in, any jurisdiction where the purchase, sale, or holding of digital assets is prohibited by applicable law
• You are not on any sanctions lists maintained by the United States, European Union, United Nations, or other applicable jurisdictions
• All information you provide is accurate, complete, and current`
    },
    {
      id: 'token',
      title: '3. INQAI Token',
      content: `The INQAI token is an ERC-20 utility token on the Ethereum blockchain representing proportional ownership in a professionally managed portfolio of 66 digital assets. 

Important:
• INQAI tokens do not represent equity, debt, or any ownership interest in INQUISITIVE as a company
• Token holders do not have voting rights or management control
• The token derives its value from the underlying portfolio performance and protocol mechanisms, not from any promise of future returns`
    },
    {
      id: 'risks',
      title: '4. Risk Disclosure',
      content: `DIGITAL ASSETS CARRY SUBSTANTIAL RISK INCLUDING TOTAL LOSS OF CAPITAL. By using the Platform, you acknowledge and accept:

• Market Risk: Cryptocurrency markets are highly volatile. The value of INQAI and underlying assets can fluctuate significantly
• Smart Contract Risk: Despite audits, smart contracts may contain vulnerabilities that could result in loss of funds
• Regulatory Risk: Laws and regulations governing digital assets are evolving and may adversely affect the Platform
• Technology Risk: The Platform relies on third-party infrastructure including Ethereum, Chainlink, and various data providers
• Liquidity Risk: There may be limited ability to sell INQAI tokens at desired prices
• Target APY of 18.5% is a projection based on strategy design, not a guarantee`
    },
    {
      id: 'fees',
      title: '5. Fees and Compensation',
      content: `The Platform charges a 15% performance fee on yield generated. No management fees are charged on deployed capital. Fee distribution:
• 60% allocated to open-market INQAI buybacks
• 20% permanently burned
• 20% to treasury reserves

All fees are calculated and collected automatically through smart contracts. Users are responsible for all gas fees associated with transactions.`
    },
    {
      id: 'prohibited',
      title: '6. Prohibited Activities',
      content: `You agree not to:
• Use the Platform for any illegal purpose or in violation of any local, state, national, or international law
• Attempt to interfere with, compromise the system integrity or security, or decipher any transmissions
• Use any robot, spider, crawler, scraper, or other automated means to access the Platform
• Introduce viruses, trojan horses, worms, or other harmful materials
• Attempt to circumvent any content filtering techniques or security measures`
    },
    {
      id: 'disclaimers',
      title: '7. Disclaimers',
      content: `THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.

We do not warrant that:
• The Platform will be uninterrupted, timely, secure, or error-free
• The results obtained from using the Platform will be accurate or reliable
• Any errors in the software will be corrected

The AI-driven portfolio management system operates autonomously based on predefined algorithms. Past performance is not indicative of future results.`
    },
    {
      id: 'limitation',
      title: '8. Limitation of Liability',
      content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, INQUISITIVE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATING TO YOUR ACCESS TO OR USE OF THE PLATFORM.

In no event shall our total liability exceed the greater of:
• The amount you paid to acquire INQAI tokens in the 12 months preceding the claim, or
• $100 USD`
    },
    {
      id: 'governing',
      title: '9. Governing Law',
      content: `These Terms shall be governed by and construed in accordance with the laws of the State of Wyoming, United States, without regard to its conflict of law provisions. Any dispute arising under these Terms shall be resolved exclusively through binding arbitration in accordance with the rules of the American Arbitration Association.`
    },
    {
      id: 'changes',
      title: '10. Changes to Terms',
      content: `We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the Platform after any changes constitutes acceptance of the new Terms. Material changes will be notified through the Platform interface and/or email where possible.`
    },
    {
      id: 'contact',
      title: '11. Contact Information',
      content: `For questions about these Terms, please contact:

Email: legal@getinqai.com
Token Contract: ${INQAI_TOKEN}
Vault Contract: ${process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb'}`
    }
  ];

  return (
    <>
      <Head>
        <title>Terms of Service | INQUISITIVE</title>
        <meta name="description" content="Terms of Service for the INQUISITIVE platform and INQAI token." />
        <meta name="robots" content="index, follow" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
        <div className="mesh-bg" />
        
        {/* Header */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,26,0.94)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', height: 60, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 8 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', marginRight: 24, padding: 0 }}>
            <InqaiLogo size={32} />
            <div className="anim-name-pulse" style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.5px', color: '#fff' }}>INQUISITIVE</div>
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <span onClick={() => router.push('/privacy')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px 12px' }}>Privacy</span>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 100px', position: 'relative', zIndex: 1 }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Scale size={40} color="#7c3aed" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 8 }}>Terms of Service</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Last Updated: April 4, 2025</p>
          </div>

          {/* Alert */}
          <div style={{ 
            background: 'rgba(251,191,36,0.05)', 
            border: '1px solid rgba(251,191,36,0.2)', 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 40,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>Important Legal Notice</div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                These Terms of Service constitute a binding legal agreement. By using the INQUISITIVE platform, 
                you acknowledge that you have read, understood, and agree to be bound by these terms. 
                Digital assets carry substantial risk including total loss of capital.
              </p>
            </div>
          </div>

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: '#a78bfa' }}>{section.title}</h2>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer navigation */}
          <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              onClick={() => router.push('/privacy')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ChevronRight size={16} />
              Privacy Policy
            </button>
            <button 
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <FileText size={16} />
              Print Terms
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '32px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.8 }}>
              &copy; {new Date().getFullYear()} INQUISITIVE. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
