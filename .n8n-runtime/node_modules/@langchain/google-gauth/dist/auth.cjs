const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __langchain_google_common = require_rolldown_runtime.__toESM(require("@langchain/google-common"));
const google_auth_library = require_rolldown_runtime.__toESM(require("google-auth-library"));

//#region src/auth.ts
var GAuthClient = class extends __langchain_google_common.GoogleAbstractedFetchClient {
	gauth;
	constructor(fields) {
		super();
		const options = (0, __langchain_google_common.ensureAuthOptionScopes)(fields?.authOptions, "scopes", fields?.platformType);
		this.gauth = new google_auth_library.GoogleAuth(options);
		this._fetch = async (...args) => {
			const url = args[0];
			const opts = args[1] ?? {};
			opts.responseType = "stream";
			return await this.gauth.fetch(url, opts);
		};
	}
	get clientType() {
		return "gauth";
	}
	async getProjectId() {
		return this.gauth.getProjectId();
	}
	async request(opts) {
		return this._request(opts?.url, opts, {});
	}
};

//#endregion
exports.GAuthClient = GAuthClient;
//# sourceMappingURL=auth.cjs.map