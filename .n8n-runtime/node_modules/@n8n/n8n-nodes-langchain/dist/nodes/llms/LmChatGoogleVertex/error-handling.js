"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeErrorFromStatus = makeErrorFromStatus;
function makeErrorFromStatus(statusCode, context) {
    const errorMessages = {
        403: {
            message: 'Unauthorized for this project',
            description: 'Check your Google Cloud project ID, that your credential has access to that project and that billing is enabled',
        },
        404: {
            message: context?.modelName
                ? `No model found called '${context.modelName}'`
                : 'No model found',
        },
    };
    return errorMessages[statusCode];
}
//# sourceMappingURL=error-handling.js.map