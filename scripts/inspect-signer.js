const { mnemonicToMiniSecret } = require('@polkadot/util-crypto');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const { u8aToHex } = require('@polkadot/util');
const { Keyring } = require('@polkadot/keyring');

const env = {};
require('dotenv').config({ processEnv: env });

async function main() {
  await cryptoWaitReady();

  const { SIGNER_MNEMONIC = '' } = env;
  const mnemonic = SIGNER_MNEMONIC;
  if (!mnemonic) {
    throw new Error('No signer`s mnemonic provided');
  }

  const keyring = new Keyring({ type: 'sr25519' });
  const pair = keyring.createFromUri(mnemonic);
  console.log(`Public key: ${u8aToHex(pair.publicKey)}`);

  console.log(`Polkadot address: ${keyring.encodeAddress(pair.publicKey, 0)}`);
  console.log(`Kusama address: ${keyring.encodeAddress(pair.publicKey, 2)}`);
  console.log(`Westend address: ${keyring.encodeAddress(pair.publicKey, 42)}`);
  console.log(
    `See all addresses: https://polkadot.subscan.io/tools/format_transform?input=${u8aToHex(pair.publicKey)}&type=All`,
  );
}

main()
  .catch(console.error)
  .finally(() => process.exit());
