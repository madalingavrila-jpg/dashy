"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupApiKeyAuthentication = setupApiKeyAuthentication;
const n8n_workflow_1 = require("n8n-workflow");
async function setupApiKeyAuthentication(credentialName) {
    try {
        const configCredentials = await this.getCredentials(credentialName);
        if (!configCredentials.apiKey) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'API Key is missing in the selected Azure OpenAI API credential. Please configure the API Key or choose Entra ID authentication.');
        }
        this.logger.info('Using API Key authentication for Azure OpenAI.');
        return {
            azureOpenAIApiKey: configCredentials.apiKey,
            azureOpenAIApiInstanceName: configCredentials.resourceName,
            azureOpenAIApiVersion: configCredentials.apiVersion,
            azureOpenAIEndpoint: configCredentials.endpoint,
        };
    }
    catch (error) {
        if (error instanceof n8n_workflow_1.OperationalError) {
            throw error;
        }
        this.logger.error(`Error setting up API Key authentication: ${error.message}`, error);
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Failed to retrieve API Key', error);
    }
}
//# sourceMappingURL=api-key.js.map