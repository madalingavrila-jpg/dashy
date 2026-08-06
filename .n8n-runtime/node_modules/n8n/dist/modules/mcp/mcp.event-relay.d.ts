import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { EventService } from '../../events/event.service';
import { EventRelay } from '../../events/relays/event-relay';
export declare class McpEventRelay extends EventRelay {
    private readonly workflowRepository;
    private readonly logger;
    constructor(eventService: EventService, workflowRepository: WorkflowRepository, logger: Logger);
    init(): void;
    private onWorkflowDeactivated;
}
