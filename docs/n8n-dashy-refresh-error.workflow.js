/**
 * n8n Workflow SDK draft — Dashy refresh FAILURE alerts
 *
 * Set this workflow as the Error Workflow for "Dashy nightly data refresh".
 * DMs Madalin when the schedule/dispatch path fails (Action failures are also
 * visible in GitHub Actions UI).
 *
 * Prerequisites: Slack API credential that can open a DM with Madalin.
 * Resolve Madalin's Slack user id via users.lookupByEmail (madalin.gavrila@bolt.eu)
 * before publishing — replace MADALIN_SLACK_USER_ID below.
 */
import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

const MADALIN_SLACK_USER_ID = 'U07M4KBEUES';

export default workflow('dashy-refresh-error-alert', 'Dashy refresh error alert')
  .add(
    trigger({
      type: 'n8n-nodes-base.errorTrigger',
      version: 1,
      name: 'On workflow error',
      config: {},
    }),
  )
  .to(
    node({
      type: 'n8n-nodes-base.slack',
      version: 2.5,
      name: 'DM Madalin',
      config: {
        resource: 'message',
        operation: 'post',
        select: 'user',
        user: {
          __rl: true,
          mode: 'id',
          value: MADALIN_SLACK_USER_ID,
        },
        text: expr(
          'Dashy nightly refresh failed in n8n.\\n' +
            'Workflow: ' +
            '{{ $json.workflow?.name || "unknown" }}\\n' +
            'Execution: ' +
            '{{ $json.execution?.id || "unknown" }}\\n' +
            'Error: ' +
            '{{ $json.execution?.error?.message || $json.error?.message || "see n8n execution" }}\\n' +
            'Check GitHub Actions: https://github.com/boltable/dashy/actions/workflows/dashy-data-refresh.yml',
        ),
        // credentials: { slackApi: { id: '<YOUR_SLACK_CREDENTIAL_ID>', name: '...' } }
      },
    }),
  );
