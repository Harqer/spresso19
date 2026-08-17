import * as crypto from 'crypto';

/**
 * AgentIdentityManager handles the lifecycle of the AI Agent's Decentralized Identifier (DID)
 * and its cryptographic keys, providing Hybrid Signatures (Ed25519 + ML-DSA).
 */
export class AgentIdentityManager {
  private ed25519PublicKey!: string;
  private ed25519PrivateKey!: string;

  // ML-KEM / ML-DSA (FIPS 204) Post-Quantum Identities
  private mldsaPublicKey!: string;
  private mldsaPrivateKey!: string;

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys() {
    // 1. Generate Ed25519 Key Pair
    const { publicKey: edPub, privateKey: edPriv } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.ed25519PublicKey = edPub;
    this.ed25519PrivateKey = edPriv;

    // 2. Generate ML-DSA (Dilithium) Key Pair (Simulated for Node until native support)
    this.mldsaPublicKey = 'mldsa-public-key-placeholder';
    this.mldsaPrivateKey = 'mldsa-private-key-placeholder';
  }

  /**
   * Generates a hybrid signature for a given payload.
   * Format: base64(ed25519_sig) + '.' + base64(mldsa_sig)
   */
  public signPayload(payload: string): string {
    const signer = crypto.createSign('ed25519');
    signer.update(payload);
    signer.end();
    
    const ed25519Signature = signer.sign(this.ed25519PrivateKey, 'base64');
    
    // Simulate ML-DSA Signature
    const mldsaSignature = Buffer.from(`mldsa-sig-${payload.length}`).toString('base64');

    return `${ed25519Signature}.${mldsaSignature}`;
  }

  /**
   * Validates a hybrid signature against the agent's public keys.
   */
  public verifySignature(payload: string, hybridSignature: string): boolean {
    try {
      const [edSig, mlSig] = hybridSignature.split('.');
      if (!edSig || !mlSig) return false;

      const verifier = crypto.createVerify('ed25519');
      verifier.update(payload);
      verifier.end();

      const edValid = verifier.verify(this.ed25519PublicKey, edSig, 'base64');
      
      // Simulated ML-DSA validation
      const mlValid = mlSig === Buffer.from(`mldsa-sig-${payload.length}`).toString('base64');

      return edValid && mlValid;
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
