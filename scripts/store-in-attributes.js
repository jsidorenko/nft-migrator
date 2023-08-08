const fs = require('fs');
const { Keyring } = require('@polkadot/keyring');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { u8aToHex } = require('@polkadot/util');
const Hash = require('ipfs-only-hash');
const { BitFlags } = require('./common');

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
  const pallet = env.PALLET ?? 'uniques';

  // get the collection ids
  const sourceCollection = env.UNIQUES_COLLECTON_ID;
  const targetCollection = env.NFTS_COLLECTON_ID;
  const signerAddress = keyring.encodeAddress(signingPair.publicKey, api.registry.chainSS58);

  // validate the signatures file exists
  const filename = `signatures-uniques-${sourceCollection}-nfts-${targetCollection}.json`;
  const path = `./data/${filename}`;
  if (!fs.existsSync(path)) throw new Error('Unable to locate the JSON file');

  // load the main info
  const [sourceCollectionDetails, sourceCollectionMetadata, targetCollectionConfig] = await api
    .queryMulti([
      [api.query.uniques.class, sourceCollection],
      [api.query.uniques.classMetadataOf, sourceCollection],
      [api.query.nfts.collectionConfigOf, targetCollection],
    ])
    .then((result) => result.map((el) => el.unwrapOr(null)));

  // validate the provided account has permissions to update the attributes
  if (pallet === 'uniques') {
    if (!sourceCollectionDetails.owner.eq(signerAddress))
      throw new Error('The provided account should be the owner of the source collection');

    if (sourceCollectionMetadata?.isFrozen.eq(true))
      throw new Error('The source collection is frozen, no new attributes can be added');
  } else {
    const roles = new BitFlags(['Issuer', 'Freezer', 'Admin']);
    const accountRoles = (await api.query.nfts.collectionRoleOf(targetCollection, signerAddress))
      .unwrapOrDefault()
      .toNumber();
    if (!roles.has('Admin', accountRoles))
      throw new Error('The provided account must be an admin of the target collection');

    const settings = new BitFlags([
      'TransferableItems',
      'UnlockedMetadata',
      'UnlockedAttributes',
      'UnlockedMaxSupply',
      'DepositRequired',
    ]);
    if (!settings.has('UnlockedAttributes', targetCollectionConfig.settings)) {
      throw new Error('The target collection is locked, no new attributes can be added');
    }
  }

  // get migration file's CID
  const data = fs.readFileSync(path);
  const cid = await Hash.of(data);

  // prepare the extrinsics
  const txs = [];
  const attribute_cid_key = 'offchain-mint';
  const attribute_cid_value = `ipfs://ipfs/${cid}`;
  const attribute_provider_key = 'offchain-mint-ipfs-provider';
  const attribute_provider_value = env.IPFS_GATEWAY ?? 'filebase';
  if (pallet === 'uniques') {
    txs.push(api.tx.uniques.setAttribute(sourceCollection, null, attribute_cid_key, attribute_cid_value));
    txs.push(api.tx.uniques.setAttribute(sourceCollection, null, attribute_provider_key, attribute_provider_value));
  } else {
    const namespace = 'CollectionOwner';
    txs.push(api.tx.nfts.setAttribute(sourceCollection, null, namespace, attribute_cid_key, attribute_cid_value));
    txs.push(
      api.tx.nfts.setAttribute(sourceCollection, null, namespace, attribute_provider_key, attribute_provider_value),
    );
  }

  // submit the transaction
  const txBatch = api.tx.utility.batchAll(txs);
  const tx = await txBatch.signAndSend(signingPair);
  console.info('Transaction submitted!');
  console.info('Hash', tx.toString());
}

main()
  .catch(console.error)
  .finally(() => process.exit());
