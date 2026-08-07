"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOAuthUrl = validateOAuthUrl;
const bad_request_error_1 = require("../errors/response-errors/bad-request.error");
const ALLOWED_OAUTH_URL_PROTOCOLS = ['http:', 'https:'];
function validateOAuthUrl(url) {
    const trimmed = url?.trim();
    if (!trimmed)
        return;
    let parsed;
    try {
        parsed = new URL(trimmed);
    }
    catch {
        throw new bad_request_error_1.BadRequestError('OAuth url is not a valid URL.');
    }
    if (!ALLOWED_OAUTH_URL_PROTOCOLS.includes(parsed.protocol)) {
        throw new bad_request_error_1.BadRequestError(`OAuth url must use HTTP or HTTPS protocol. Invalid protocol: ${parsed.protocol}`);
    }
}
//# sourceMappingURL=validate-oauth-url.js.map