import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { AssignableProjectRole } from '@n8n/permissions';
import type { IWorkflowBase } from 'n8n-workflow';
import type { InviteEmailData, PasswordResetData, SendEmailResult } from './interfaces';
import { NodeMailer } from './node-mailer';
import { EventService } from '../../events/event.service';
import { UrlService } from '../../services/url.service';
type Template = HandlebarsTemplateDelegate<unknown>;
type TemplateName = 'user-invited' | 'password-reset-requested' | 'workflow-deactivated' | 'workflow-shared' | 'credentials-shared' | 'project-shared' | 'workflow-failure';
export declare class UserManagementMailer {
    private readonly logger;
    private readonly userRepository;
    private readonly urlService;
    private readonly eventService;
    readonly isEmailSetUp: boolean;
    readonly templateOverrides: GlobalConfig['userManagement']['emails']['template'];
    readonly templatesCache: Partial<Record<TemplateName, Template>>;
    readonly mailer: NodeMailer | undefined;
    constructor(globalConfig: GlobalConfig, logger: Logger, userRepository: UserRepository, urlService: UrlService, eventService: EventService);
    invite(inviteEmailData: InviteEmailData): Promise<SendEmailResult>;
    passwordReset(passwordResetData: PasswordResetData): Promise<SendEmailResult>;
    workflowFailure(data: {
        email: string;
        firstName?: string;
        workflowId: string;
        workflowName: string;
    }): Promise<SendEmailResult>;
    private sendNotificationEmails;
    notifyWorkflowAutodeactivated({ recipient, workflow, }: {
        recipient: User;
        workflow: IWorkflowBase;
    }): Promise<SendEmailResult>;
    notifyWorkflowShared({ sharer, newShareeIds, workflow, }: {
        sharer: User;
        newShareeIds: string[];
        workflow: IWorkflowBase;
    }): Promise<SendEmailResult>;
    notifyCredentialsShared({ sharer, newShareeIds, credentialsName, }: {
        sharer: User;
        newShareeIds: string[];
        credentialsName: string;
    }): Promise<SendEmailResult>;
    notifyProjectShared({ sharer, newSharees, project, }: {
        sharer: User;
        newSharees: Array<{
            userId: string;
            role: AssignableProjectRole;
        }>;
        project: {
            id: string;
            name: string;
        };
    }): Promise<SendEmailResult>;
    getTemplate(templateName: TemplateName): Promise<Template>;
    private get basePayload();
}
export {};
