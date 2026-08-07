"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostHogController = void 0;
const config_1 = require("@n8n/config");
const decorators_1 = require("@n8n/decorators");
const di_1 = require("@n8n/di");
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
let PostHogController = class PostHogController {
};
exports.PostHogController = PostHogController;
PostHogController.routers = [
    {
        path: '/',
        router: (() => {
            const router = (0, express_1.Router)();
            const globalConfig = di_1.Container.get(config_1.GlobalConfig);
            const targetUrl = globalConfig.diagnostics.posthogConfig.apiHost;
            const proxy = (0, http_proxy_middleware_1.createProxyMiddleware)({
                target: targetUrl,
                changeOrigin: true,
                on: {
                    proxyReq: (proxyReq, req) => {
                        proxyReq.removeHeader('cookie');
                        const expressReq = req;
                        if (req.method === 'POST' && expressReq.rawBody) {
                            proxyReq.setHeader('Content-Length', expressReq.rawBody.length.toString());
                            proxyReq.write(expressReq.rawBody);
                        }
                    },
                },
            });
            router.use(proxy);
            return router;
        })(),
        skipAuth: true,
    },
];
exports.PostHogController = PostHogController = __decorate([
    (0, decorators_1.RestController)('/ph')
], PostHogController);
//# sourceMappingURL=posthog.controller.js.map