"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileLocation = exports.exists = exports.assertDir = void 0;
exports.isStoredMode = isStoredMode;
exports.streamToBuffer = streamToBuffer;
exports.binaryToBuffer = binaryToBuffer;
const n8n_workflow_1 = require("n8n-workflow");
var backend_common_1 = require("@n8n/backend-common");
Object.defineProperty(exports, "assertDir", { enumerable: true, get: function () { return backend_common_1.assertDir; } });
Object.defineProperty(exports, "exists", { enumerable: true, get: function () { return backend_common_1.exists; } });
const STORED_MODES = ['filesystem', 'filesystem-v2', 's3', 'database'];
function isStoredMode(mode) {
    return STORED_MODES.includes(mode);
}
async function streamToBuffer(stream) {
    return await new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.once('error', (cause) => {
            if ('code' in cause && cause.code === 'Z_DATA_ERROR')
                reject(new n8n_workflow_1.UnexpectedError('Failed to decompress response', { cause }));
            else
                reject(cause);
        });
    });
}
async function binaryToBuffer(body) {
    if (Buffer.isBuffer(body))
        return body;
    return await streamToBuffer(body);
}
exports.FileLocation = {
    ofExecution: (workflowId, executionId) => ({
        type: 'execution',
        workflowId,
        executionId,
    }),
    ofCustom: ({ pathSegments, sourceType, sourceId, }) => ({
        type: 'custom',
        pathSegments,
        sourceType,
        sourceId,
    }),
};
//# sourceMappingURL=utils.js.map