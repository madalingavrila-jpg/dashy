"use strict";
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Z = void 0;
const zod_1 = require("zod");
exports.Z = {
    class: (shape) => {
        var _a;
        const schema = zod_1.z.object(shape);
        const DtoClass = (_a = class {
                constructor(data) {
                    const parsed = schema.parse(data);
                    Object.assign(this, parsed);
                }
                static safeParse(data) {
                    return schema.safeParse(data);
                }
                static parse(data) {
                    return schema.parse(data);
                }
                static extend(additionalShape) {
                    return exports.Z.class({ ...shape, ...additionalShape });
                }
            },
            __setFunctionName(_a, "DtoClass"),
            _a.schema = schema,
            _a);
        return DtoClass;
    },
};
//# sourceMappingURL=zod-class.js.map