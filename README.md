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


## License

MIT
