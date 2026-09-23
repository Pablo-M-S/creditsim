import partnerService from '../src/api/partner/services/partner';

const setEnv = () => {
  process.env.PARTNER_CLIENT_ID = 'bank-mock';
  process.env.PARTNER_CLIENT_SECRET = 'secret-123';
  process.env.PARTNER_TOKEN_SECRET = 'token-secret';
};

describe('partner service', () => {
  beforeEach(() => {
    setEnv();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('isConfigured: true com as 3 variaveis, false sem alguma', () => {
    const service = partnerService();
    expect(service.isConfigured()).toBe(true);
    delete process.env.PARTNER_TOKEN_SECRET;
    expect(service.isConfigured()).toBe(false);
  });

  it('validateClient aceita credenciais corretas', () => {
    expect(partnerService().validateClient('bank-mock', 'secret-123')).toBe(true);
  });

  it('validateClient rejeita secret errado, id errado e vazios', () => {
    const service = partnerService();
    expect(service.validateClient('bank-mock', 'errado')).toBe(false);
    expect(service.validateClient('outro', 'secret-123')).toBe(false);
    expect(service.validateClient('', '')).toBe(false);
  });

  it('issueToken devolve formato OAuth2 Bearer de 1h', () => {
    const result = partnerService().issueToken('bank-mock');
    expect(result.token_type).toBe('Bearer');
    expect(result.expires_in).toBe(3600);
    expect(result.access_token.split('.')).toHaveLength(2);
  });

  it('verifyToken aceita token valido e devolve as claims', () => {
    const service = partnerService();
    const claims = service.verifyToken(service.issueToken('bank-mock').access_token);
    expect(claims.sub).toBe('bank-mock');
    expect(claims.scope).toBe('loans:decision');
  });

  it('verifyToken rejeita token adulterado ou lixo', () => {
    const service = partnerService();
    const token = service.issueToken('bank-mock').access_token;
    expect(service.verifyToken(token.slice(0, -2) + 'aa')).toBeNull();
    expect(service.verifyToken('a.b')).toBeNull();
    expect(service.verifyToken('')).toBeNull();
  });

  it('verifyToken rejeita token assinado com outro secret', () => {
    const service = partnerService();
    const token = service.issueToken('bank-mock').access_token;
    process.env.PARTNER_TOKEN_SECRET = 'outro-secret';
    expect(service.verifyToken(token)).toBeNull();
  });

  it('verifyToken rejeita token expirado', () => {
    const service = partnerService();
    const token = service.issueToken('bank-mock').access_token;
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 3600 * 1000);
    expect(service.verifyToken(token)).toBeNull();
  });
});
