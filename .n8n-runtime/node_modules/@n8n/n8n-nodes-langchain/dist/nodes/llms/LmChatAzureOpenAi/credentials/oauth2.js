"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupOAuth2Authentication = setupOAuth2Authentication;
const identity_1 = require("@azure/identity");
const n8n_workflow_1 = require("n8n-workflow");
const N8nOAuth2TokenCredential_1 = require("./N8nOAuth2TokenCredential");
const AZURE_OPENAI_SCOPE = 'https://cognitiveservices.azure.com/.default';
async function setupOAuth2Authentication(credentialName) {
    try {
        const credential = await this.getCredentials(credentialName);
        const entraTokenCredential = new N8nOAuth2TokenCredential_1.N8nOAuth2TokenCredential(this.getNode(), credential);
        const deploymentDetails = await entraTokenCredential.getDeploymentDetails();
        const azureADTokenProvider = (0, identity_1.getBearerTokenProvider)(entraTokenCredential, AZURE_OPENAI_SCOPE);
        this.logger.debug('Successfully created Azure AD Token Provider.');
        return {
            azureADTokenProvider,
            azureOpenAIApiInstanceName: deploymentDetails.resourceName,
            azureOpenAIApiVersion: deploymentDetails.apiVersion,
            azureOpenAIEndpoint: deploymentDetails.endpoint,
        };
    }
    catch (error) {
        this.logger.error(`Error setting up Entra ID authentication: ${error.message}`, error);
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Error setting up Entra ID authentication: ${error.message}`, error);
    }
}
//# sourceMappingURL=oauth2.js.map