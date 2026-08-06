"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8nOAuth2TokenCredential = void 0;
const client_oauth2_1 = require("@n8n/client-oauth2");
const n8n_workflow_1 = require("n8n-workflow");
class N8nOAuth2TokenCredential {
    constructor(node, credential) {
        this.node = node;
        this.credential = credential;
    }
    async getToken() {
        try {
            if (!this.credential?.oauthTokenData?.access_token) {
                throw new n8n_workflow_1.NodeOperationError(this.node, 'Failed to retrieve access token');
            }
            const oAuthClient = new client_oauth2_1.ClientOAuth2({
                clientId: this.credential.clientId,
                clientSecret: this.credential.clientSecret,
                accessTokenUri: this.credential.accessTokenUrl,
                scopes: this.credential.scope?.split(' '),
                authentication: this.credential.authentication,
                authorizationUri: this.credential.authUrl,
                additionalBodyProperties: {
                    resource: 'https://cognitiveservices.azure.com/',
                },
            });
            const token = await oAuthClient.credentials.getToken();
            const data = token.data;
            return {
                token: data.access_token,
                expiresOnTimestamp: data.expires_on,
            };
        }
        catch (error) {
            throw new n8n_workflow_1.NodeOperationError(this.node, 'Failed to retrieve OAuth2 access token', error);
        }
    }
    async getDeploymentDetails() {
        return {
            apiVersion: this.credential.apiVersion,
            endpoint: this.credential.endpoint,
            resourceName: this.credential.resourceName,
        };
    }
}
exports.N8nOAuth2TokenCredential = N8nOAuth2TokenCredential;
//# sourceMappingURL=N8nOAuth2TokenCredential.js.map