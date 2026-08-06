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
exports.compressFolder = compressFolder;
exports.decompressFolder = decompressFolder;
const fflate = __importStar(require("fflate"));
const promises_1 = require("fs/promises");
const path = __importStar(require("path"));
const fs_1 = require("fs");
const backend_common_1 = require("@n8n/backend-common");
const ALREADY_COMPRESSED = [
    '7z',
    'aifc',
    'bz2',
    'doc',
    'docx',
    'gif',
    'gz',
    'heic',
    'heif',
    'jpg',
    'jpeg',
    'mov',
    'mp3',
    'mp4',
    'pdf',
    'png',
    'ppt',
    'pptx',
    'rar',
    'webm',
    'webp',
    'xls',
    'xlsx',
    'zip',
];
function sanitizePath(fileName, outputDir) {
    const normalizedPath = path.normalize(fileName);
    const resolvedPath = path.resolve(outputDir, normalizedPath);
    const resolvedOutputDir = path.resolve(outputDir);
    if (!resolvedPath.startsWith(resolvedOutputDir + path.sep) &&
        resolvedPath !== resolvedOutputDir) {
        throw new Error(`Path traversal detected: ${fileName} would be extracted outside the output directory`);
    }
    return resolvedPath;
}
async function compressFolder(sourceDir, outputPath, options = {}) {
    const { level = 6, exclude = [], includeHidden = false } = options;
    const outputDir = path.dirname(outputPath);
    await (0, promises_1.mkdir)(outputDir, { recursive: true });
    const outputStream = (0, fs_1.createWriteStream)(outputPath);
    const zip = new fflate.Zip();
    zip.ondata = (error, data, final) => {
        if (error) {
            outputStream.destroy(error);
            return;
        }
        outputStream.write(Buffer.from(data));
        if (final) {
            outputStream.end();
        }
    };
    await addDirectoryToZipStreaming(sourceDir, '', zip, { exclude, includeHidden, level });
    zip.end();
    return await new Promise((resolve, reject) => {
        outputStream.on('finish', resolve);
        outputStream.on('error', reject);
    });
}
async function decompressFolder(sourcePath, outputDir) {
    await (0, promises_1.mkdir)(outputDir, { recursive: true });
    return await new Promise(async (resolve, reject) => {
        let filesToProcess = 0;
        const unzip = new fflate.Unzip((stream) => {
            if (!stream.name.endsWith('/')) {
                filesToProcess++;
                const chunks = [];
                let totalLength = 0;
                const filePath = sanitizePath(stream.name, outputDir);
                const dirPath = path.dirname(filePath);
                (0, promises_1.mkdir)(dirPath, { recursive: true }).catch((error) => {
                    if (error.code !== 'EEXIST') {
                        reject(error);
                    }
                });
                stream.ondata = async (error, chunk, final) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    chunks.push(chunk);
                    totalLength += chunk.length;
                    if (final) {
                        const finalBuffer = new Uint8Array(totalLength);
                        let offset = 0;
                        for (const chunk of chunks) {
                            finalBuffer.set(chunk, offset);
                            offset += chunk.length;
                        }
                        await (0, promises_1.writeFile)(filePath, Buffer.from(finalBuffer));
                        filesToProcess--;
                        if (filesToProcess === 0) {
                            resolve();
                        }
                    }
                };
                stream.start();
            }
        });
        unzip.register(fflate.AsyncUnzipInflate);
        const zipStream = (0, fs_1.createReadStream)(sourcePath);
        for await (const chunk of zipStream) {
            unzip.push(chunk);
        }
        zipStream.on('error', reject);
        if (filesToProcess === 0) {
            resolve();
        }
    });
}
async function addDirectoryToZipStreaming(dirPath, zipPath, zip, options) {
    const { exclude, includeHidden, level } = options;
    const entries = await (0, promises_1.readdir)(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        if (!includeHidden && entry.name.startsWith('.')) {
            continue;
        }
        if (exclude.some((pattern) => pattern.startsWith('*.')
            ? entry.name.endsWith(pattern.slice(1))
            : entry.name.includes(pattern))) {
            continue;
        }
        const fullPath = (0, backend_common_1.safeJoinPath)(dirPath, entry.name);
        const zipEntryPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            await addDirectoryToZipStreaming(fullPath, zipEntryPath, zip, options);
        }
        else {
            const fileExtension = path.extname(entry.name).toLowerCase().slice(1);
            const compressionLevel = ALREADY_COMPRESSED.includes(fileExtension)
                ? 0
                : level;
            const zipStream = new fflate.ZipDeflate(zipEntryPath, { level: compressionLevel });
            zip.add(zipStream);
            const fileContent = await (0, promises_1.readFile)(fullPath);
            zipStream.push(new Uint8Array(fileContent), true);
        }
    }
}
//# sourceMappingURL=compression.util.js.map