import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';
import { Telemetry } from '../../telemetry';
import { McpService } from './mcp.service';
import { McpSettingsService } from './mcp.settings.service';
export type FlushableResponse = Response & {
    flush: () => void;
};
export declare class McpController {
    private readonly errorReporter;
    private readonly mcpService;
    private readonly mcpSettingsService;
    private readonly telemetry;
    private readonly logger;
    constructor(errorReporter: ErrorReporter, mcpService: McpService, mcpSettingsService: McpSettingsService, telemetry: Telemetry, logger: Logger);
    private setCorsHeaders;
    discoverAuthSchemeHead(_req: Request, res: Response): Promise<void>;
    build(req: AuthenticatedRequest, res: FlushableResponse): Promise<void>;
    private trackConnectionEvent;
}
