import * as crypto from 'crypto';

/**
 * AgentIdentityManager handles the classical half of an agent identity.
 * PQC signatures must be supplied by an approved FIPS 204 provider; this class
 * deliberately refuses to substitute Ed25519 for ML-DSA.
 */
export class AgentIdentityManager {
  private ed25519PublicKey!: string;
  private ed25519PrivateKey!: string;

  // ML-KEM / ML-DSA (FIPS 204) Post-Quantum Identities
  private pqcConfigured = false;

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys() {
    // 1. Generate or Load Ed25519 Key Pair
    if (process.env.AGENT_ED25519_PRIVATE_KEY && process.env.AGENT_ED25519_PUBLIC_KEY) {
      this.ed25519PrivateKey = process.env.AGENT_ED25519_PRIVATE_KEY.replace(/\\n/g, '\n');
      this.ed25519PublicKey = process.env.AGENT_ED25519_PUBLIC_KEY.replace(/\\n/g, '\n');
    } else {
      console.warn("Generating ephemeral Ed25519 keys. Identity will be lost on restart.");
      const { publicKey: edPub, privateKey: edPriv } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.ed25519PublicKey = edPub;
      this.ed25519PrivateKey = edPriv;
    }

    // Node's built-in crypto does not provide ML-DSA in this runtime. Do not
    // generate an Ed25519 key and label it ML-DSA: that would be a false PQC
    // assurance. An approved external provider must be wired before signing.
    this.pqcConfigured = process.env.AGENT_PQC_PROVIDER === 'fips-204';
  }

  /**
   * Generates a hybrid signature for a given payload.
   * Format: base64(ed25519_sig) + '.' + base64(mldsa_sig)
   */
  public signPayload(payload: string): string {
    void payload;
    throw new Error(this.pqcConfigured
      ? 'FIPS 204 provider integration is not wired into the signing path.'
      : 'PQC signature provider is not configured; refusing a non-PQC hybrid signature.');
  }

  /**
   * Validates a hybrid signature against the agent's public keys.
   */
  public verifySignature(payload: string, hybridSignature: string): boolean {
    try {
      if (!this.pqcConfigured) return false;
      const [edSig, mlSig] = hybridSignature.split('.');
      if (!edSig || !mlSig) return false;

      const verifier = crypto.createVerify('ed25519');
      verifier.update(payload);
      verifier.end();

      const edValid = verifier.verify(this.ed25519PublicKey, edSig, 'base64');
      
      // No ML-DSA verifier is available in Node 22. Never treat the classical
      // signature as a PQC signature; an external provider must verify `mlSig`.
      void mlSig;
      return false;
    } catch (e) {
      return false;
    }
  }

  public getPublicKey(): string {
    return this.ed25519PublicKey; // and potentially mldsa key as part of a DID Document
  }
}

// Export a singleton instance for the server
export const agentIdentity = new AgentIdentityManager();
