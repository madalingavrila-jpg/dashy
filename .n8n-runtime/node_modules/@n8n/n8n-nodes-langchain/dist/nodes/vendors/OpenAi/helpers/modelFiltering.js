"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldIncludeModel = shouldIncludeModel;
function shouldIncludeModel(modelId, isCustomAPI) {
    if (isCustomAPI) {
        return true;
    }
    return !(modelId.startsWith('babbage') ||
        modelId.startsWith('davinci') ||
        modelId.startsWith('computer-use') ||
        modelId.startsWith('dall-e') ||
        modelId.startsWith('text-embedding') ||
        modelId.startsWith('tts') ||
        modelId.includes('-tts') ||
        modelId.startsWith('whisper') ||
        modelId.startsWith('omni-moderation') ||
        modelId.startsWith('sora') ||
        modelId.includes('-realtime') ||
        (modelId.startsWith('gpt-') && modelId.includes('instruct')));
}
//# sourceMappingURL=modelFiltering.js.map