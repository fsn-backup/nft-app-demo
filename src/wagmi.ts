import { configureChains, createConfig } from 'wagmi'
import { goerli, mainnet } from 'wagmi/chains'
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { Chain } from 'wagmi'

import { publicProvider } from 'wagmi/providers/public'

export const opendu = {
  id: 6480001000,
  name: 'Op-Endurance',
  network: 'Op-Endurance',
  nativeCurrency: {
    decimals: 18,
    name: 'ACE',
    symbol: 'ACE',
  },
  rpcUrls: {
    public: { http: ['http://88.99.94.109:3334/'] },
    default: { http: ['http://88.99.94.109:3334/'] },
  },
  blockExplorers: {
    etherscan: { name: 'OpEnduExplorer', url: 'http://88.99.94.109:4100/' },
    default: { name: 'OpEnduExplorer', url: 'http://88.99.94.109:4100/' },
  },
  testnet: true
} as const satisfies Chain;

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet,opendu],
  [
    publicProvider(),
  ],
)

export const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'wagmi',
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: 'Injected',
        shimDisconnect: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
})
