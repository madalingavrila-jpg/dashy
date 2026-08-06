"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchModels = searchModels;
const openai_1 = __importDefault(require("openai"));
const modelFiltering_1 = require("../../../vendors/OpenAi/helpers/modelFiltering");
const ai_utilities_1 = require("@n8n/ai-utilities");
const di_1 = require("@n8n/di");
const config_1 = require("@n8n/config");
async function searchModels(filter) {
    const credentials = await this.getCredentials('openAiApi');
    const baseURL = this.getNodeParameter('options.baseURL', '') ||
        credentials.url ||
        'https://api.openai.com/v1';
    const { openAiDefaultHeaders: defaultHeaders } = di_1.Container.get(config_1.AiConfig);
    const openai = new openai_1.default({
        baseURL,
        apiKey: credentials.apiKey,
        fetchOptions: {
            dispatcher: (0, ai_utilities_1.getProxyAgent)(baseURL),
        },
        defaultHeaders,
    });
    const { data: models = [] } = await openai.models.list();
    const url = baseURL && new URL(baseURL);
    const isCustomAPI = !!(url && !['api.openai.com', 'ai-assistant.n8n.io'].includes(url.hostname));
    const filteredModels = models.filter((model) => {
        const includeModel = (0, modelFiltering_1.shouldIncludeModel)(model.id, isCustomAPI);
        if (!filter)
            return includeModel;
        return includeModel && model.id.toLowerCase().includes(filter.toLowerCase());
    });
    filteredModels.sort((a, b) => a.id.localeCompare(b.id));
    return {
        results: filteredModels.map((model) => ({
            name: model.id,
            value: model.id,
        })),
    };
}
//# sourceMappingURL=loadModels.js.map