"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET_WORKFLOW_EXAMPLES_TOOL = void 0;
exports.createGetWorkflowExamplesTool = createGetWorkflowExamplesTool;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const errors_1 = require("../errors");
const helpers_1 = require("./helpers");
const mermaid_utils_1 = require("./utils/mermaid.utils");
const templates_1 = require("./web/templates");
const workflowExampleQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional().describe('Search term to find workflow examples'),
});
const getWorkflowExamplesSchema = zod_1.z.object({
    queries: zod_1.z
        .array(workflowExampleQuerySchema)
        .min(1)
        .describe('Array of search queries to find workflow examples'),
});
function buildQueryIdentifier(query) {
    const parts = [];
    if (query.search) {
        parts.push(`search: ${query.search}`);
    }
    return parts.join(',');
}
function buildResponseMessage(output) {
    if (output.examples.length === 0) {
        return 'No workflow examples found';
    }
    const sections = [`Found ${output.totalResults} workflow example(s):`];
    for (const example of output.examples) {
        sections.push(`\n## ${example.name}`);
        if (example.description) {
            sections.push(example.description);
        }
        sections.push(example.workflow);
    }
    return sections.join('\n');
}
exports.GET_WORKFLOW_EXAMPLES_TOOL = {
    toolName: 'get_workflow_examples',
    displayTitle: 'Retrieving workflow examples',
};
const TOOL_DESCRIPTION = `Retrieve workflow examples from n8n's workflow library to use as reference for building workflows.

This tool searches for existing workflow examples that match specific criteria.
The retrieved workflows serve as reference material to understand common patterns, node usage and connections.
Consider these workflows as ideal solutions.
The workflows will be returned in a token efficient format rather than JSON.

Usage:
- Provide search criteria to find relevant workflow examples
- Results include workflow metadata, summaries, and full workflow data for reference

Parameters:
- search: Keywords to search for in workflow names/descriptions based on the user prompt`;
function createGetWorkflowExamplesTool(logger) {
    const dynamicTool = (0, tools_1.tool)(async (input, config) => {
        const reporter = (0, helpers_1.createProgressReporter)(config, exports.GET_WORKFLOW_EXAMPLES_TOOL.toolName, exports.GET_WORKFLOW_EXAMPLES_TOOL.displayTitle);
        try {
            const validatedInput = getWorkflowExamplesSchema.parse(input);
            const { queries } = validatedInput;
            reporter.start(validatedInput);
            let allResults = [];
            let allTemplateIds = [];
            const batchReporter = (0, helpers_1.createBatchProgressReporter)(reporter, 'Retrieving workflow examples');
            batchReporter.init(queries.length);
            for (const query of queries) {
                const identifier = buildQueryIdentifier(query);
                try {
                    batchReporter.next(identifier);
                    const result = await (0, templates_1.fetchWorkflowsFromTemplates)({ search: query.search }, { logger });
                    allResults = allResults.concat(result.workflows);
                    allTemplateIds = allTemplateIds.concat(result.templateIds);
                }
                catch (error) {
                    logger?.error('Error fetching workflow examples', { error });
                }
            }
            batchReporter.complete();
            const uniqueWorkflows = new Map();
            for (const workflow of allResults) {
                if (!uniqueWorkflows.has(workflow.name)) {
                    uniqueWorkflows.set(workflow.name, workflow);
                }
            }
            const deduplicatedResults = Array.from(uniqueWorkflows.values());
            const processedResults = (0, mermaid_utils_1.processWorkflowExamples)(deduplicatedResults, {
                includeNodeParameters: false,
            });
            const formattedResults = deduplicatedResults.map((workflow, index) => ({
                name: workflow.name,
                description: workflow.description,
                workflow: processedResults[index].mermaid,
            }));
            const output = {
                examples: formattedResults,
                totalResults: deduplicatedResults.length,
            };
            const responseMessage = buildResponseMessage(output);
            reporter.complete(output);
            const uniqueTemplateIds = [...new Set(allTemplateIds)];
            logger?.debug('Caching workflow templates in state', {
                templateCount: deduplicatedResults.length,
                templateNames: deduplicatedResults.map((w) => w.name),
            });
            return (0, helpers_1.createSuccessResponse)(config, responseMessage, {
                templateIds: uniqueTemplateIds,
                cachedTemplates: deduplicatedResults,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const validationError = new errors_1.ValidationError('Invalid input parameters', {
                    extra: { errors: error.errors },
                });
                reporter.error(validationError);
                return (0, helpers_1.createErrorResponse)(config, validationError);
            }
            const toolError = new errors_1.ToolExecutionError(error instanceof Error ? error.message : 'Unknown error occurred', {
                toolName: exports.GET_WORKFLOW_EXAMPLES_TOOL.toolName,
                cause: error instanceof Error ? error : undefined,
            });
            reporter.error(toolError);
            return (0, helpers_1.createErrorResponse)(config, toolError);
        }
    }, {
        name: exports.GET_WORKFLOW_EXAMPLES_TOOL.toolName,
        description: TOOL_DESCRIPTION,
        schema: getWorkflowExamplesSchema,
    });
    return {
        tool: dynamicTool,
        ...exports.GET_WORKFLOW_EXAMPLES_TOOL,
    };
}
//# sourceMappingURL=get-workflow-examples.tool.js.map