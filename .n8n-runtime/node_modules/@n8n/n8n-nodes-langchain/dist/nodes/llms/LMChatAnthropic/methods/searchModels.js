"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchModels = searchModels;
async function searchModels(filter) {
    const credentials = await this.getCredentials('anthropicApi');
    const baseURL = credentials.url ?? 'https://api.anthropic.com';
    const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'anthropicApi', {
        url: `${baseURL}/v1/models`,
        headers: {
            'anthropic-version': '2023-06-01',
        },
    }));
    const models = response.data || [];
    let results = [];
    if (filter) {
        for (const model of models) {
            if (model.id.toLowerCase().includes(filter.toLowerCase())) {
                results.push({
                    name: model.display_name,
                    value: model.id,
                });
            }
        }
    }
    else {
        results = models.map((model) => ({
            name: model.display_name,
            value: model.id,
        }));
    }
    results = results.sort((a, b) => {
        const modelA = models.find((m) => m.id === a.value);
        const modelB = models.find((m) => m.id === b.value);
        if (!modelA || !modelB)
            return 0;
        const dateA = new Date(modelA.created_at);
        const dateB = new Date(modelB.created_at);
        return dateB.getTime() - dateA.getTime();
    });
    return {
        results,
    };
}
//# sourceMappingURL=searchModels.js.map