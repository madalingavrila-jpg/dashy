"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredToolkit = void 0;
const tools_1 = require("@langchain/core/tools");
class StructuredToolkit extends tools_1.BaseToolkit {
    constructor(tools) {
        super();
        this.tools = tools;
    }
    getTools() {
        return this.tools;
    }
}
exports.StructuredToolkit = StructuredToolkit;
//# sourceMappingURL=ai-tool-types.js.map