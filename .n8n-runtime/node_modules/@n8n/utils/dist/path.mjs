//#region src/files/path.ts
/**
* Fast check if file path starts with a windows drive letter, e.g. 'C:/' or 'C:\\'
*/
function isWindowsFilePath(str) {
	return /^[a-zA-Z]:[\\/]/.test(str);
}

//#endregion
export { isWindowsFilePath as t };
//# sourceMappingURL=path.mjs.map