/**
 * partner service
 * Mock de OAuth2 (client_credentials) para o "banco parceiro".
 * Token stateless assinado com HMAC-SHA256 (payload.assinatura).
 */

import * as crypto from 'crypto';

const TOKEN_TTL_SECONDS = 3600;

const b64 = (value: string) => Buffer.from(value).toString('base64url');

const sign = (data: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(data).digest('base64url');

// Comparacao em tempo constante (hash antes para igualar tamanhos)
const safeEqual = (a: string, b: string) => {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

export default () => ({
  isConfigured(): boolean {
    return Boolean(
      process.env.PARTNER_CLIENT_ID &&
        process.env.PARTNER_CLIENT_SECRET &&
        process.env.PARTNER_TOKEN_SECRET
    );
  },

  validateClient(clientId: string, clientSecret: string): boolean {
    if (!clientId || !clientSecret) return false;
    const idOk = safeEqual(clientId, process.env.PARTNER_CLIENT_ID as string);
    const secretOk = safeEqual(clientSecret, process.env.PARTNER_CLIENT_SECRET as string);
    return idOk && secretOk;
  },

  issueToken(clientId: string) {
    const now = Math.floor(Date.now() / 1000);
    const payload = b64(
      JSON.stringify({
        sub: clientId,
        scope: 'loans:decision',
        iat: now,
        exp: now + TOKEN_TTL_SECONDS,
      })
    );
    const signature = sign(payload, process.env.PARTNER_TOKEN_SECRET as string);

    return {
      access_token: `${payload}.${signature}`,
      token_type: 'Bearer',
      expires_in: TOKEN_TTL_SECONDS,
    };
  },

  verifyToken(token: string) {
    const secret = process.env.PARTNER_TOKEN_SECRET;
    if (!secret || !token) return null;

    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    if (!safeEqual(signature, sign(payload, secret))) return null;

    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (typeof claims.exp !== 'number') return null;
      if (claims.exp < Math.floor(Date.now() / 1000)) return null;
      return claims;
    } catch (error) {
      return null;
    }
  },
});
