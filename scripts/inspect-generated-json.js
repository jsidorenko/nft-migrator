const fs = require('fs');
const Hash = require('ipfs-only-hash');

const env = {};
require('dotenv').config({ processEnv: env });

async function main() {
  const sourceCollection = env.UNIQUES_COLLECTON_ID;
  const targetCollection = env.NFTS_COLLECTON_ID;

  const filename = `signatures-uniques-${sourceCollection}-nfts-${targetCollection}.json`;
  const path = `./data/${filename}`;
  if (!fs.existsSync(path)) throw new Error('Unable to locate the JSON file');

  const data = fs.readFileSync(path);
  const cid = await Hash.of(data);

  console.log('Filename', filename);
  console.log('CID', cid);
  console.log(`https://ipfs.filebase.io/ipfs/${cid}`);
  console.log(`https://dweb.link/ipfs/${cid}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
