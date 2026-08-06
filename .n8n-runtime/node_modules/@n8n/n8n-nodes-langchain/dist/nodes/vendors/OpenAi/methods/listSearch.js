"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileSearch = fileSearch;
exports.modelSearch = modelSearch;
exports.videoModelSearch = videoModelSearch;
exports.imageModelSearch = imageModelSearch;
exports.assistantSearch = assistantSearch;
const modelFiltering_1 = require("../helpers/modelFiltering");
const transport_1 = require("../transport");
async function fileSearch(filter) {
    const { data } = await transport_1.apiRequest.call(this, 'GET', '/files');
    if (filter) {
        const results = [];
        for (const file of data || []) {
            if (file.filename?.toLowerCase().includes(filter.toLowerCase())) {
                results.push({
                    name: file.filename,
                    value: file.id,
                });
            }
        }
        return {
            results,
        };
    }
    else {
        return {
            results: (data || []).map((file) => ({
                name: file.filename,
                value: file.id,
            })),
        };
    }
}
const getModelSearch = (filterCondition) => async (ctx, filter) => {
    let { data } = (await transport_1.apiRequest.call(ctx, 'GET', '/models'));
    data = data?.filter((model) => filterCondition(model));
    let results = [];
    if (filter) {
        for (const model of data || []) {
            if (model.id?.toLowerCase().includes(filter.toLowerCase())) {
                results.push({
                    name: model.id.toUpperCase(),
                    value: model.id,
                });
            }
        }
    }
    else {
        results = (data || []).map((model) => ({
            name: model.id.toUpperCase(),
            value: model.id,
        }));
    }
    results = results.sort((a, b) => a.name.localeCompare(b.name));
    return {
        results,
    };
};
async function modelSearch(filter) {
    const credentials = await this.getCredentials('openAiApi');
    const url = credentials.url && new URL(credentials.url);
    const isCustomAPI = !!(url && !['api.openai.com', 'ai-assistant.n8n.io'].includes(url.hostname));
    return await getModelSearch((model) => (0, modelFiltering_1.shouldIncludeModel)(model.id, isCustomAPI))(this, filter);
}
async function videoModelSearch(filter) {
    return await getModelSearch((model) => model.id.includes('sora'))(this, filter);
}
async function imageModelSearch(filter) {
    return await getModelSearch((model) => model.id.includes('vision') || model.id.includes('gpt-4o'))(this, filter);
}
async function assistantSearch(filter, paginationToken) {
    const { data, has_more, last_id } = (await transport_1.apiRequest.call(this, 'GET', '/assistants', {
        headers: {
            'OpenAI-Beta': 'assistants=v2',
        },
        qs: {
            limit: 100,
            after: paginationToken,
        },
    }));
    if (has_more) {
        paginationToken = last_id;
    }
    else {
        paginationToken = undefined;
    }
    if (filter) {
        const results = [];
        for (const assistant of data || []) {
            if (assistant.name?.toLowerCase().includes(filter.toLowerCase())) {
                results.push({
                    name: assistant.name,
                    value: assistant.id,
                });
            }
        }
        return {
            results,
        };
    }
    else {
        return {
            results: (data || []).map((assistant) => ({
                name: assistant.name ?? assistant.id,
                value: assistant.id,
            })),
            paginationToken,
        };
    }
}
//# sourceMappingURL=listSearch.js.map