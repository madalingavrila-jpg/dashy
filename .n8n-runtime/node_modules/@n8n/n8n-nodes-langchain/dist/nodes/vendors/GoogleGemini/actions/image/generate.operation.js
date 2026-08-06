"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.description = void 0;
exports.execute = execute;
const n8n_workflow_1 = require("n8n-workflow");
const interfaces_1 = require("../../helpers/interfaces");
const transport_1 = require("../../transport");
const descriptions_1 = require("../descriptions");
const properties = [
    (0, descriptions_1.modelRLC)('imageGenerationModelSearch'),
    {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        placeholder: 'e.g. A cute cat eating a dinosaur',
        description: 'A text description of the desired image(s)',
        default: '',
        typeOptions: {
            rows: 2,
        },
    },
    {
        displayName: 'Options',
        name: 'options',
        placeholder: 'Add Option',
        type: 'collection',
        default: {},
        options: [
            {
                displayName: 'Number of Images',
                name: 'sampleCount',
                default: 1,
                description: 'Number of images to generate. Not supported by Gemini models, supported by Imagen models.',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                },
            },
            {
                displayName: 'Put Output in Field',
                name: 'binaryPropertyOutput',
                type: 'string',
                default: 'data',
                hint: 'The name of the output field to put the binary file data in',
            },
        ],
    },
];
const displayOptions = {
    show: {
        operation: ['generate'],
        resource: ['image'],
    },
};
exports.description = (0, n8n_workflow_1.updateDisplayOptions)(displayOptions, properties);
async function execute(i) {
    const model = this.getNodeParameter('modelId', i, '', { extractValue: true });
    const prompt = this.getNodeParameter('prompt', i, '');
    const binaryPropertyOutput = this.getNodeParameter('options.binaryPropertyOutput', i, 'data');
    if (model.includes('gemini')) {
        const generationConfig = {
            responseModalities: [interfaces_1.Modality.IMAGE, interfaces_1.Modality.TEXT],
        };
        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig,
        };
        const response = (await transport_1.apiRequest.call(this, 'POST', `/v1beta/${model}:generateContent`, {
            body,
        }));
        const promises = response.candidates.map(async (candidate) => {
            const imagePart = candidate.content.parts.find((part) => 'inlineData' in part);
            const buffer = Buffer.from(imagePart?.inlineData.data ?? '', 'base64');
            const binaryData = await this.helpers.prepareBinaryData(buffer, 'image.png', imagePart?.inlineData.mimeType);
            return {
                binary: {
                    [binaryPropertyOutput]: binaryData,
                },
                json: {
                    ...binaryData,
                    data: undefined,
                },
                pairedItem: { item: i },
            };
        });
        return await Promise.all(promises);
    }
    else if (model.includes('imagen')) {
        const sampleCount = this.getNodeParameter('options.sampleCount', i, 1);
        const body = {
            instances: [
                {
                    prompt,
                },
            ],
            parameters: {
                sampleCount,
            },
        };
        const response = (await transport_1.apiRequest.call(this, 'POST', `/v1beta/${model}:predict`, {
            body,
        }));
        const promises = response.predictions.map(async (prediction) => {
            const buffer = Buffer.from(prediction.bytesBase64Encoded ?? '', 'base64');
            const binaryData = await this.helpers.prepareBinaryData(buffer, 'image.png', prediction.mimeType);
            return {
                binary: {
                    [binaryPropertyOutput]: binaryData,
                },
                json: {
                    ...binaryData,
                    data: undefined,
                },
                pairedItem: { item: i },
            };
        });
        return await Promise.all(promises);
    }
    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Model ${model} is not supported for image generation`, {
        description: 'Please check the model ID and try again.',
    });
}
//# sourceMappingURL=generate.operation.js.map