"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatTriggerAuthorizationError = void 0;
const errors_1 = require("@n8n/errors");
class ChatTriggerAuthorizationError extends errors_1.ApplicationError {
    constructor(responseCode, message) {
        if (message === undefined) {
            message = 'Authorization problem!';
            if (responseCode === 401) {
                message = 'Authorization is required!';
            }
            else if (responseCode === 403) {
                message = 'Authorization data is wrong!';
            }
        }
        super(message);
        this.responseCode = responseCode;
    }
}
exports.ChatTriggerAuthorizationError = ChatTriggerAuthorizationError;
//# sourceMappingURL=error.js.map