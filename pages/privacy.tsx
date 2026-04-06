import Head from 'next/head';
import { useRouter } from 'next/router';
import { Shield, Eye, Database, Lock, ChevronRight, FileText, Globe, Cookie } from 'lucide-react';
import InqaiLogo from '../src/components/InqaiLogo';

export default function PrivacyPage() {
  const router = useRouter();

  const sections = [
    {
      id: 'introduction',
      icon: Eye,
      title: '1. Introduction',
      content: `INQUISITIVE ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform ("Platform").

By accessing or using the Platform, you consent to the collection and use of information in accordance with this Privacy Policy. If you do not agree with this policy, please do not use the Platform.`
    },
    {
      id: 'collect',
      icon: Database,
      title: '2. Information We Collect',
      content: `We collect minimal information to provide and improve our services:

Blockchain Data:
• Public wallet addresses (Ethereum and other chains)
• On-chain transaction history related to INQAI token and vault interactions
• Smart contract interaction data

Technical Data:
• IP address (for rate limiting and security)
• Browser type and version
• Operating system
• Page visit timestamps

Voluntary Information:
• Email address (only if provided for support inquiries)
• Support ticket content

We do NOT collect:
• Private keys or seed phrases
• Passwords
• Financial account information (bank accounts, credit cards)
• Personal identification documents`
    },
    {
      id: 'blockchain',
      icon: Globe,
      title: '3. Blockchain Data Privacy',
      content: `The INQUISITIVE platform operates on public blockchain networks. Please be aware that:

• All blockchain transactions are public, permanent, and immutable
• Your wallet address and transaction history are publicly visible on the blockchain
• Once a transaction is confirmed on the blockchain, it cannot be deleted or modified
• We have no ability to remove or alter data that has been recorded on the blockchain

While we display blockchain data through our interface, we do not control the underlying public blockchain networks. Use of the Platform inherently involves publishing transaction data to public blockchains.`
    },
    {
      id: 'use',
      icon: FileText,
      title: '4. How We Use Your Information',
      content: `We use collected information for the following purposes:

• Providing Services: To display portfolio analytics, token balances, and execute user-initiated transactions
• Platform Improvement: To analyze usage patterns and improve user experience
• Security: To detect and prevent fraud, abuse, and technical issues
• Support: To respond to support inquiries and provide customer service
• Legal Compliance: To comply with applicable laws and regulations

We do not sell, rent, or lease your information to third parties.`
    },
    {
      id: 'cookies',
      icon: Cookie,
      title: '5. Cookies and Tracking',
      content: `We use minimal cookies and local storage:

Essential Cookies:
• Session state management
• Wallet connection preferences (stored locally in your browser)
• UI preferences (theme, layout)

Analytics:
• We do not use third-party analytics cookies
• We do not track users across websites
• We do not build advertising profiles

You can disable cookies through your browser settings, though this may affect Platform functionality.`
    },
    {
      id: 'security',
      icon: Lock,
      title: '6. Data Security',
      content: `We implement appropriate technical and organizational measures to protect information:

• All API communications use HTTPS/TLS encryption
• No private keys or sensitive credentials are stored on our servers
• Rate limiting to prevent abuse
• Regular security assessments

However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.`
    },
    {
      id: 'third-party',
      icon: Globe,
      title: '7. Third-Party Services',
      content: `The Platform integrates with third-party services:

Data Providers:
• CoinGecko (cryptocurrency price data)
• CryptoCompare (price data fallback)
• Alternative.me (Fear & Greed index)
• Etherscan (blockchain explorer data)

Wallet Providers:
• WalletConnect (wallet connection protocol)
• MetaMask and other Web3 wallets

These third parties have their own privacy policies. We are not responsible for their practices.`
    },
    {
      id: 'retention',
      icon: Database,
      title: '8. Data Retention',
      content: `We retain information for as long as necessary to fulfill the purposes outlined in this Privacy Policy:

• IP addresses and request logs: 30 days
• Support emails: 1 year (or as legally required)
• Blockchain data: Indefinitely (as it is publicly available)

After these periods, data is automatically deleted or anonymized.`
    },
    {
      id: 'rights',
      icon: Eye,
      title: '9. Your Rights',
      content: `Depending on your jurisdiction, you may have the following rights:

• Access: Request copies of your personal information
• Correction: Request correction of inaccurate information
• Deletion: Request deletion of your personal information (where legally possible)
• Restriction: Request restriction of processing
• Portability: Request transfer of your information

To exercise these rights, contact us at privacy@getinqai.com. Note that blockchain data cannot be deleted due to the immutable nature of blockchain technology.`
    },
    {
      id: 'children',
      icon: Shield,
      title: '10. Children\'s Privacy',
      content: `The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that a child under 18 has provided us with personal information, we will take steps to delete such information.`
    },
    {
      id: 'international',
      icon: Globe,
      title: '11. International Data Transfers',
      content: `The Platform is hosted in the United States. If you are accessing the Platform from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States or other countries where our servers are located.`
    },
    {
      id: 'changes',
      icon: FileText,
      title: '12. Changes to This Policy',
      content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.`
    },
    {
      id: 'contact',
      icon: ChevronRight,
      title: '13. Contact Us',
      content: `If you have any questions about this Privacy Policy, please contact us:

Email: privacy@getinqai.com

Mailing Address:
INQUISITIVE
PO Box [REDACTED]
Wyoming, USA`
    }
  ];

  return (
    <>
      <Head>
        <title>Privacy Policy | INQUISITIVE</title>
        <meta name="description" content="Privacy Policy for the INQUISITIVE platform. Learn how we protect your data." />
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
            <span onClick={() => router.push('/terms')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px 12px' }}>Terms</span>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 100px', position: 'relative', zIndex: 1 }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Shield size={40} color="#34d399" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 8 }}>Privacy Policy</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Last Updated: April 4, 2025</p>
          </div>

          {/* Intro */}
          <div style={{ 
            background: 'rgba(52,211,153,0.05)', 
            border: '1px solid rgba(52,211,153,0.15)', 
            borderRadius: 12, 
            padding: 20, 
            marginBottom: 48 
          }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>
              At INQUISITIVE, privacy is a fundamental principle. We minimize data collection, 
              never sell your information, and design our systems with privacy by default. 
              This policy explains exactly what we collect and why.
            </p>
          </div>

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <section.icon size={24} color="#a78bfa" />
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#a78bfa', margin: 0 }}>{section.title}</h2>
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer navigation */}
          <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              onClick={() => router.push('/terms')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ChevronRight size={16} />
              Terms of Service
            </button>
            <button 
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <FileText size={16} />
              Print Policy
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
