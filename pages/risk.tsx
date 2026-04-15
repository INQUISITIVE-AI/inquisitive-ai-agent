import Head from 'next/head';
import { useRouter } from 'next/router';
import { AlertTriangle, TrendingDown, Shield, Zap, Globe, Lock, FileText, ChevronRight } from 'lucide-react';
import InqaiLogo from '../src/components/InqaiLogo';

export default function RiskDisclosurePage() {
  const router = useRouter();

  const sections = [
    {
      id: 'overview',
      icon: AlertTriangle,
      color: '#f59e0b',
      title: '1. Overview',
      content: `This Risk Disclosure Statement is provided to inform users of the material risks associated with using the INQUISITIVE platform, holding INQAI tokens, and participating in AI-managed portfolio strategies. This is not an exhaustive list of all risks.

DIGITAL ASSETS CARRY SUBSTANTIAL RISK INCLUDING TOTAL LOSS OF CAPITAL. Do not invest funds you cannot afford to lose entirely. Past performance of any portfolio, AI model, or strategy is not indicative of future results.`,
    },
    {
      id: 'market',
      icon: TrendingDown,
      color: '#ef4444',
      title: '2. Market Risk',
      content: `Cryptocurrency markets are characterized by extreme volatility:

• Prices of digital assets can fall 50–99% in short periods without warning
• The INQAI token price is influenced by both underlying portfolio performance and secondary market supply/demand dynamics
• Liquidity can disappear rapidly during market stress events, making it impossible to exit positions at desired prices
• Global macroeconomic events, regulatory announcements, and geopolitical developments can trigger sudden, sharp market declines
• Correlations between assets can increase dramatically during market downturns, reducing the benefits of diversification`,
    },
    {
      id: 'smart-contract',
      icon: Lock,
      color: '#8b5cf6',
      title: '3. Smart Contract Risk',
      content: `The INQUISITIVE platform relies entirely on smart contracts deployed on the Ethereum blockchain:

• Smart contracts may contain bugs, vulnerabilities, or exploits that could result in partial or total loss of funds
• The platform has not undergone a formal third-party security audit by a recognized firm at this time
• Upgrades to the vault contract via the UUPS proxy pattern introduce additional risk if the upgrade mechanism is exploited
• Interactions with third-party protocols (Uniswap V3, deBridge DLN, Chainlink) introduce dependency risks outside our control
• On-chain transactions are irreversible — funds lost due to smart contract exploits cannot be recovered`,
    },
    {
      id: 'ai-model',
      icon: Zap,
      color: '#06b6d4',
      title: '4. AI Model Risk',
      content: `The INQUISITIVE AI Brain manages portfolio decisions autonomously:

• The AI model is based on quantitative signals and historical patterns, which may not predict future market behavior
• The target 70–90% win rate is based on strategy design and backtesting methodology, not audited live performance
• AI models can experience "regime failure" — performing well in certain market conditions and poorly in others
• Signal generation errors, data feed failures, or model degradation could result in poor trading decisions
• The 18.5% target APY is a projection, not a guarantee — actual returns may be significantly lower or negative
• Automation via Chainlink means trades execute without human review — there is no circuit breaker for individual bad trades`,
    },
    {
      id: 'regulatory',
      icon: Shield,
      color: '#10b981',
      title: '5. Regulatory Risk',
      content: `The regulatory environment for digital assets is rapidly evolving:

• Digital assets, DeFi protocols, and AI-managed funds may be classified as securities in various jurisdictions
• Regulatory actions could restrict, prohibit, or require registration of activities currently performed by the platform
• Tax treatment of digital assets varies by jurisdiction and is subject to change — users are solely responsible for their own tax obligations
• US residents and residents of other restricted jurisdictions should seek legal advice before using the platform
• Platform operations may be required to implement KYC/AML procedures in the future, which could affect access`,
    },
    {
      id: 'operational',
      icon: Globe,
      color: '#f97316',
      title: '6. Operational & Technology Risk',
      content: `Platform operation depends on multiple technology layers, each of which can fail:

• Ethereum network congestion can delay or prevent transaction execution at critical moments
• CoinGecko, Chainlink, and other data providers used by the AI brain may experience outages or provide inaccurate data
• The backend WebSocket server and price feed are single points of failure in the current architecture
• The platform is operated by a small team — key person risk exists; loss of the primary developer could impair maintenance
• Internet connectivity issues, server outages, or DDoS attacks could render the platform temporarily inaccessible
• Third-party wallet providers (MetaMask, WalletConnect) may introduce security vulnerabilities or service disruptions`,
    },
    {
      id: 'liquidity',
      icon: TrendingDown,
      color: '#ec4899',
      title: '7. Liquidity Risk',
      content: `INQAI token liquidity is not guaranteed:

• Secondary market liquidity depends entirely on third-party decentralized exchanges and market makers
• There may be insufficient liquidity to sell INQAI tokens at any given time
• Large token sales can significantly move the price, especially in low-liquidity conditions
• The 15% performance fee buyback mechanism supports but does not guarantee token price levels
• Token burns reduce supply over time but do not guarantee price appreciation`,
    },
    {
      id: 'custody',
      icon: Lock,
      color: '#a78bfa',
      title: '8. Custody & Key Risk',
      content: `Users are solely responsible for the security of their wallets and private keys:

• INQUISITIVE never has access to your private keys — you are your own custodian
• Loss of your private key or seed phrase means permanent, irrecoverable loss of all funds
• Wallet compromise, phishing attacks, or malware on your device can result in total loss
• Hardware wallet users should ensure device firmware is kept up to date
• Never share your seed phrase with anyone — INQUISITIVE staff will never ask for it`,
    },
    {
      id: 'no-guarantee',
      icon: AlertTriangle,
      color: '#f59e0b',
      title: '9. No Investment Advice',
      content: `Nothing on the INQUISITIVE platform constitutes financial, investment, legal, or tax advice:

• We are a technology platform, not a licensed investment adviser, broker-dealer, or financial institution
• All content, projections, and AI-generated signals are for informational purposes only
• Users should conduct their own due diligence and consult qualified professionals before making any investment decision
• The platform does not account for individual financial situations, risk tolerance, or investment objectives
• By using the platform, you confirm you are acting on your own judgment and not in reliance on any representation by INQUISITIVE`,
    },
    {
      id: 'acknowledgment',
      icon: FileText,
      color: '#6366f1',
      title: '10. Acknowledgment',
      content: `By using the INQUISITIVE platform, you acknowledge that:

• You have read and understood this Risk Disclosure Statement
• You accept all risks described herein and any additional risks not described
• You are investing only funds you can afford to lose entirely
• You have sought independent financial, legal, and tax advice as appropriate
• You are not a resident of any jurisdiction where use of this platform is prohibited

Last Updated: April 14, 2026`,
    },
  ];

  return (
    <>
      <Head>
        <title>Risk Disclosure | INQUISITIVE</title>
        <meta name="description" content="Risk Disclosure Statement for the INQUISITIVE platform. Understand the risks of AI-managed crypto portfolio strategies." />
        <meta name="robots" content="index, follow" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#fff', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        <div className="mesh-bg" />

        {/* Header */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,26,0.94)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', height: 60, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 8 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', marginRight: 24, padding: 0 }}>
            <InqaiLogo size={32} />
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.5px', color: '#fff' }}>INQUISITIVE</div>
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <span onClick={() => router.push('/terms')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px 12px' }}>Terms</span>
            <span onClick={() => router.push('/privacy')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px 12px' }}>Privacy</span>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 100px', position: 'relative', zIndex: 1 }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <AlertTriangle size={40} color="#f59e0b" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 8 }}>Risk Disclosure</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Last Updated: April 14, 2026</p>
          </div>

          {/* Warning Banner */}
          <div style={{
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 48,
          }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <AlertTriangle size={22} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', marginBottom: 6 }}>HIGH RISK — READ CAREFULLY BEFORE PROCEEDING</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>
                  The INQUISITIVE platform involves significant financial risk. Digital assets and AI-managed strategies
                  can result in total loss of invested capital. This statement does not cover all risks — additional
                  risks unknown to us or deemed immaterial may also adversely affect your investment.
                </p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <section.icon size={22} color={section.color} />
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: section.color, margin: 0 }}>{section.title}</h2>
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, whiteSpace: 'pre-line', paddingLeft: 34 }}>
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer nav */}
          <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <button onClick={() => router.push('/terms')} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <ChevronRight size={16} />Terms of Service
            </button>
            <button onClick={() => router.push('/privacy')} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <ChevronRight size={16} />Privacy Policy
            </button>
            <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <FileText size={16} />Print
            </button>
          </div>
        </main>

        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '32px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              &copy; {new Date().getFullYear()} INQUISITIVE. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
