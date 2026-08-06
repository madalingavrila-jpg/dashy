import { CreateRoleDto, RoleGetQueryDto, RoleListQueryDto, UpdateRoleDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Role as RoleDTO } from '@n8n/permissions';
import { RoleService } from '../services/role.service';
export declare class RoleController {
    private readonly roleService;
    constructor(roleService: RoleService);
    getAllRoles(_req: AuthenticatedRequest, _res: Response, query: RoleListQueryDto): Promise<Record<string, RoleDTO[]>>;
    getRoleBySlug(_req: AuthenticatedRequest, _res: Response, slug: string, query: RoleGetQueryDto): Promise<RoleDTO>;
    updateRole(_req: AuthenticatedRequest, _res: Response, slug: string, updateRole: UpdateRoleDto): Promise<RoleDTO>;
    deleteRole(_req: AuthenticatedRequest, _res: Response, slug: string): Promise<RoleDTO>;
    createRole(_req: AuthenticatedRequest, _res: Response, createRole: CreateRoleDto): Promise<RoleDTO>;
}
