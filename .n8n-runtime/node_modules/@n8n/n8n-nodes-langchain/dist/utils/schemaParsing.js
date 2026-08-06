"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSchemaFromExample = generateSchemaFromExample;
exports.convertJsonSchemaToZod = convertJsonSchemaToZod;
exports.throwIfToolSchema = throwIfToolSchema;
const json_schema_to_zod_1 = require("@n8n/json-schema-to-zod");
const generate_schema_1 = require("generate-schema");
const n8n_workflow_1 = require("n8n-workflow");
function makeAllPropertiesRequired(schema) {
    function isPropertySchema(property) {
        return typeof property === 'object' && property !== null && 'type' in property;
    }
    if (schema.type === 'object' && schema.properties) {
        const properties = Object.keys(schema.properties);
        if (properties.length > 0) {
            schema.required = properties;
        }
        for (const key of properties) {
            if (isPropertySchema(schema.properties[key])) {
                makeAllPropertiesRequired(schema.properties[key]);
            }
        }
    }
    if (schema.type === 'array' && schema.items && isPropertySchema(schema.items)) {
        schema.items = makeAllPropertiesRequired(schema.items);
    }
    return schema;
}
function generateSchemaFromExample(exampleJsonString, allFieldsRequired = false) {
    const parsedExample = (0, n8n_workflow_1.jsonParse)(exampleJsonString);
    const schema = (0, generate_schema_1.json)(parsedExample);
    if (allFieldsRequired) {
        return makeAllPropertiesRequired(schema);
    }
    return schema;
}
function convertJsonSchemaToZod(schema) {
    return (0, json_schema_to_zod_1.jsonSchemaToZod)(schema);
}
function throwIfToolSchema(ctx, error) {
    if (error?.message?.includes('tool input did not match expected schema')) {
        throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), `${error.message}.
			This is most likely because some of your tools are configured to require a specific schema. This is not supported by Conversational Agent. Remove the schema from the tool configuration or use Tools agent instead.`);
    }
}
//# sourceMappingURL=schemaParsing.js.map