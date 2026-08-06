"use strict";
const api_types_1 = require("@n8n/api-types");
const data_table_repository_1 = require("../../../../modules/data-table/data-table.repository");
const di_1 = require("@n8n/di");
const global_middleware_1 = require("../../shared/middlewares/global.middleware");
const pagination_service_1 = require("../../shared/services/pagination.service");
const data_table_service_1 = require("../../../../modules/data-table/data-table.service");
const data_table_not_found_error_1 = require("../../../../modules/data-table/errors/data-table-not-found.error");
const data_table_validation_error_1 = require("../../../../modules/data-table/errors/data-table-validation.error");
const handleError = (error, res) => {
    if (error instanceof data_table_not_found_error_1.DataTableNotFoundError) {
        return res.status(404).json({ message: error.message });
    }
    if (error instanceof data_table_validation_error_1.DataTableValidationError) {
        return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
    }
    throw error;
};
const stringifyQuery = (query) => {
    const result = {};
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
            result[key] = String(value);
        }
    }
    return result;
};
const getProjectIdForDataTable = async (dataTableId) => {
    const dataTable = await di_1.Container.get(data_table_repository_1.DataTableRepository).findOne({
        where: { id: dataTableId },
        relations: ['project'],
    });
    if (!dataTable) {
        throw new data_table_not_found_error_1.DataTableNotFoundError(dataTableId);
    }
    return dataTable.project.id;
};
module.exports = {
    getDataTableRows: [
        (0, global_middleware_1.apiKeyHasScope)('dataTableRow:read'),
        (0, global_middleware_1.projectScope)('dataTable:readRow', 'dataTable'),
        global_middleware_1.validCursor,
        async (req, res) => {
            try {
                const { dataTableId } = req.params;
                const payload = api_types_1.PublicApiListDataTableContentQueryDto.safeParse(stringifyQuery(req.query));
                if (!payload.success) {
                    return res.status(400).json({
                        message: payload.error.errors[0]?.message || 'Invalid query parameters',
                    });
                }
                const { offset, limit, filter, sortBy, search } = payload.data;
                const projectId = await getProjectIdForDataTable(dataTableId);
                const result = await di_1.Container.get(data_table_service_1.DataTableService).getManyRowsAndCount(dataTableId, projectId, {
                    skip: offset,
                    take: limit,
                    filter,
                    sortBy,
                    search,
                });
                return res.json({
                    data: result.data,
                    nextCursor: (0, pagination_service_1.encodeNextCursor)({
                        offset,
                        limit,
                        numberOfTotalRecords: result.count,
                    }),
                });
            }
            catch (error) {
                return handleError(error, res);
            }
        },
    ],
    insertDataTableRows: [
        (0, global_middleware_1.apiKeyHasScope)('dataTableRow:create'),
        (0, global_middleware_1.projectScope)('dataTable:writeRow', 'dataTable'),
        async (req, res) => {
            try {
                const { dataTableId } = req.params;
                const payload = api_types_1.AddDataTableRowsDto.safeParse(req.body);
                if (!payload.success) {
                    return res.status(400).json({
                        message: payload.error.errors[0]?.message || 'Invalid request body',
                    });
                }
                const projectId = await getProjectIdForDataTable(dataTableId);
                const result = await di_1.Container.get(data_table_service_1.DataTableService).insertRows(dataTableId, projectId, payload.data.data, payload.data.returnType);
                return res.json(result);
            }
            catch (error) {
                return handleError(error, res);
            }
        },
    ],
    updateDataTableRows: [
        (0, global_middleware_1.apiKeyHasScope)('dataTableRow:update'),
        (0, global_middleware_1.projectScope)('dataTable:writeRow', 'dataTable'),
        async (req, res) => {
            try {
                const { dataTableId } = req.params;
                const payload = api_types_1.UpdateDataTableRowDto.safeParse(req.body);
                if (!payload.success) {
                    return res.status(400).json({
                        message: payload.error.errors[0]?.message || 'Invalid request body',
                    });
                }
                const projectId = await getProjectIdForDataTable(dataTableId);
                const service = di_1.Container.get(data_table_service_1.DataTableService);
                const { filter, data, returnData = false, dryRun = false } = payload.data;
                const params = { filter, data };
                const result = dryRun
                    ? await service.updateRows(dataTableId, projectId, params, returnData, true)
                    : returnData
                        ? await service.updateRows(dataTableId, projectId, params, true, false)
                        : await service.updateRows(dataTableId, projectId, params, false, false);
                return res.json(result);
            }
            catch (error) {
                return handleError(error, res);
            }
        },
    ],
    upsertDataTableRow: [
        (0, global_middleware_1.apiKeyHasScope)('dataTableRow:upsert'),
        (0, global_middleware_1.projectScope)('dataTable:writeRow', 'dataTable'),
        async (req, res) => {
            try {
                const { dataTableId } = req.params;
                const payload = api_types_1.UpsertDataTableRowDto.safeParse(req.body);
                if (!payload.success) {
                    return res.status(400).json({
                        message: payload.error.errors[0]?.message || 'Invalid request body',
                    });
                }
                const projectId = await getProjectIdForDataTable(dataTableId);
                const service = di_1.Container.get(data_table_service_1.DataTableService);
                const { filter, data, returnData = false, dryRun = false } = payload.data;
                const params = { filter, data };
                const result = dryRun
                    ? await service.upsertRow(dataTableId, projectId, params, returnData, true)
                    : returnData
                        ? await service.upsertRow(dataTableId, projectId, params, true, false)
                        : await service.upsertRow(dataTableId, projectId, params, false, false);
                return res.json(result);
            }
            catch (error) {
                return handleError(error, res);
            }
        },
    ],
    deleteDataTableRows: [
        (0, global_middleware_1.apiKeyHasScope)('dataTableRow:delete'),
        (0, global_middleware_1.projectScope)('dataTable:writeRow', 'dataTable'),
        async (req, res) => {
            try {
                const { dataTableId } = req.params;
                const payload = api_types_1.DeleteDataTableRowsDto.safeParse(stringifyQuery(req.query));
                if (!payload.success) {
                    return res.status(400).json({
                        message: payload.error.errors[0]?.message || 'Invalid query parameters',
                    });
                }
                const projectId = await getProjectIdForDataTable(dataTableId);
                const service = di_1.Container.get(data_table_service_1.DataTableService);
                const { filter, returnData = false, dryRun = false } = payload.data;
                const params = { filter };
                const result = dryRun
                    ? await service.deleteRows(dataTableId, projectId, params, returnData, true)
                    : returnData
                        ? await service.deleteRows(dataTableId, projectId, params, true, false)
                        : await service.deleteRows(dataTableId, projectId, params, false, false);
                return res.json(result);
            }
            catch (error) {
                return handleError(error, res);
            }
        },
    ],
};
//# sourceMappingURL=data-tables.rows.handler.js.map