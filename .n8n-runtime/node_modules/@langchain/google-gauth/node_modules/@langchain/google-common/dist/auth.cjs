const require_stream = require('./utils/stream.cjs');

//#region src/auth.ts
var GoogleAbstractedFetchClient = class {
	_fetch = fetch;
	async _buildData(res, opts) {
		switch (opts.responseType) {
			case "json": return res.json();
			case "stream": return new require_stream.ReadableJsonStream(res.body);
			default: return res.blob();
		}
	}
	async _request(url, opts, additionalHeaders) {
		if (url == null) throw new Error("Missing URL");
		const fetchOptions = {
			method: opts.method,
			headers: {
				"Content-Type": "application/json",
				...opts.headers ?? {},
				...additionalHeaders ?? {}
			}
		};
		if (opts.data !== void 0) if (typeof opts.data === "string") fetchOptions.body = opts.data;
		else fetchOptions.body = JSON.stringify(opts.data);
		const res = await this._fetch(url, fetchOptions);
		if (!res.ok) {
			const resText = await res.text();
			const error = /* @__PURE__ */ new Error(`Google request failed with status code ${res.status}: ${resText}`);
			error.response = res;
			error.details = {
				url,
				opts,
				fetchOptions,
				result: res
			};
			throw error;
		}
		const data = await this._buildData(res, opts);
		return {
			data,
			config: {},
			status: res.status,
			statusText: res.statusText,
			headers: res.headers,
			request: { responseURL: res.url }
		};
	}
};
var ApiKeyGoogleAuth = class extends GoogleAbstractedFetchClient {
	apiKey;
	constructor(apiKey) {
		super();
		this.apiKey = apiKey;
	}
	get clientType() {
		return "apiKey";
	}
	getProjectId() {
		throw new Error("APIs that require a project ID cannot use an API key");
	}
	request(opts) {
		const authHeader = { "X-Goog-Api-Key": this.apiKey };
		return this._request(opts.url, opts, authHeader);
	}
};
function aiPlatformScope(platform) {
	switch (platform) {
		case "gai": return ["https://www.googleapis.com/auth/generative-language"];
		default: return ["https://www.googleapis.com/auth/cloud-platform"];
	}
}
function ensureAuthOptionScopes(authOption, scopeProperty, scopesOrPlatform) {
	if (authOption && Object.hasOwn(authOption, scopeProperty)) return authOption;
	const scopes = Array.isArray(scopesOrPlatform) ? scopesOrPlatform : aiPlatformScope(scopesOrPlatform ?? "gcp");
	return {
		[scopeProperty]: scopes,
		...authOption ?? {}
	};
}

//#endregion
exports.ApiKeyGoogleAuth = ApiKeyGoogleAuth;
exports.GoogleAbstractedFetchClient = GoogleAbstractedFetchClient;
exports.aiPlatformScope = aiPlatformScope;
exports.ensureAuthOptionScopes = ensureAuthOptionScopes;
//# sourceMappingURL=auth.cjs.map