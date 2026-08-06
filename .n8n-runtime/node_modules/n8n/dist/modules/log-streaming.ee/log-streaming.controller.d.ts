import { DeleteDestinationQueryDto, GetDestinationQueryDto, TestDestinationQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { MessageEventBus } from '../../eventbus/message-event-bus/message-event-bus';
import { LogStreamingDestinationService } from './log-streaming-destination.service';
export declare class EventBusController {
    private readonly eventBus;
    private readonly destinationService;
    constructor(eventBus: MessageEventBus, destinationService: LogStreamingDestinationService);
    getEventNames(): Promise<string[]>;
    getDestination(_req: AuthenticatedRequest, _res: unknown, query: GetDestinationQueryDto): Promise<MessageEventBusDestinationOptions[]>;
    postDestination(req: AuthenticatedRequest): Promise<MessageEventBusDestinationOptions>;
    sendTestMessage(_req: AuthenticatedRequest, _res: unknown, query: TestDestinationQueryDto): Promise<boolean>;
    deleteDestination(_req: AuthenticatedRequest, _res: unknown, query: DeleteDestinationQueryDto): Promise<void>;
}
