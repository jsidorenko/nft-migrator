# NFT migrator

## Description

A set of tools to automate the migration of NFTs from the old Uniques pallet to the new NFTs pallet.

The migration process consists of multiple steps:
1) create a new collection in the nfts pallet using the same account that owns the old collection
2) the metadata of both collections should be equal
3) take a snapshot of the existing nfts and pre-sign it using the issuer's account
4) a generated snapshot file in JSON format needs to be uploaded to IPFS
5) store the hash of the generated snapshot file in the collection's attributes

Use scripts below to automate the steps 3-5.  
For the steps 1-2 and 5 use the [web app](https://github.com/jsidorenko/nft-migrator-ui).

## Installation

```bash
npm i
```

## Preparation

Fill in the .env file with the required data:
- `UNIQUES_COLLECTON_ID` - a collection ID in the `pallet-uniques`
- `NFTS_COLLECTON_ID` - a collection ID in the `pallet-nfts`
- `SIGNER_MNEMONIC` - a mnemonic phrase of the account that will create offchain signatures.
This account needs to have an `Admin` and an `Issuer` roles within specified `NFTS_COLLECTON_ID`  
You can generate a new one by running `npm run generate-account`.
- `FILEBASE_*` - we use the Filebase.com service to store the files on IPFS. A free account on that service will be sufficient.

## Usage

Generate the offchain signatures for all the items within the `UNIQUES_COLLECTON_ID`
```bash
npm run generate-sigs:all
```

Alternatively, generate the offchain signatures for the **unclaimed** items only within the `UNIQUES_COLLECTON_ID`
```bash
npm run generate-sigs:unclaimed-only
```

Upload the generated file to IPFS
```bash
npm run upload-to-ipfs
```

Store file's IPFS hash in collection's attributes.
It's recommended to store that information inside the original collection in the uniques pallet.
```bash
npm run store-in-uniques-attributes
```

In a case, the original collection is locked, it's possible to store the same information in the derivative collection.
```bash
$ npm run store-in-nfts-attributes
```

Note: you can use the [web app](https://github.com/jsidorenko/nft-migrator-ui) to store the IPFS hash in attributes.

## Generated JSON file's structure

After running a script the new json file will be generated and placed into the `data` folder.  
JSON file's structure:

```json
{
    "type": "uniques-to-nfts-migration",
    "runtimeVersion": 268,
    "date": 1690990519099,
    "sourceCollection": "0",
    "targetCollection": "0",
    "signer": "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL",
    "signatures": [
        {
            "data": "0x00000000020000000000011cbd2d43530a44705ad088af313e18f80b53ef16b36177cd4b77b846f2a5f07c0cf9500000",
            "signature": "0x123123"
        }
    ]
}
```

### Life hack
The `data` field inside the `signature` object is an encoded version of the `PalletNftsPreSignedMint` object
which is safe to pass via URL, and it's possible to reconstruct the initial object later in this way:
```javascript
const preSignedMint = api.createType('PalletNftsPreSignedMint', data);
console.log(preSignedMint.toJSON());
```

## Additional helpers
- `npm run generate-account` - generates a fresh new account 
- `npm run inspect-signer` - shows the signer's public address 
- `npm run inspect-generated-json` - shows the generated file's name and the IPFS hash 

## License

MIT
