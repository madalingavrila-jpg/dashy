"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageFormatter = void 0;
class MessageFormatter {
    static formatToolResult(result) {
        if (typeof result === 'object' && result !== null) {
            return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        }
        if (typeof result === 'string') {
            return { content: [{ type: 'text', text: result }] };
        }
        if (result === null || result === undefined) {
            return { content: [{ type: 'text', text: String(result) }] };
        }
        if (typeof result === 'number' || typeof result === 'boolean' || typeof result === 'bigint') {
            return { content: [{ type: 'text', text: result.toString() }] };
        }
        return {
            content: [
                { type: 'text', text: String(result) },
            ],
        };
    }
    static formatError(error) {
        const errorDetails = [`${error.name}: ${error.message}`];
        if (error.stack) {
            errorDetails.push(error.stack);
        }
        return {
            isError: true,
            content: [{ type: 'text', text: errorDetails.join('\n') }],
        };
    }
}
exports.MessageFormatter = MessageFormatter;
//# sourceMappingURL=MessageFormatter.js.map