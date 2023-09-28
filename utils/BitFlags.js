class BitFlags {
  flags;
  reverse;

  static toBitFlag(values, reverseLogic = false) {
    const bitFlag = values
      .map((value) => (reverseLogic ? +!value : +value))
      .reverse()
      .join('');

    return parseInt(bitFlag, 2);
  }

  constructor(options, reverse = false) {
    this.reverse = reverse;
    this.flags = options.reduce((memo, value, i) => {
      memo.set(value, 1 << i);
      return memo;
    }, new Map());
  }

  has(checkFlag, value) {
    if (!this.flags.has(checkFlag)) {
      throw new Error('Incorrect option provided');
    }

    const result = (value & this.flags.get(checkFlag)) === this.flags.get(checkFlag);
    return this.reverse ? !result : result;
  }
}

module.exports = exports = BitFlags;
