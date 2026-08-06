interface NpmCommandOptions {
    cwd?: string;
    doNotHandleError?: boolean;
}
export declare function executeNpmCommand(args: string[], options?: NpmCommandOptions): Promise<string>;
export declare function verifyIntegrity(packageName: string, version: string, registryUrl: string, expectedIntegrity: string): Promise<void>;
export declare function checkIfVersionExistsOrThrow(packageName: string, version: string, registryUrl: string): Promise<true>;
export {};
