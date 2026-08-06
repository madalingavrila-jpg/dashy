"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRegex = exports.splitByComma = void 0;
const splitByComma = (str) => {
    return str
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);
};
exports.splitByComma = splitByComma;
const parseRegex = (input) => {
    const regexMatch = (input || '').toString().match(new RegExp('^/(.*?)/([gimusy]*)$'));
    let regex;
    if (!regexMatch) {
        regex = new RegExp((input || '').toString());
    }
    else if (regexMatch.length === 1) {
        regex = new RegExp(regexMatch[1]);
    }
    else {
        regex = new RegExp(regexMatch[1], regexMatch[2]);
    }
    return regex;
};
exports.parseRegex = parseRegex;
//# sourceMappingURL=common.js.map