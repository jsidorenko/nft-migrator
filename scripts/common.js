function logJson(obj) {
  console.log(obj?.toJSON ? obj?.toJSON() : obj);
}

class BitFlags {
  flags;

  constructor(options) {
    this.flags = options.reduce(
      (memo, value, i) => ({
        [value]: 1 << i,
        ...memo,
      }),
      {},
    );
  }

  has(checkFlag, value) {
    return (value & this.flags[checkFlag]) === this.flags[checkFlag];
  }
}

exports = { logJson, BitFlags };
