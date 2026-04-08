import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Users, Share2, Gift, Copy, CheckCircle, TrendingUp, ExternalLink, Wallet } from 'lucide-react';

const REFERRAL_CONTRACT = (process.env.NEXT_PUBLIC_REFERRAL_CONTRACT || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const CONTRACT_LIVE = REFERRAL_CONTRACT !== '0x0000000000000000000000000000000000000000';

interface GlobalStats {
  totalReferrers: number;
  bonusPool: string;
  estimatedBonusPerEth: { referrer: string; referee: string };
}

interface UserStats {
  isReferrer: boolean;
  hasReferrer: boolean;
  referralCount: number;
  totalVolumeEth: string;
  totalBonusEarned: string;
}

export default function ReferralTracker() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();

  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [userStats,   setUserStats]   = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const referralLink = address ? `https://getinqai.com/buy?ref=${address}` : '';
  const tweetText    = address
    ? encodeURIComponent(`I'm using INQUISITIVE — the first AI-managed asset-backed token backed by 66 assets.\n\nGet 5% bonus INQAI on your first purchase:\n${referralLink}`)
    : '';

  const fetchStats = useCallback(async () => {
    try {
      const url = address ? `/api/inquisitiveAI/referral?address=${address}` : '/api/inquisitiveAI/referral';
      const res  = await fetch(url);
      if (!res.ok) return;
      const d = await res.json();
      setGlobalStats(d.global);
      if (d.user) setUserStats(d.user);
    } catch {}
    finally { setStatsLoading(false); }
  }, [address]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const copy = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', color: '#fff' }}>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, marginBottom: 1, background: 'rgba(255,255,255,0.05)' }}>
        {([
          { l: 'Your Commission', v: '5%',   sub: 'On every referred purchase',  c: '#10b981' },
          { l: 'Referee Bonus',   v: '5%',   sub: 'On their first purchase',      c: '#a78bfa' },
          { l: 'Total Referrers', v: statsLoading ? '…' : (globalStats?.totalReferrers || 0).toLocaleString(), sub: 'Active referrers', c: '#60a5fa' },
          { l: 'Bonus Pool',      v: statsLoading ? '…' : parseFloat(globalStats?.bonusPool || '0').toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' INQAI', sub: 'Available payouts', c: '#f59e0b' },
        ] as const).map(s => (
          <div key={s.l} style={{ background: 'rgba(13,13,32,0.97)', padding: '22px 24px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c, fontFamily: 'monospace', letterSpacing: '-0.5px', marginBottom: 5 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{s.l}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Panel ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.05)' }}>

        {/* LEFT — Your Referral Link */}
        <div style={{ background: 'rgba(13,13,32,0.97)', padding: '32px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Share2 size={15} color="#a78bfa" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Your Referral Link</span>
          </div>

          {!isConnected ? (
            <>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                Connect your wallet to generate your unique referral link. Your wallet address is your referral code — share it and earn 5% INQAI on every purchase made through your link.
              </p>
              <button onClick={() => open()} style={{ width: '100%', padding: '14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Wallet size={15} /> Connect Wallet
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Referral Link</div>
                <div style={{ position: 'relative' }}>
                  <div style={{ padding: '12px 46px 12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, fontSize: 11, color: '#818cf8', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.55 }}>
                    {referralLink}
                  </div>
                  <button onClick={() => copy(referralLink, 'link')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    {copied === 'link' ? <CheckCircle size={15} color="#10b981" /> : <Copy size={15} color="rgba(255,255,255,0.35)" />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Referral Code (wallet address)</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, fontSize: 11, color: '#fff', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {address}
                  </div>
                  <button onClick={() => copy(address!, 'code')} style={{ padding: '10px 14px', background: copied === 'code' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: copied === 'code' ? '#10b981' : 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {copied === 'code' ? <><CheckCircle size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => copy(referralLink, 'link')} style={{ padding: '12px 16px', borderRadius: 8, cursor: 'pointer', background: copied === 'link' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied === 'link' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, color: copied === 'link' ? '#10b981' : '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  {copied === 'link' ? <><CheckCircle size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
                </button>
                <a href={`https://twitter.com/intent/tweet?text=${tweetText}`} target="_blank" rel="noopener noreferrer" style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(29,161,242,0.1)', border: '1px solid rgba(29,161,242,0.25)', color: '#1da1f2', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none' }}>
                  Share on X
                </a>
              </div>

              {!CONTRACT_LIVE && (
                <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                  <strong style={{ color: '#a78bfa' }}>Referral rewards begin at contract launch.</strong> Share your link now — purchases made with your code before launch will be credited when the referral contract deploys.
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT — Performance or How It Works */}
        <div style={{ background: 'rgba(13,13,32,0.97)', padding: '32px 32px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
          {isConnected && userStats?.isReferrer ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <TrendingUp size={15} color="#10b981" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Your Performance</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { l: 'Referred',   v: String(userStats.referralCount),                                        c: '#fff'     },
                  { l: 'Volume',     v: parseFloat(userStats.totalVolumeEth  || '0').toFixed(2) + ' ETH',      c: '#60a5fa'  },
                  { l: 'Earned',     v: parseFloat(userStats.totalBonusEarned || '0').toFixed(2) + ' INQAI',   c: '#10b981'  },
                ].map(s => (
                  <div key={s.l} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.c, fontFamily: 'monospace', marginBottom: 4 }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Est. INQAI per 1 ETH referred</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#a78bfa', fontFamily: 'monospace' }}>
                  ~{parseFloat(globalStats?.estimatedBonusPerEth?.referrer || '0').toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Gift size={15} color="#f59e0b" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>How It Works</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { n: '01', t: 'Connect & Copy', d: 'Connect your wallet. Your wallet address is your unique referral code.' },
                  { n: '02', t: 'Share Your Link', d: 'Share your referral link on X, Telegram, Discord, or with friends directly.' },
                  { n: '03', t: 'They Buy',       d: 'When someone uses your link to purchase INQAI, they receive 5% bonus tokens on top.' },
                  { n: '04', t: 'You Earn',        d: 'You automatically receive 5% of their purchase amount in INQAI, credited on-chain.' },
                ].map((s, i) => (
                  <div key={s.n} style={{ display: 'flex', gap: 16, padding: '15px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(167,139,250,0.35)', fontFamily: 'monospace', minWidth: 22, paddingTop: 1 }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{s.t}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'rgba(13,13,32,0.97)', marginTop: 1, padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: CONTRACT_LIVE ? '#10b981' : '#f59e0b', boxShadow: `0 0 6px ${CONTRACT_LIVE ? '#10b981' : '#f59e0b'}` }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Referral Contract: {CONTRACT_LIVE ? 'Live' : 'Pending deployment'}</span>
        </div>
        {CONTRACT_LIVE && <a href={`https://etherscan.io/address/${REFERRAL_CONTRACT}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', textDecoration: 'none' }}>{REFERRAL_CONTRACT.slice(0,6)}…{REFERRAL_CONTRACT.slice(-4)} <ExternalLink size={10} /></a>}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginLeft: 'auto' }}>Bonuses credited automatically at time of purchase</span>
      </div>
    </div>
  );
}
