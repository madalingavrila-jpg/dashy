import { Logger } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { ErrorReporter } from 'n8n-core';
import { DbConnectionOptions } from './db-connection-options';
type ConnectionState = {
    connected: boolean;
    migrated: boolean;
};
export declare class DbConnection {
    private readonly errorReporter;
    private readonly connectionOptions;
    private readonly databaseConfig;
    private readonly logger;
    private dataSource;
    private pingTimer;
    timeout: number;
    readonly connectionState: ConnectionState;
    constructor(errorReporter: ErrorReporter, connectionOptions: DbConnectionOptions, databaseConfig: DatabaseConfig, logger: Logger);
    get options(): import("@n8n/typeorm").DataSourceOptions;
    init(): Promise<void>;
    migrate(): Promise<void>;
    close(): Promise<void>;
    private scheduleNextPing;
    private ping;
}
export {};
