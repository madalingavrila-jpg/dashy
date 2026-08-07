"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvParserService = void 0;
const backend_common_1 = require("@n8n/backend-common");
const config_1 = require("@n8n/config");
const di_1 = require("@n8n/di");
const csv_parse_1 = require("csv-parse");
const fs_1 = require("fs");
let CsvParserService = class CsvParserService {
    constructor(globalConfig) {
        this.globalConfig = globalConfig;
        this.DEFAULT_COLUMN_PREFIX = 'Column_';
        this.uploadDir = this.globalConfig.dataTable.uploadDir;
    }
    processRowWithoutHeaders(row, columnNames) {
        let updatedColumnNames = columnNames;
        if (updatedColumnNames.length === 0) {
            updatedColumnNames = row.map((_, index) => `${this.DEFAULT_COLUMN_PREFIX}${index + 1}`);
        }
        const rowObject = {};
        row.forEach((value, index) => {
            rowObject[updatedColumnNames[index]] = value;
        });
        return { rowObject, columnNames: updatedColumnNames };
    }
    async parseFile(fileId, hasHeaders = true) {
        const filePath = (0, backend_common_1.safeJoinPath)(this.uploadDir, fileId);
        let rowCount = 0;
        let firstDataRow = null;
        let columnNames = [];
        return await new Promise((resolve, reject) => {
            const parser = (0, csv_parse_1.parse)({
                columns: hasHeaders
                    ? (header) => {
                        columnNames = header;
                        return header;
                    }
                    : false,
                skip_empty_lines: true,
            })
                .on('data', (row) => {
                rowCount++;
                if (!hasHeaders && Array.isArray(row)) {
                    const processed = this.processRowWithoutHeaders(row, columnNames);
                    columnNames = processed.columnNames;
                    firstDataRow ??= processed.rowObject;
                }
                else if (!Array.isArray(row)) {
                    firstDataRow ??= row;
                }
            })
                .on('end', () => {
                const columns = columnNames.map((columnName) => {
                    const detectedType = this.inferColumnType(firstDataRow?.[columnName]);
                    return {
                        name: columnName,
                        type: detectedType,
                        compatibleTypes: this.getCompatibleTypes(detectedType),
                    };
                });
                resolve({
                    rowCount,
                    columnCount: columns.length,
                    columns,
                });
            })
                .on('error', reject);
            (0, fs_1.createReadStream)(filePath).on('error', reject).pipe(parser);
        });
    }
    async parseFileData(fileId, hasHeaders = true) {
        const filePath = (0, backend_common_1.safeJoinPath)(this.uploadDir, fileId);
        const rows = [];
        let columnNames = [];
        return await new Promise((resolve, reject) => {
            const parser = (0, csv_parse_1.parse)({
                columns: hasHeaders ? true : false,
                skip_empty_lines: true,
            })
                .on('data', (row) => {
                if (!hasHeaders && Array.isArray(row)) {
                    const processed = this.processRowWithoutHeaders(row, columnNames);
                    columnNames = processed.columnNames;
                    rows.push(processed.rowObject);
                }
                else if (!Array.isArray(row)) {
                    rows.push(row);
                }
            })
                .on('end', () => {
                resolve(rows);
            })
                .on('error', reject);
            (0, fs_1.createReadStream)(filePath).on('error', reject).pipe(parser);
        });
    }
    getCompatibleTypes(detectedType) {
        switch (detectedType) {
            case 'date':
                return ['date', 'string'];
            case 'number':
                return ['number', 'string'];
            case 'boolean':
                return ['boolean', 'string'];
            case 'string':
                return ['string'];
            default:
                return ['string'];
        }
    }
    inferColumnType(value) {
        if (!value?.trim()) {
            return 'string';
        }
        const trimmedValue = value.trim();
        const lowerValue = trimmedValue.toLowerCase();
        if (lowerValue === 'true' || lowerValue === 'false') {
            return 'boolean';
        }
        if (!Number.isNaN(Number(trimmedValue))) {
            return 'number';
        }
        if (this.isDate(trimmedValue)) {
            return 'date';
        }
        return 'string';
    }
    isDate(value) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            const datePatterns = [
                /^\d{4}-\d{2}-\d{2}/,
                /^\d{4}\/\d{2}\/\d{2}/,
                /^\d{2}\/\d{2}\/\d{4}/,
                /^\d{2}-\d{2}-\d{4}/,
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
            ];
            return datePatterns.some((pattern) => pattern.test(value));
        }
        return false;
    }
};
exports.CsvParserService = CsvParserService;
exports.CsvParserService = CsvParserService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [config_1.GlobalConfig])
], CsvParserService);
//# sourceMappingURL=csv-parser.service.js.map