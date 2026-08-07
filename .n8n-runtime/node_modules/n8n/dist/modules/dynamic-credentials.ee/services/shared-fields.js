"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSharedFields = extractSharedFields;
const di_1 = require("@n8n/di");
const n8n_workflow_1 = require("n8n-workflow");
const credential_types_1 = require("../../../credential-types");
function getExtendedProps(type, credentialTypes) {
    const props = [];
    for (const parentTypeName of type.extends ?? []) {
        const parentType = credentialTypes.getByName(parentTypeName);
        const parentProps = getExtendedProps(parentType, credentialTypes);
        n8n_workflow_1.NodeHelpers.mergeNodeProperties(props, parentProps);
    }
    n8n_workflow_1.NodeHelpers.mergeNodeProperties(props, type.properties);
    return props;
}
function extractSharedFields(credentialType) {
    const credentialTypes = di_1.Container.get(credential_types_1.CredentialTypes);
    const mergedProperties = getExtendedProps(credentialType, credentialTypes);
    const sharedFields = [];
    for (const property of mergedProperties) {
        if (property.resolvableField !== true) {
            sharedFields.push(property.name);
        }
    }
    return sharedFields;
}
//# sourceMappingURL=shared-fields.js.map