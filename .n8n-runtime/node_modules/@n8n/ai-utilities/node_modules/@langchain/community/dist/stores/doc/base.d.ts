import { Document } from "@langchain/core/documents";

//#region src/stores/doc/base.d.ts

/**
 * Abstract class for a document store. All document stores should extend
 * this class.
 */
declare abstract class Docstore {
  abstract search(search: string): Promise<Document>;
  abstract add(texts: Record<string, Document>): Promise<void>;
}
//#endregion
export { Docstore, base_d_exports };
//# sourceMappingURL=base.d.ts.map