import { Providers } from './providers'

export const metadata = {
  title: 'INQUISITIVE Vault V2 Deployer',
  description: 'Deploy signal-based AI trading vault',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#080808', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
