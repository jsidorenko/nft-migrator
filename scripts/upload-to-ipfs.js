const fs = require('fs');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const env = {};
require('dotenv').config({ processEnv: env });

async function main() {
  const sourceCollection = env.UNIQUES_COLLECTON_ID;
  const targetCollection = env.NFTS_COLLECTON_ID;

  const filename = `signatures-uniques-${sourceCollection}-nfts-${targetCollection}.json`;
  const path = `./data/${filename}`;
  if (!fs.existsSync(path)) throw new Error('Unable to locate the JSON file');

  const s3 = new S3Client({
    endpoint: 'https://s3.filebase.com',
    region: env.FILEBASE_REGION,
    credentials: {
      accessKeyId: env.FILEBASE_ACCESS_KEY,
      secretAccessKey: env.FILEBASE_SECRET_KEY,
    },
  });

  const data = fs.readFileSync(path);

  const commandPutObject = new PutObjectCommand({
    Bucket: env.FILEBASE_BUCKET,
    Key: filename,
    Metadata: {
      description: `Migration data from uniques:${sourceCollection} to nfts:${targetCollection} collection`,
      sourceCollection,
      targetCollection,
    },
    Body: data,
  });

  console.log('Uploading to Filebase...');
  await s3.send(commandPutObject);

  const commandGetObject = new GetObjectCommand({
    Bucket: env.FILEBASE_BUCKET,
    Key: filename,
  });
  const response = await s3.send(commandGetObject);

  console.log('Uploaded!');
  console.log('');
  console.log('Filename', filename);
  console.log('CID', response.Metadata?.cid);
  console.log(`https://ipfs.filebase.io/ipfs/${response.Metadata?.cid}`);
  console.log(`https://dweb.link/ipfs/${response.Metadata?.cid}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
