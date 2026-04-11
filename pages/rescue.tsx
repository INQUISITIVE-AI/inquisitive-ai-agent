import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues with wagmi
const RescueComponent = dynamic(() => import('../src/components/RescueComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <div>Loading Emergency Rescue...</div>
    </div>
  ),
});

export default function RescuePage() {
  return <RescueComponent />;
}
