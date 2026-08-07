
//#region src/number/smartDecimal.ts
const smartDecimal = (value, decimals = 2) => {
	if (Number.isInteger(value)) return value;
	if (value.toString().split(".")[1].length <= decimals) return value;
	return Number(value.toFixed(decimals));
};

//#endregion
Object.defineProperty(exports, 'smartDecimal', {
  enumerable: true,
  get: function () {
    return smartDecimal;
  }
});
//# sourceMappingURL=smartDecimal.cjs.map