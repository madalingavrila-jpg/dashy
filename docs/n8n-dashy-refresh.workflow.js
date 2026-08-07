/**
 * n8n Workflow SDK draft — Dashy nightly refresh orchestrator
 *
 * Import into project: DELIVERY-FOOD-SALES-OPS - Sales Internal
 * (or paste into n8n MCP create_workflow_from_code from a Cursor desktop session
 * where user-n8n-mcp is authenticated).
 *
 * Prerequisites (create credentials in n8n UI first):
 *   1. GitHub credential with actions:write + repo on boltable/dashy
 *   2. Slack bot credential that can DM Madalin (failure alerts)
 *
 * Do NOT publish until a manual workflow_dispatch of dashy-data-refresh.yml succeeds.
 *
 * Companion error workflow: docs/n8n-dashy-refresh-error.workflow.js
 */
import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

export default workflow('dashy-nightly-refresh', 'Dashy nightly data refresh')
  .add(
    trigger({
      type: 'n8n-nodes-base.scheduleTrigger',
      version: 1.3,
      name: 'Daily 14:00 Bucharest',
      config: {
        rule: {
          interval: [
            {
              field: 'cronExpression',
              expression: '0 14 * * *',
            },
          ],
        },
        // Set timezone on the node in the UI to Europe/Bucharest if not inherited
      },
    }),
  )
  .to(
    node({
      type: 'n8n-nodes-base.github',
      version: 1.1,
      name: 'Dispatch dashy-data-refresh',
      config: {
        resource: 'workflow',
        operation: 'dispatch',
        owner: 'boltable',
        repository: 'dashy',
        workflowId: 'dashy-data-refresh.yml',
        ref: 'main',
        inputs: {
          values: [
            {
              name: 'reason',
              value: expr('"n8n-schedule-" + $now.toISO()'),
            },
          ],
        },
        // credentials: { githubApi: { id: '<YOUR_GITHUB_CREDENTIAL_ID>', name: '...' } }
      },
    }),
  );
