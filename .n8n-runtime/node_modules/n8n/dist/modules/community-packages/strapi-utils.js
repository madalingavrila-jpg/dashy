"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginatedRequest = paginatedRequest;
exports.buildStrapiUpdateQuery = buildStrapiUpdateQuery;
const backend_common_1 = require("@n8n/backend-common");
const di_1 = require("@n8n/di");
const axios_1 = __importDefault(require("axios"));
const n8n_core_1 = require("n8n-core");
const REQUEST_TIMEOUT_MS = 6000;
async function paginatedRequest(url, params, options) {
    let returnData = [];
    let responseData = [];
    do {
        let response;
        try {
            response = await axios_1.default.get(url, {
                headers: { 'Content-Type': 'application/json' },
                params,
                timeout: REQUEST_TIMEOUT_MS,
            });
        }
        catch (error) {
            di_1.Container.get(n8n_core_1.ErrorReporter).error(error, {
                tags: { source: 'communityNodesPaginatedRequest' },
            });
            di_1.Container.get(backend_common_1.Logger).error(`Error while fetching community nodes: ${error.message}`);
            if (options?.throwOnError)
                throw error;
            break;
        }
        responseData = response?.data?.data?.map((item) => ({ id: item.id, ...item.attributes }));
        if (!responseData?.length)
            break;
        returnData = returnData.concat(responseData);
        if (response?.data?.meta?.pagination) {
            const { page, pageCount } = response?.data.meta.pagination;
            if (page === pageCount)
                break;
        }
        params.pagination.page++;
    } while (responseData?.length);
    return returnData;
}
function buildStrapiUpdateQuery(ids) {
    return {
        filters: {
            id: {
                $in: ids,
            },
        },
    };
}
//# sourceMappingURL=strapi-utils.js.map