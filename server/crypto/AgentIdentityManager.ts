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

    // 2. Generate or Load ML-DSA (Dilithium) Key Pair (Simulated for Node until native support)
    if (process.env.AGENT_MLDSA_PRIVATE_KEY && process.env.AGENT_MLDSA_PUBLIC_KEY) {
      this.mldsaPrivateKey = process.env.AGENT_MLDSA_PRIVATE_KEY.replace(/\\n/g, '\n');
      this.mldsaPublicKey = process.env.AGENT_MLDSA_PUBLIC_KEY.replace(/\\n/g, '\n');
    } else {
      console.warn("Generating ephemeral ML-DSA cryptographic simulation keys. Identity will be lost on restart.");
      const { publicKey: mlPub, privateKey: mlPriv } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.mldsaPublicKey = mlPub;
      this.mldsaPrivateKey = mlPriv;
    }
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
    
    // Simulate ML-DSA Signature using secondary ed25519 key
    const mlSigner = crypto.createSign('ed25519');
    mlSigner.update(payload);
    mlSigner.end();
    const mldsaSignature = mlSigner.sign(this.mldsaPrivateKey, 'base64');

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
      const mlVerifier = crypto.createVerify('ed25519');
      mlVerifier.update(payload);
      mlVerifier.end();
      const mlValid = mlVerifier.verify(this.mldsaPublicKey, mlSig, 'base64');

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
