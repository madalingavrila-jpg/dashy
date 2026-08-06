
//#region src/files/path.ts
/**
* Fast check if file path starts with a windows drive letter, e.g. 'C:/' or 'C:\\'
*/
function isWindowsFilePath(str) {
	return /^[a-zA-Z]:[\\/]/.test(str);
}

//#endregion
Object.defineProperty(exports, 'isWindowsFilePath', {
  enumerable: true,
  get: function () {
    return isWindowsFilePath;
  }
});
//# sourceMappingURL=path.cjs.map