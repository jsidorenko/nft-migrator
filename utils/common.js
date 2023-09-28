const { getTypeDef } = require('@polkadot/types');
const BitFlags = require('./BitFlags');

function logJson(obj) {
  console.log(obj?.toJSON ? obj?.toJSON() : obj);
}

function getEnumOptions(api, typeName) {
  const { sub } = getTypeDef(api.createType(typeName).toRawType());
  if (!sub || !Array.isArray(sub)) return [];

  return sub
    .sort((a, b) => Number(a.index) - Number(b.index))
    .filter(({ name }) => name && !name.startsWith('__Unused'))
    .map(({ name }) => name);
}

function isBitFlagsLogicReverted(typeName) {
  let isLogicRevered = false;

  switch (typeName) {
    case 'PalletNftsItemSetting':
    case 'PalletNftsCollectionSetting':
      isLogicRevered = true;
      break;
    case 'PalletNftsCollectionRole':
      break;
    default:
      throw new Error('Unsupported type provided for NftBitFlags');
  }

  return isLogicRevered;
}

function initNftBitFlags(api, typeName) {
  const allOptions = getEnumOptions(api, typeName);
  const isLogicRevered = isBitFlagsLogicReverted(typeName);
  return new BitFlags(allOptions, isLogicRevered);
}

function valuesToNftBitFlags(values, typeName) {
  const isLogicRevered = isBitFlagsLogicReverted(typeName);
  return BitFlags.toBitFlag(values, isLogicRevered);
}

module.exports = exports = { logJson, initNftBitFlags, valuesToNftBitFlags };
