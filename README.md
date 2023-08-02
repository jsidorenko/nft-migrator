# NFT migrator

## Description

NFT migrator helps to migrate the NFTs from the old Uniques pallet to the new NFTs pallet.
The migration process consists of multiple steps:
1) a new collection's creation in the nfts pallet using the same account that owns the old collection
2) setting the same collection metadata as in the old collection
3) taking a snapshot of the existing nfts and pre-signing them using the admin's/issuer's account by using this script 


## Installation

```bash
$ npm i
```

## Preparation

Fill in the .env file with the required data:
- `UNIQUES_COLLECTON_ID` - a collection ID in the `pallet-uniques`
- `NFTS_COLLECTON_ID` - a collection ID in the `pallet-nfts`
- `SIGNER_MNEMONIC` - a mnemonic phrase of the account that will create offchain signatures.
This account needs to have an `Admin` and an `Issuer` roles within specified `NFTS_COLLECTON_ID`  
You can generate one by running `npm run generate-account`

## Usage

Create the offchain signatures for all the items within the `UNIQUES_COLLECTON_ID`
```bash
$ npm run generate-sigs:all
```

Create the offchain signatures for *unclaimed* items within the `UNIQUES_COLLECTON_ID`
```bash
$ npm run generate-sigs:unclaimed-only
```

## Output

After running a script the new json file will be generated and placed into the `data` folder.  
JSON file's structure:

```json
{
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
which is safe to pass via URL, and it's possible to reconstruct the initial object in this way:
```javascript
const preSignedMint = api.createType('PalletNftsPreSignedMint', data);
console.log(preSignedMint.toJSON());
```

## License

MIT
