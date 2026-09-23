import partnerService from '../src/api/partner/services/partner';
import partnerController from '../src/api/partner/controllers/partner';

const docs = { findOne: jest.fn(), update: jest.fn() };

const strapi = {
  service: () => partnerService(),
  documents: () => docs,
  log: { info: jest.fn() },
};

const controller = partnerController({ strapi });

const makeCtx = (body: any, authorization?: string) => ({
  request: { body, header: { authorization } },
  status: 200,
  body: undefined as any,
  set: jest.fn(),
  unauthorized: jest.fn(),
  badRequest: jest.fn(),
  notFound: jest.fn(),
});

const validToken = () => partnerService().issueToken('bank-mock').access_token;

beforeEach(() => {
  process.env.PARTNER_CLIENT_ID = 'bank-mock';
  process.env.PARTNER_CLIENT_SECRET = 'secret-123';
  process.env.PARTNER_TOKEN_SECRET = 'token-secret';
  docs.findOne.mockReset();
  docs.update.mockReset();
});

describe('POST /partner/oauth/token', () => {
  const credentials = {
    grant_type: 'client_credentials',
    client_id: 'bank-mock',
    client_secret: 'secret-123',
  };

  it('emite token com credenciais validas', async () => {
    const ctx = makeCtx(credentials);
    await controller.token(ctx);
    expect(ctx.body.token_type).toBe('Bearer');
    expect(ctx.body.access_token).toBeDefined();
  });

  it('400 se grant_type nao for client_credentials', async () => {
    const ctx = makeCtx({ ...credentials, grant_type: 'password' });
    await controller.token(ctx);
    expect(ctx.status).toBe(400);
    expect(ctx.body.error).toBe('unsupported_grant_type');
  });

  it('401 com secret errado', async () => {
    const ctx = makeCtx({ ...credentials, client_secret: 'errado' });
    await controller.token(ctx);
    expect(ctx.status).toBe(401);
    expect(ctx.body.error).toBe('invalid_client');
  });

  it('500 se as credenciais do parceiro nao estao configuradas', async () => {
    delete process.env.PARTNER_CLIENT_SECRET;
    const ctx = makeCtx(credentials);
    await controller.token(ctx);
    expect(ctx.status).toBe(500);
  });
});

describe('POST /webhooks/bank-decision', () => {
  it('401 sem token', async () => {
    const ctx = makeCtx({ loanId: 'L1', decision: 'approved' });
    await controller.bankDecision(ctx);
    expect(ctx.unauthorized).toHaveBeenCalled();
    expect(docs.update).not.toHaveBeenCalled();
  });

  it('401 com token invalido', async () => {
    const ctx = makeCtx({ loanId: 'L1', decision: 'approved' }, 'Bearer lixo.lixo');
    await controller.bankDecision(ctx);
    expect(ctx.unauthorized).toHaveBeenCalled();
  });

  it('400 sem loanId', async () => {
    const ctx = makeCtx({ decision: 'approved' }, `Bearer ${validToken()}`);
    await controller.bankDecision(ctx);
    expect(ctx.badRequest).toHaveBeenCalled();
  });

  it('400 com decisao invalida', async () => {
    const ctx = makeCtx({ loanId: 'L1', decision: 'talvez' }, `Bearer ${validToken()}`);
    await controller.bankDecision(ctx);
    expect(ctx.badRequest).toHaveBeenCalled();
    expect(docs.update).not.toHaveBeenCalled();
  });

  it('404 se o loan nao existe', async () => {
    docs.findOne.mockResolvedValue(null);
    const ctx = makeCtx({ loanId: 'L1', decision: 'approved' }, `Bearer ${validToken()}`);
    await controller.bankDecision(ctx);
    expect(ctx.notFound).toHaveBeenCalled();
  });

  it('409 se o loan ja foi decidido (idempotencia)', async () => {
    docs.findOne.mockResolvedValue({ documentId: 'L1', loanStatus: 'approved' });
    const ctx = makeCtx({ loanId: 'L1', decision: 'rejected' }, `Bearer ${validToken()}`);
    await controller.bankDecision(ctx);
    expect(ctx.status).toBe(409);
    expect(docs.update).not.toHaveBeenCalled();
  });

  it('200 aprova um loan simulated', async () => {
    docs.findOne.mockResolvedValue({ documentId: 'L1', loanStatus: 'simulated' });
    docs.update.mockResolvedValue({ documentId: 'L1' });
    const ctx = makeCtx(
      { loanId: 'L1', decision: 'approved', reason: 'score ok' },
      `Bearer ${validToken()}`
    );
    await controller.bankDecision(ctx);

    expect(docs.update).toHaveBeenCalledTimes(1);
    expect(docs.update.mock.calls[0][0]).toEqual({
      documentId: 'L1',
      data: { loanStatus: 'approved' },
      status: 'published',
    });
    expect(ctx.body).toEqual({ data: { documentId: 'L1', loanStatus: 'approved' } });
  });
});
