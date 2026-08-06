"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureOpenAIErrorType = exports.AuthenticationType = void 0;
var AuthenticationType;
(function (AuthenticationType) {
    AuthenticationType["ApiKey"] = "azureOpenAiApi";
    AuthenticationType["EntraOAuth2"] = "azureEntraCognitiveServicesOAuth2Api";
})(AuthenticationType || (exports.AuthenticationType = AuthenticationType = {}));
var AzureOpenAIErrorType;
(function (AzureOpenAIErrorType) {
    AzureOpenAIErrorType["AuthenticationError"] = "AuthenticationError";
    AzureOpenAIErrorType["ConfigurationError"] = "ConfigurationError";
    AzureOpenAIErrorType["APIError"] = "APIError";
    AzureOpenAIErrorType["UnknownError"] = "UnknownError";
})(AzureOpenAIErrorType || (exports.AzureOpenAIErrorType = AzureOpenAIErrorType = {}));
//# sourceMappingURL=types.js.map