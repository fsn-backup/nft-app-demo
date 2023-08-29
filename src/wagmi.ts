import { configureChains, createConfig, createStorage } from 'wagmi'
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
    public: { http: ['https://rpc-l2-op-endurance-testnet1.fusionist.io/'] },
    default: { http: ['https://rpc-l2-op-endurance-testnet1.fusionist.io/'] },
  },
  blockExplorers: {
    etherscan: { name: 'OpEnduExplorer', url: 'https://explorer-l2-op-endurance-testnet1.fusionist.io/' },
    default: { name: 'OpEnduExplorer', url: 'https://explorer-l2-op-endurance-testnet1.fusionist.io/' },
  },
  testnet: true
} as const satisfies Chain;

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, opendu],
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
