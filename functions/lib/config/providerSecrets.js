"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderSecretConfigurationError = void 0;
exports.assertInfisicalRuntimeConfiguration = assertInfisicalRuntimeConfiguration;
exports.loadProviderSecrets = loadProviderSecrets;
exports.assertSecretPresence = assertSecretPresence;
/**
 * Provider credentials are injected into these server-only runtime names by
 * the deployment secret mechanism (Infisical KYZO in deployed environments).
 * The values are intentionally never read at module load time or logged.
 * Deployment entrypoints bind only the credentials they consume; this shared
 * resolver does not declare Firebase Secret Manager bindings of its own.
 */
const INFISICAL_PROJECT = "KYZO";
const infisicalProjectEnv = "INFISICAL_PROJECT_ID";
const infisicalEnvironmentEnv = "INFISICAL_ENVIRONMENT";
const infisicalSecretPathEnv = "INFISICAL_SECRET_PATH";
class ProviderSecretConfigurationError extends Error {
    constructor(missing) {
        super(`Provider configuration is incomplete: missing ${missing.join(", ")}.`);
        this.name = "ProviderSecretConfigurationError";
        this.missing = missing;
    }
}
exports.ProviderSecretConfigurationError = ProviderSecretConfigurationError;
/**
 * Verify the non-secret provenance supplied by the Infisical runtime injector.
 * Secret payloads remain external to the process configuration and are never
 * included in this result or in configuration errors.
 */
function assertInfisicalRuntimeConfiguration() {
    var _a, _b, _c;
    const project = (_a = process.env[infisicalProjectEnv]) === null || _a === void 0 ? void 0 : _a.trim();
    const environment = (_b = process.env[infisicalEnvironmentEnv]) === null || _b === void 0 ? void 0 : _b.trim();
    const secretPath = (_c = process.env[infisicalSecretPathEnv]) === null || _c === void 0 ? void 0 : _c.trim();
    const missing = [
        !project || project !== INFISICAL_PROJECT ? infisicalProjectEnv : "",
        !environment ? infisicalEnvironmentEnv : "",
        !secretPath ? infisicalSecretPathEnv : "",
    ].filter((name) => name.length > 0);
    if (missing.length > 0) {
        throw new ProviderSecretConfigurationError(missing);
    }
    return { project: INFISICAL_PROJECT, environment: environment, secretPath: secretPath };
}
function readSecret(name) {
    var _a;
    const value = (_a = process.env[name]) === null || _a === void 0 ? void 0 : _a.trim();
    return value && value.length > 0 ? value : undefined;
}
/**
 * Resolve provider credentials at request/runtime execution time.
 * NVIDIA inference is required; all other provider credentials are optional.
 */
async function loadProviderSecrets() {
    assertInfisicalRuntimeConfiguration();
    const nvidia = readSecret("NVIDIA_API_KEY");
    if (!nvidia) {
        throw new ProviderSecretConfigurationError(["NVIDIA_API_KEY"]);
    }
    return {
        nvidiaApiKey: nvidia,
        geminiApiKey: readSecret("GEMINI_API_KEY"),
        higgsfieldKeyId: readSecret("HIGGSFIELD_API_KEY_ID"),
        higgsfieldKeySecret: readSecret("HIGGSFIELD_KEY_SECRET"),
    };
}
/** Return configuration status without exposing credential material. */
async function assertSecretPresence() {
    assertInfisicalRuntimeConfiguration();
    const nvidia = Boolean(readSecret("NVIDIA_API_KEY"));
    const mediaFallback = Boolean(readSecret("HIGGSFIELD_API_KEY_ID") && readSecret("HIGGSFIELD_KEY_SECRET"));
    return { nvidia, mediaFallback };
}
//# sourceMappingURL=providerSecrets.js.map