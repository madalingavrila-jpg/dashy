"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.userHasScopes = userHasScopes;
const db_1 = require("@n8n/db");
const backend_common_1 = require("@n8n/backend-common");
const di_1 = require("@n8n/di");
const permissions_1 = require("@n8n/permissions");
const n8n_workflow_1 = require("n8n-workflow");
const credentials_finder_service_1 = require("../credentials/credentials-finder.service");
const not_found_error_1 = require("../errors/response-errors/not-found.error");
const role_service_1 = require("../services/role.service");
async function userHasScopes(user, scopes, globalOnly, { credentialId, workflowId, projectId, dataTableId, }) {
    if ((0, permissions_1.hasGlobalScope)(user, scopes, { mode: 'allOf' }))
        return true;
    if (globalOnly)
        return false;
    const userProjectIds = (await di_1.Container.get(db_1.ProjectRepository)
        .createQueryBuilder('project')
        .innerJoin('project.projectRelations', 'relation')
        .innerJoin('relation.role', 'role')
        .innerJoin('role.scopes', 'scope')
        .where('relation.userId = :userId', { userId: user.id })
        .andWhere('scope.slug IN (:...scopes)', { scopes })
        .groupBy('project.id')
        .having('COUNT(DISTINCT scope.slug) = :scopeCount', { scopeCount: scopes.length })
        .select(['project.id AS id'])
        .getRawMany()).map((row) => row.id);
    const roleService = di_1.Container.get(role_service_1.RoleService);
    if (credentialId) {
        const credentials = await di_1.Container.get(db_1.SharedCredentialsRepository).findBy({
            credentialsId: credentialId,
        });
        if (!credentials.length) {
            throw new not_found_error_1.NotFoundError(`Credential with ID "${credentialId}" not found.`);
        }
        const validRoles = await roleService.rolesWithScope('credential', scopes);
        const hasValidRoles = credentials.some((c) => userProjectIds.includes(c.projectId) && validRoles.includes(c.role));
        if (hasValidRoles) {
            return true;
        }
        const credentialsFinderService = di_1.Container.get(credentials_finder_service_1.CredentialsFinderService);
        if (credentialsFinderService.hasGlobalReadOnlyAccess(scopes)) {
            const globalCredential = await credentialsFinderService.findGlobalCredentialById(credentialId);
            if (globalCredential) {
                return true;
            }
        }
        return false;
    }
    if (workflowId) {
        const workflows = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
            workflowId,
        });
        if (!workflows.length) {
            throw new not_found_error_1.NotFoundError(`Workflow with ID "${workflowId}" not found.`);
        }
        const validRoles = await roleService.rolesWithScope('workflow', scopes);
        return workflows.some((w) => userProjectIds.includes(w.projectId) && validRoles.includes(w.role));
    }
    if (dataTableId) {
        const moduleRegistry = di_1.Container.get(backend_common_1.ModuleRegistry);
        if (!moduleRegistry.isActive('data-table')) {
            throw new not_found_error_1.NotFoundError(`Data table with ID "${dataTableId}" not found.`);
        }
        const { DataTableRepository } = await Promise.resolve().then(() => __importStar(require('../modules/data-table/data-table.repository')));
        const dataTable = await di_1.Container.get(DataTableRepository).findOne({
            where: { id: dataTableId },
            relations: ['project'],
        });
        if (!dataTable) {
            throw new not_found_error_1.NotFoundError(`Data table with ID "${dataTableId}" not found.`);
        }
        return userProjectIds.includes(dataTable.project.id);
    }
    if (projectId)
        return userProjectIds.includes(projectId);
    throw new n8n_workflow_1.UnexpectedError("`@ProjectScope` decorator was used but does not have a `credentialId`, `workflowId`, `dataTableId`, or `projectId` in its URL parameters. This is likely an implementation error. If you're a developer, please check your URL is correct or that this should be using `@GlobalScope`.");
}
//# sourceMappingURL=check-access.js.map