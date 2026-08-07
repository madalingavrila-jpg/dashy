"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonOptions = void 0;
const prompt_1 = require("./prompt");
exports.commonOptions = [
    {
        displayName: 'System Message',
        name: 'systemMessage',
        type: 'string',
        default: prompt_1.SYSTEM_MESSAGE,
        description: 'The message that will be sent to the agent before the conversation starts',
        typeOptions: {
            rows: 6,
        },
    },
    {
        displayName: 'Max Iterations',
        name: 'maxIterations',
        type: 'number',
        default: 10,
        description: 'The maximum number of iterations the agent will run before stopping',
    },
    {
        displayName: 'Return Intermediate Steps',
        name: 'returnIntermediateSteps',
        type: 'boolean',
        default: false,
        description: 'Whether or not the output should include intermediate steps the agent took',
    },
    {
        displayName: 'Automatically Passthrough Binary Images',
        name: 'passthroughBinaryImages',
        type: 'boolean',
        default: true,
        description: 'Whether or not binary images should be automatically passed through to the agent as image type messages',
    },
];
//# sourceMappingURL=options.js.map