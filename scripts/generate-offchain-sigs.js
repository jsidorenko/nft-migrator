const fs = require('fs');
const { Keyring } = require('@polkadot/keyring');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { u8aToHex } = require('@polkadot/util');
const { initNftBitFlags } = require('../utils/common');

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

async function signItems(api, signingPair, signSourceNfts, metadata, targetCollection) {
  const lastBlock = (await api.rpc.chain.getHeader()).number.toNumber();
  const deadline = lastBlock + 10 * 60 * 24 * 365; // one year from now

  const sigs = signSourceNfts.map(({ id, owner }, i) => {
    const preSignedMint = api.createType('PalletNftsPreSignedMint', {
      collection: targetCollection,
      item: id,
      attributes: [],
      metadata: metadata[i]?.unwrapOr(null)?.data.toPrimitive(),
      onlyAccount: owner,
      deadline,
      mintPrice: null,
    });

    const dataHex = preSignedMint.toHex();
    const sig = signingPair.sign(dataHex);

    return {
      data: dataHex,
      signature: u8aToHex(sig),
    };
  });

  return sigs;
}

function storeSignatures(signatures, signer, runtimeVersion, sourceCollection, targetCollection) {
  const data = {
    type: 'uniques-to-nfts-migration',
    runtimeVersion,
    date: +new Date(),
    sourceCollection,
    targetCollection,
    signer,
    signatures,
  };
  fs.writeFileSync(
    `./data/signatures-uniques-${sourceCollection}-nfts-${targetCollection}.json`,
    JSON.stringify(data, null, '\t'),
  );
}

async function main() {
  const { api, keyring, signingPair } = await connect();

  // get the collection ids
  const sourceCollection = env.UNIQUES_COLLECTON_ID;
  const targetCollection = env.NFTS_COLLECTON_ID;
  const signerAddress = keyring.encodeAddress(signingPair.publicKey, api.registry.chainSS58);

  // load the main info + metadata
  const [sourceCollectionDetails, sourceCollectionMetadata, targetCollectionDetails, targetCollectionMetadata] =
    await api
      .queryMulti([
        [api.query.uniques.class, sourceCollection],
        [api.query.uniques.classMetadataOf, sourceCollection],
        [api.query.nfts.collection, targetCollection],
        [api.query.nfts.collectionMetadataOf, targetCollection],
      ])
      .then((result) => result.map((el) => el.unwrapOr(null)));

  if (!sourceCollectionDetails) {
    throw new Error('Source collection doesn`t exist');
  }
  if (!targetCollectionDetails) {
    throw new Error('Target collection doesn`t exist');
  }

  // validate the owner and the metadata are the same
  if (sourceCollectionDetails.owner.toString() !== targetCollectionDetails.owner.toString())
    throw new Error('Owners of both collections should be the same');
  if (sourceCollectionMetadata?.data.toString() !== targetCollectionMetadata?.data.toString())
    throw new Error('The metadata of both collections should be the same');

  console.info('+ Collections loaded');

  // validate the provided account has Admin/Issuer rights
  const roles = initNftBitFlags(api, 'PalletNftsCollectionRole');
  const accountRoles = (await api.query.nfts.collectionRoleOf(targetCollection, signerAddress))
    .unwrapOrDefault()
    .toNumber();

  if (!roles.has('Admin', accountRoles) || !roles.has('Issuer', accountRoles))
    throw new Error('An account must be an admin and an issuer of the target collection');

  console.info('+ Permissions validated');

  // load all the nfts from the uniques pallet
  const sourceNfts = await api.query.uniques.asset.entries(sourceCollection).then((results) =>
    results.map(
      ([
        {
          args: [, nftId],
        },
        data,
      ]) => ({
        id: nftId.toString(),
        owner: data.unwrap().owner.toString(),
      }),
    ),
  );

  let signSourceNfts = [...sourceNfts];
  if (env.UNCLAIMED === '1') {
    // load all the claimed nfts
    const claimedNfts = await api.query.nfts.item
      .keys(targetCollection)
      .then((results) => results.map(({ args: [, nftId] }) => nftId.toString()));

    // filter out the claimed ones
    signSourceNfts = signSourceNfts.filter(({ id }) => !claimedNfts.includes(id));
  }

  if (signSourceNfts.length === 0) throw new Error('No items found to sign');

  // load items metadata
  const metadata = await api.query.uniques.instanceMetadataOf.multi(
    signSourceNfts.map(({ id }) => [sourceCollection, id]),
  );

  console.info(`> Preparing to sign ${signSourceNfts.length} item(s)`);

  const sigs = await signItems(api, signingPair, signSourceNfts, metadata, targetCollection);
  console.info(`+ Signatures created`);

  const runtimeVersion = api.runtimeVersion.specVersion.toPrimitive();
  storeSignatures(sigs, signerAddress, runtimeVersion, sourceCollection, targetCollection);
  console.info(`Done!`);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
