
//#region src/assert.ts
/**
* Asserts given condition
*/
function assert(condition, message) {
	if (!condition) throw new Error(message ?? "Assertion failed");
}

//#endregion
Object.defineProperty(exports, 'assert', {
  enumerable: true,
  get: function () {
    return assert;
  }
});
//# sourceMappingURL=assert2.cjs.map