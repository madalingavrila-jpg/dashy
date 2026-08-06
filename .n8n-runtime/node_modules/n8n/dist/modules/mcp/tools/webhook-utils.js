"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebhookDetails = exports.getTriggerDetails = exports.buildWebhookPath = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const mcp_typeguards_1 = require("../mcp.typeguards");
const buildWebhookPath = (segment, pathParam) => {
    let normalizedSegment = segment;
    while (normalizedSegment.startsWith('/'))
        normalizedSegment = normalizedSegment.slice(1);
    while (normalizedSegment.endsWith('/'))
        normalizedSegment = normalizedSegment.slice(0, -1);
    const basePath = normalizedSegment ? `/${normalizedSegment}/` : '/';
    return `${basePath}${pathParam}`;
};
exports.buildWebhookPath = buildWebhookPath;
const getTriggerDetails = async (user, supportedTriggers, baseUrl, credentialsService, endpoints) => {
    if (supportedTriggers.length === 0) {
        return 'This workflow does not have a trigger node that can be executed via MCP.';
    }
    const triggersByType = {
        [n8n_workflow_1.SCHEDULE_TRIGGER_NODE_TYPE]: [],
        [n8n_workflow_1.WEBHOOK_NODE_TYPE]: [],
        [n8n_workflow_1.FORM_TRIGGER_NODE_TYPE]: [],
        [n8n_workflow_1.CHAT_TRIGGER_NODE_TYPE]: [],
    };
    for (const trigger of supportedTriggers) {
        if (trigger.type in triggersByType) {
            triggersByType[trigger.type].push(trigger);
        }
    }
    const responses = ['This workflow has the following trigger(s):\n'];
    if (triggersByType[n8n_workflow_1.WEBHOOK_NODE_TYPE].length > 0) {
        const webhookDetails = await (0, exports.getWebhookDetails)(user, triggersByType[n8n_workflow_1.WEBHOOK_NODE_TYPE], baseUrl, credentialsService, endpoints);
        responses.push(webhookDetails);
    }
    if (triggersByType[n8n_workflow_1.CHAT_TRIGGER_NODE_TYPE].length > 0) {
        responses.push(getChatTriggerDetails(triggersByType[n8n_workflow_1.CHAT_TRIGGER_NODE_TYPE]));
    }
    if (triggersByType[n8n_workflow_1.SCHEDULE_TRIGGER_NODE_TYPE].length > 0) {
        responses.push(getScheduleTriggerDetails(triggersByType[n8n_workflow_1.SCHEDULE_TRIGGER_NODE_TYPE]));
    }
    if (triggersByType[n8n_workflow_1.FORM_TRIGGER_NODE_TYPE].length > 0) {
        responses.push(getFormTriggerDetails(triggersByType[n8n_workflow_1.FORM_TRIGGER_NODE_TYPE]));
    }
    return responses.join('\n\n');
};
exports.getTriggerDetails = getTriggerDetails;
const getScheduleTriggerDetails = (scheduleTriggers) => {
    const header = 'Schedule trigger(s):\n\n';
    const footer = '\n\nScheduled workflows can be executed directly through MCP clients and do not require external inputs.';
    const triggers = scheduleTriggers
        .map((node, index) => `
				<trigger ${index + 1}>
				\t - Node name: ${node.name}
				</trigger ${index + 1}>`)
        .join('\n\n');
    return header + triggers + footer;
};
const getFormTriggerDetails = (formTriggers) => {
    const header = 'Form trigger(s):\n\n';
    const footer = '\n\nUse the following input format when directly executing this workflow using any of the form triggers: { inputs { formData: Array<{ FIELD_NAME: VALUE }> } }';
    const triggers = formTriggers
        .map((node, index) => `
				<trigger ${index + 1}>
				\t - Node name: ${node.name}
				\t - Form fields: ${JSON.stringify(node.parameters.formFields ?? 'N/A')}
				</trigger ${index + 1}>`)
        .join('\n\n');
    return header + triggers + footer;
};
const getChatTriggerDetails = (chatTriggers) => {
    const header = 'Chat trigger(s):\n\n';
    const footer = '\n\nUse the following input format when directly executing this workflow using any of the chat triggers: { inputs { chatInput: <CHAT_MESSAGE_HERE> } }';
    const triggers = chatTriggers
        .map((node, index) => `
				<trigger ${index + 1}>
				\t - Node name: ${node.name}
				</trigger ${index + 1}>`)
        .join('\n\n');
    return header + triggers + footer;
};
const getWebhookDetails = async (user, webhookNodes, baseUrl, credentialsService, endpoints) => {
    const nodeDetails = await Promise.all(webhookNodes.map(async (node) => await collectWebhookNodeDetails(user, node, baseUrl, credentialsService, endpoints)));
    return formatWebhookDetails(nodeDetails);
};
exports.getWebhookDetails = getWebhookDetails;
const collectWebhookNodeDetails = async (user, node, baseUrl, credentialsService, endpoints) => {
    const pathParam = typeof node.parameters.path === 'string' ? node.parameters.path : '';
    const httpMethod = typeof node.parameters.httpMethod === 'string' ? node.parameters.httpMethod : 'GET';
    return {
        nodeName: node.name,
        baseUrl,
        productionPath: (0, exports.buildWebhookPath)(endpoints.webhook, pathParam),
        testPath: (0, exports.buildWebhookPath)(endpoints.webhookTest, pathParam),
        httpMethod,
        responseModeDescription: getResponseModeDescription(node),
        credentials: await resolveCredentialRequirement(user, node, credentialsService),
    };
};
const formatWebhookDetails = (details) => {
    const header = 'Webhook trigger(s):\n\n';
    const triggers = details
        .map((detail, index) => formatTriggerDescription(detail, index))
        .join('\n\n');
    return header + triggers;
};
const formatTriggerDescription = (detail, index) => `
				<trigger ${index + 1}>
				\t - Node name: ${detail.nodeName}
				\t - Base URL: ${detail.baseUrl}
				\t - Production path: ${detail.productionPath}
				\t - Test path: ${detail.testPath}
				\t - HTTP Method: ${detail.httpMethod}
				\t - Response Mode: ${detail.responseModeDescription}
				${formatCredentialRequirement(detail.credentials)}
				</trigger ${index + 1}>`;
const formatCredentialRequirement = (requirement) => {
    switch (requirement.type) {
        case 'basic':
            return '\t - Credentials: \n\t - This webhook requires basic authentication with a username and password that should be provided by the user.';
        case 'header':
            return `\t - Credentials: \n\t - This webhook requires a header with name "${requirement.headerName}" and a value that should be provided by the user.`;
        case 'jwt':
            if (requirement.variant === 'secret') {
                return '\t - Credentials: \n\t - This webhook requires a JWT secret that should be provided by the user.';
            }
            return '\t - Credentials: \n\t - This webhook requires JWT private and public keys that should be provided by the user.';
        default:
            return '\t - No credentials required for this webhook.';
    }
};
const resolveCredentialRequirement = async (user, node, credentialsService) => {
    const authType = typeof node.parameters.authentication === 'string' ? node.parameters.authentication : undefined;
    switch (authType) {
        case 'basicAuth':
            return { type: 'basic' };
        case 'headerAuth': {
            const headerName = await getHeaderAuthName(user, node, credentialsService);
            if (headerName) {
                return { type: 'header', headerName };
            }
            break;
        }
        case 'jwtAuth': {
            const variant = await getJWTAuthVariant(user, node, credentialsService);
            if (variant) {
                return { type: 'jwt', variant };
            }
            break;
        }
    }
    return { type: 'none' };
};
const getHeaderAuthName = async (user, node, credentialsService) => {
    const id = node.credentials?.httpHeaderAuth?.id;
    if (!id)
        return null;
    const creds = await credentialsService.getOne(user, id, true);
    if ((0, mcp_typeguards_1.hasHttpHeaderAuthDecryptedData)(creds)) {
        return creds.data.name;
    }
    return null;
};
const getJWTAuthVariant = async (user, node, credentialsService) => {
    const id = node.credentials?.jwtAuth?.id;
    if (!id)
        return null;
    try {
        const creds = await credentialsService.getOne(user, id, true);
        if ((0, mcp_typeguards_1.hasJwtSecretDecryptedData)(creds)) {
            return 'secret';
        }
        else if ((0, mcp_typeguards_1.hasJwtPemKeyDecryptedData)(creds)) {
            return 'pem-key';
        }
    }
    catch {
        return null;
    }
    return null;
};
const getResponseModeDescription = (node) => {
    const responseMode = typeof node.parameters.responseMode === 'string' ? node.parameters.responseMode : undefined;
    if (responseMode === 'responseNode') {
        return 'Webhook is configured to respond using "Respond to Webhook" node.';
    }
    if (responseMode === 'lastNode') {
        const responseData = typeof node.parameters.responseData === 'string' ? node.parameters.responseData : undefined;
        const base = 'Webhook is configured to respond when the last node is executed. ';
        switch (responseData) {
            case 'allEntries':
                return base + 'Returns all the entries of the last node. Always returns an array.';
            case 'firstEntryBinary':
                return (base +
                    'Returns the binary data of the first entry of the last node. Always returns a binary file.');
            case 'noData':
                return base + 'Returns without a body.';
            default:
                return (base +
                    'Returns the JSON data of the first entry of the last node. Always returns a JSON object.');
        }
    }
    return 'Webhook is configured to respond immediately with the message "Workflow got started."';
};
//# sourceMappingURL=webhook-utils.js.map