"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelSearch = modelSearch;
exports.audioModelSearch = audioModelSearch;
exports.imageGenerationModelSearch = imageGenerationModelSearch;
exports.imageEditModelSearch = imageEditModelSearch;
exports.videoGenerationModelSearch = videoGenerationModelSearch;
const transport_1 = require("../transport");
async function baseModelSearch(modelFilter, filter) {
    const response = (await transport_1.apiRequest.call(this, 'GET', '/v1beta/models', {
        qs: {
            pageSize: 1000,
        },
    }));
    let models = response.models.filter((model) => modelFilter(model.name));
    if (filter) {
        models = models.filter((model) => model.name.toLowerCase().includes(filter.toLowerCase()));
    }
    return {
        results: models.map((model) => ({ name: model.name, value: model.name })),
    };
}
async function modelSearch(filter) {
    return await baseModelSearch.call(this, (model) => !model.includes('embedding') &&
        !model.includes('aqa') &&
        !model.includes('image') &&
        !model.includes('vision') &&
        !model.includes('veo') &&
        !model.includes('audio') &&
        !model.includes('tts'), filter);
}
async function audioModelSearch(filter) {
    return await baseModelSearch.call(this, (model) => !model.includes('embedding') &&
        !model.includes('aqa') &&
        !model.includes('image') &&
        !model.includes('vision') &&
        !model.includes('veo') &&
        !model.includes('tts'), filter);
}
async function imageGenerationModelSearch(filter) {
    const rawResult = await baseModelSearch.call(this, (model) => model.includes('image'));
    let results = rawResult.results.map((r) => {
        if (r.name.includes('gemini-2.5-flash-image')) {
            return { name: `${r.name} (Nano Banana)`, value: r.value };
        }
        if (r.name.includes('gemini-3-pro-image')) {
            return { name: `${r.name} (Nano Banana Pro)`, value: r.value };
        }
        return r;
    });
    if (filter) {
        const filterLowerCase = filter.toLowerCase();
        results = results.filter((r) => r.name.toLowerCase().includes(filterLowerCase));
    }
    return {
        results,
    };
}
async function imageEditModelSearch(filter) {
    const result = await imageGenerationModelSearch.call(this, filter);
    return {
        results: result.results.filter((r) => r.name.toLowerCase().includes('nano banana')),
    };
}
async function videoGenerationModelSearch(filter) {
    return await baseModelSearch.call(this, (model) => model.includes('veo'), filter);
}
//# sourceMappingURL=listSearch.js.map