const { Keyring } = require('@polkadot/keyring');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { u8aToHex } = require('@polkadot/util');

const env = {};
require('dotenv').config({ processEnv: env });

async function connect() {
  const { SIGNER_MNEMONIC = '', NETWORK = '' } = env;
  const rpc = env[`${NETWORK.toUpperCase()}_NODE_ENDPOINT`];
  const mnemonic = SIGNER_MNEMONIC;

  if (!rpc) {
    throw new Error('No RPC endpoint found');
  }
  if (!mnemonic) {
    throw new Error('No signer`s mnemonic provided');
  }

  const wsProvider = new WsProvider(rpc);
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;

  const keyring = new Keyring({ type: 'sr25519' });
  const signingPair = keyring.createFromUri(mnemonic);

  return { api, keyring, signingPair };
}

async function main() {
  const { api, keyring, signingPair } = await connect();

  const signerAddress = keyring.encodeAddress(signingPair.publicKey, api.registry.chainSS58);
  const bob = keyring.addFromUri('//Bob');
  const collectionId = 0;
  const itemId = 0;
  const metadata = 'some metadata';
  const attribute = ['some key', 'some value'];

  // 1 - preparation
  // 2 - offchain mint
  // 3 - offchain attributes
  const step = 0;

  // preparation
  if (step === 1) {
    const txs = [];
    // create uniques collection
    txs.push(await createCollection(api, collectionId, signerAddress, 'uniques'));

    // create nfts collection
    txs.push(await createCollection(api, undefined, signerAddress, 'nfts'));

    // mint item
    txs.push(await mintItem(api, collectionId, itemId, bob.address, 'uniques'));

    // set metadata
    txs.push(await setMetadata(api, collectionId, itemId, metadata, 'uniques'));

    // add attributes
    txs.push(await addAttribute(api, collectionId, itemId, attribute[0], attribute[1], 'uniques'));

    const hash = await api.tx.utility.batchAll(txs).signAndSend(signingPair);
    console.log(hash.toHex());
  }

  // offchain mint
  if (step === 2) {
    const sig = await signItem(api, signingPair, collectionId, itemId, metadata, [attribute], bob.address);
    const preSignedMint = api.createType('PalletNftsPreSignedMint', sig.data);

    const hash = await api.tx.nfts
      .mintPreSigned(preSignedMint, { Sr25519: sig.signature }, signerAddress)
      .signAndSend(bob);
    console.log(hash.toHex());
  }

  // update attributes via offchain signature
  if (step === 3) {
    const sig = await signAttribute(api, signingPair, collectionId, itemId, attribute[0], 'new value');
    const preSignedAttributes = api.createType('PalletNftsPreSignedAttributes', sig.data);

    const hash = await api.tx.nfts
      .setAttributesPreSigned(preSignedAttributes, { Sr25519: sig.signature }, signerAddress)
      .signAndSend(bob);
    console.log(hash.toHex());
  }
}

async function createCollection(api, collectionId, admin, pallet) {
  return pallet === 'uniques' ? api.tx.uniques.create(collectionId, admin) : api.tx.nfts.create(admin, {});
}

async function mintItem(api, collectionId, itemId, mintTo, pallet) {
  return pallet === 'uniques'
    ? api.tx.uniques.mint(collectionId, itemId, mintTo)
    : api.tx.nfts.mint(collectionId, itemId, mintTo, null);
}

async function setMetadata(api, collectionId, itemId, metadata, pallet) {
  return pallet === 'uniques'
    ? api.tx.uniques.setMetadata(collectionId, itemId, metadata, false)
    : api.tx.nfts.setMetadata(collectionId, itemId, metadata);
}

async function addAttribute(api, collectionId, itemId, key, value, pallet) {
  return pallet === 'uniques'
    ? api.tx.uniques.setAttribute(collectionId, itemId, key, value)
    : api.tx.nfts.setAttribute(collectionId, itemId, 'CollectionOwner', key, value);
}

async function signItem(api, signingPair, collectionId, itemId, metadata, attributes, newOwner) {
  const lastBlock = (await api.rpc.chain.getHeader()).number.toNumber();
  const deadline = lastBlock + 10 * 60 * 24 * 365; // one year from now

  const preSignedMint = api.createType('PalletNftsPreSignedMint', {
    collection: collectionId,
    item: itemId,
    attributes,
    metadata,
    onlyAccount: newOwner,
    deadline,
    mintPrice: null,
  });

  const dataHex = preSignedMint.toHex();
  const sig = signingPair.sign(dataHex);

  return {
    data: dataHex,
    signature: u8aToHex(sig),
  };
}

async function signAttribute(api, signingPair, collectionId, itemId, attributeKey, attributeValue) {
  const lastBlock = (await api.rpc.chain.getHeader()).number.toNumber();
  const deadline = lastBlock + 10 * 60 * 24 * 365; // one year from now

  const preSignedAttributes = api.createType('PalletNftsPreSignedAttributes', {
    collection: collectionId,
    item: itemId,
    attributes: [[attributeKey, attributeValue]],
    namespace: 'CollectionOwner',
    deadline,
  });

  const dataHex = preSignedAttributes.toHex();
  const sig = signingPair.sign(dataHex);

  return {
    data: dataHex,
    signature: u8aToHex(sig),
  };
}

main()
  .catch(console.error)
  .finally(() => process.exit());
