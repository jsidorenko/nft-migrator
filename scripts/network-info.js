const { ApiPromise, WsProvider } = require('@polkadot/api');

require('dotenv').config();

async function main() {
  const {
    // LOCAL_NODE_ENDPOINT,
    ASSET_HUB_WESTEND_NODE_ENDPOINT,
    ASSET_HUB_KUSAMA_NODE_ENDPOINT,
    ASSET_HUB_POLKADOT_NODE_ENDPOINT,
  } = process.env;
  let rpcs = [
    // LOCAL_NODE_ENDPOINT,
    ASSET_HUB_WESTEND_NODE_ENDPOINT,
    ASSET_HUB_KUSAMA_NODE_ENDPOINT,
    ASSET_HUB_POLKADOT_NODE_ENDPOINT,
  ];

  for (const rpc of rpcs) {
    const wsProvider = new WsProvider(rpc);
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;
    console.log(`Token: ${api.registry.chainTokens[0]}`);
    console.log(`Decimals: ${api.registry.chainDecimals[0]}`);
    await api.disconnect();
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit());
