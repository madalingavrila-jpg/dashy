import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { MultiMainMetadata } from '@n8n/decorators';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import { Publisher } from '../scaling/pubsub/publisher.service';
import { RedisClientService } from '../services/redis-client.service';
import { TypedEmitter } from '../typed-emitter';
type MultiMainEvents = {
    'leader-stepdown': never;
    'leader-takeover': never;
};
export declare class MultiMainSetup extends TypedEmitter<MultiMainEvents> {
    private readonly logger;
    private readonly instanceSettings;
    private readonly publisher;
    private readonly redisClientService;
    private readonly globalConfig;
    private readonly metadata;
    private readonly errorReporter;
    constructor(logger: Logger, instanceSettings: InstanceSettings, publisher: Publisher, redisClientService: RedisClientService, globalConfig: GlobalConfig, metadata: MultiMainMetadata, errorReporter: ErrorReporter);
    private leaderKey;
    private readonly leaderKeyTtl;
    private leaderCheckInterval;
    init(): Promise<void>;
    shutdown(): Promise<void>;
    private checkLeader;
    private tryBecomeLeader;
    fetchLeaderKey(): Promise<string | null>;
    registerEventHandlers(): void;
}
export {};
