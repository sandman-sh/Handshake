import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { injected } from 'wagmi/connectors';

const RPC_URL = 'https://testrpc.xlayer.tech/terigon';

export const xLayerTestnet = defineChain({
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer-test' },
  },
  testnet: true,
});

export const xLayerTestnetLegacy = defineChain({
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer-test' },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [xLayerTestnet, xLayerTestnetLegacy],
  connectors: [injected()],
  transports: {
    [xLayerTestnet.id]: http(RPC_URL),
    [xLayerTestnetLegacy.id]: http(RPC_URL),
  },
  ssr: true,
});
