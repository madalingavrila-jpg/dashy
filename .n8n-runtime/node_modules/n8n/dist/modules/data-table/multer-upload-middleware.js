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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MulterUploadMiddleware = void 0;
const config_1 = require("@n8n/config");
const di_1 = require("@n8n/di");
const promises_1 = require("fs/promises");
const multer_1 = __importDefault(require("multer"));
const nanoid_1 = require("nanoid");
const bad_request_error_1 = require("../../errors/response-errors/bad-request.error");
const data_table_size_validator_service_1 = require("./data-table-size-validator.service");
const data_table_repository_1 = require("./data-table.repository");
const size_utils_1 = require("./utils/size-utils");
const ALLOWED_MIME_TYPES = ['text/csv'];
let MulterUploadMiddleware = class MulterUploadMiddleware {
    constructor(globalConfig, sizeValidator, dataTableRepository) {
        this.globalConfig = globalConfig;
        this.sizeValidator = sizeValidator;
        this.dataTableRepository = dataTableRepository;
        this.uploadDir = this.globalConfig.dataTable.uploadDir;
        void this.ensureUploadDirExists();
        const storage = multer_1.default.diskStorage({
            destination: (_req, _file, cb) => {
                cb(null, this.uploadDir);
            },
            filename: (_req, _file, cb) => {
                const filename = (0, nanoid_1.nanoid)(10);
                cb(null, filename);
            },
        });
        this.upload = (0, multer_1.default)({
            storage,
            limits: this.globalConfig.dataTable.uploadMaxFileSize
                ? { fileSize: this.globalConfig.dataTable.uploadMaxFileSize }
                : undefined,
            fileFilter: async (req, file, cb) => {
                if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                    cb(new bad_request_error_1.BadRequestError(`Only the following file types are allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
                    return;
                }
                const fileSize = parseInt(req.headers['content-length'] ?? '0', 10);
                if (this.globalConfig.dataTable.uploadMaxFileSize) {
                    cb(null, true);
                    return;
                }
                try {
                    const sizeData = await this.sizeValidator.getCachedSizeData(async () => {
                        return await this.dataTableRepository.findDataTablesSize();
                    });
                    const remainingSpace = Math.max(0, this.globalConfig.dataTable.maxSize - sizeData.totalBytes);
                    if (fileSize > remainingSpace) {
                        const message = remainingSpace === 0
                            ? `Storage limit exceeded. Current usage: ${(0, size_utils_1.formatBytes)(sizeData.totalBytes)}, Limit: ${(0, size_utils_1.formatBytes)(this.globalConfig.dataTable.maxSize)}`
                            : `File size exceeds remaining storage space. Available: ${(0, size_utils_1.formatBytes)(remainingSpace)}, File: ${(0, size_utils_1.formatBytes)(fileSize)}`;
                        cb(new bad_request_error_1.BadRequestError(message));
                        return;
                    }
                    cb(null, true);
                }
                catch {
                    cb(new bad_request_error_1.BadRequestError('Failed to validate file size'));
                }
            },
        });
    }
    async ensureUploadDirExists() {
        await (0, promises_1.mkdir)(this.uploadDir, { recursive: true });
    }
    single(fieldName) {
        return (req, res, next) => {
            void this.upload.single(fieldName)(req, res, (error) => {
                if (error) {
                    req.fileUploadError = error;
                }
                next();
            });
        };
    }
};
exports.MulterUploadMiddleware = MulterUploadMiddleware;
exports.MulterUploadMiddleware = MulterUploadMiddleware = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [config_1.GlobalConfig,
        data_table_size_validator_service_1.DataTableSizeValidator,
        data_table_repository_1.DataTableRepository])
], MulterUploadMiddleware);
//# sourceMappingURL=multer-upload-middleware.js.map