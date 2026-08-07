let __n8n_constants = require("@n8n/constants");
let nanoid = require("nanoid");

//#region src/workflowId.ts
/**
* Generates a unique 16-character nanoid.
*
* This is the canonical ID generator used across the entire n8n codebase for:
* - Workflow IDs
* - Project IDs
* - Variable IDs
* - API Key IDs
* - And other entity IDs
*
* Both frontend and backend MUST use this function to ensure consistency.
*
* @returns A 16-character ID
*
* @example
* ```ts
* const id = generateNanoId();
* // => 'aBcDeFgHiJkLmNoP' (16 characters)
* ```
*/
const generateNanoId = (0, nanoid.customAlphabet)(__n8n_constants.NANOID_ALPHABET, 16);

//#endregion
Object.defineProperty(exports, 'generateNanoId', {
  enumerable: true,
  get: function () {
    return generateNanoId;
  }
});
//# sourceMappingURL=workflowId2.cjs.map