"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureOpenAiApi = void 0;
class AzureOpenAiApi {
    constructor() {
        this.name = 'azureOpenAiApi';
        this.displayName = 'Azure Open AI';
        this.documentationUrl = 'azureopenai';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                required: true,
                default: '',
            },
            {
                displayName: 'Resource Name',
                name: 'resourceName',
                type: 'string',
                required: true,
                default: '',
            },
            {
                displayName: 'API Version',
                name: 'apiVersion',
                type: 'string',
                required: true,
                default: '2025-03-01-preview',
            },
            {
                displayName: 'Endpoint',
                name: 'endpoint',
                type: 'string',
                default: undefined,
                placeholder: 'https://westeurope.api.cognitive.microsoft.com',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    'api-key': '={{$credentials.apiKey}}',
                },
            },
        };
    }
}
exports.AzureOpenAiApi = AzureOpenAiApi;
//# sourceMappingURL=AzureOpenAiApi.credentials.js.map