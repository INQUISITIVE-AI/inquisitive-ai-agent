import { createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet],
  connectors: [
    injected({ target: 'metaMask' }),
    walletConnect({
      projectId: 'c2f6514049b91d56d7e1fa3c16c5d5e2',
      metadata: {
        name: 'INQAI Contract Deployer',
        description: 'Deploy INQUISITIVE protocol contracts',
        url: 'https://getinqai.com',
        icons: []
      }
    })
  ],
  transports: {
    [mainnet.id]: http('https://eth-mainnet.g.alchemy.com/v2/demo')
  }
})

// Already deployed contracts
export const DEPLOYED = {
  INQAI_TOKEN: '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5',
  VAULT: '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb',
  STRATEGY: '0xa2589adA4D647a9977e8e46Db5849883F2e66B3e',
  STRATEGY_MANAGER: '0x8431173FA9594B43E226D907E26EF68cD6B6542D',
  PROFIT_MAXIMIZER: '0x23a033c08e3562786068cB163967626234A45E37',
  TEAM_WALLET: '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746'
} as const
