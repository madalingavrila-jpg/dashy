"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDomainRestrictions = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const checkDomainRestrictions = (ctx, credentials, url, credentialsUrlKey = 'url') => {
    const allowedDomainsType = credentials.allowedHttpRequestDomains;
    const restrictedMessage = `Domain not allowed: This credential is restricted from accessing ${url}. `;
    if (allowedDomainsType === 'domains') {
        const allowedDomains = credentials.allowedDomains;
        if (!allowedDomains || allowedDomains.trim() === '') {
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'No allowed domains specified. Configure allowed domains or change restriction setting.');
        }
        if (!(0, n8n_workflow_1.isDomainAllowed)(url, { allowedDomains })) {
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), restrictedMessage + `Only the following domains are allowed: ${allowedDomains}`);
        }
    }
    if (allowedDomainsType === 'none' && credentials[credentialsUrlKey]) {
        if (url !== credentials[credentialsUrlKey]) {
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), restrictedMessage);
        }
    }
};
exports.checkDomainRestrictions = checkDomainRestrictions;
//# sourceMappingURL=checkDomainRestrictions.js.map