"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerpApi = void 0;
class SerpApi {
    constructor() {
        this.name = 'serpApi';
        this.displayName = 'SerpAPI';
        this.documentationUrl = 'serp';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                required: true,
                default: '',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                qs: {
                    api_key: '={{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: 'https://serpapi.com',
                url: '/account.json ',
            },
        };
    }
}
exports.SerpApi = SerpApi;
//# sourceMappingURL=SerpApi.credentials.js.map