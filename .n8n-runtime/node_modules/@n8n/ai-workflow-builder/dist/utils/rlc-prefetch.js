"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectRLCParametersForPrefetch = detectRLCParametersForPrefetch;
exports.prefetchRLCOptions = prefetchRLCOptions;
exports.formatPrefetchedOptionsForLLM = formatPrefetchedOptionsForLLM;
const validation_1 = require("../tools/helpers/validation");
function isRLCValueEmpty(value) {
    if (!value)
        return true;
    if (typeof value !== 'object')
        return false;
    const rlcValue = value;
    if (!rlcValue.__rl)
        return false;
    return !rlcValue.value || rlcValue.value === '';
}
function extractSearchMethod(nodeType, parameterPath) {
    const property = nodeType.properties.find((p) => p.name === parameterPath && p.type === 'resourceLocator');
    if (!property?.modes) {
        return null;
    }
    const listMode = property.modes.find((mode) => mode.type === 'list' && mode.typeOptions?.searchListMethod);
    return listMode?.typeOptions?.searchListMethod ?? null;
}
function nodeTypeRequiresCredentials(nodeType) {
    return Array.isArray(nodeType.credentials) && nodeType.credentials.length > 0;
}
function nodeHasCredentials(node) {
    return !!node.credentials && Object.keys(node.credentials).length > 0;
}
function detectRLCParametersForPrefetch(nodes, nodeTypes) {
    const result = [];
    for (const node of nodes) {
        const nodeType = (0, validation_1.findNodeType)(node.type, node.typeVersion, nodeTypes);
        if (!nodeType)
            continue;
        const requiresCredentials = nodeTypeRequiresCredentials(nodeType);
        const hasCredentials = nodeHasCredentials(node);
        if (requiresCredentials && !hasCredentials) {
            continue;
        }
        for (const property of nodeType.properties) {
            if (property.type !== 'resourceLocator')
                continue;
            const searchMethod = extractSearchMethod(nodeType, property.name);
            if (!searchMethod)
                continue;
            const isRequired = property.required === true;
            const isPrimaryResource = property.name.toLowerCase().includes('id') || property.name.toLowerCase().includes('name');
            if (!isRequired && !isPrimaryResource)
                continue;
            const currentValue = node.parameters?.[property.name];
            if (!isRLCValueEmpty(currentValue))
                continue;
            result.push({
                nodeId: node.id,
                nodeName: node.name,
                nodeType: node.type,
                nodeTypeVersion: node.typeVersion,
                parameterPath: property.name,
                searchMethod,
            });
            break;
        }
    }
    return result;
}
async function prefetchRLCOptions(parameters, nodes, resourceLocatorCallback, logger, timeoutMs = 15000) {
    if (parameters.length === 0) {
        return [];
    }
    const fetchPromises = parameters.map(async (param) => {
        const node = nodes.find((n) => n.id === param.nodeId);
        if (!node) {
            return {
                nodeId: param.nodeId,
                nodeName: param.nodeName,
                parameterPath: param.parameterPath,
                options: [],
                error: 'Node not found',
            };
        }
        try {
            const result = await Promise.race([
                resourceLocatorCallback(param.searchMethod, `parameters.${param.parameterPath}`, { name: param.nodeType, version: param.nodeTypeVersion }, node.parameters ?? {}, node.credentials, undefined),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs)),
            ]);
            return {
                nodeId: param.nodeId,
                nodeName: param.nodeName,
                parameterPath: param.parameterPath,
                options: result.results,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger?.warn('Failed to prefetch RLC options', {
                nodeId: param.nodeId,
                parameterPath: param.parameterPath,
                error: errorMessage,
            });
            return {
                nodeId: param.nodeId,
                nodeName: param.nodeName,
                parameterPath: param.parameterPath,
                options: [],
                error: errorMessage,
            };
        }
    });
    return await Promise.all(fetchPromises);
}
function formatPrefetchedOptionsForLLM(results) {
    if (results.length === 0) {
        return '';
    }
    const successfulResults = results.filter((r) => !r.error && r.options.length > 0);
    if (successfulResults.length === 0) {
        return '';
    }
    const parts = ['=== PRE-FETCHED RESOURCE LOCATOR PARAMETERS OPTIONS ==='];
    parts.push('');
    for (const result of successfulResults) {
        parts.push(`<resource_options node="${result.nodeName}" parameter="${result.parameterPath}">`);
        for (const opt of result.options) {
            parts.push('  <option>');
            parts.push(`    <display_name>${opt.name}</display_name>`);
            parts.push(`    <id>${String(opt.value)}</id>`);
            parts.push('  </option>');
        }
        parts.push('</resource_options>');
    }
    return parts.join('\n');
}
//# sourceMappingURL=rlc-prefetch.js.map