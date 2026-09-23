jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreController: (_uid: string, factory: any) => factory,
    createCoreService: (_uid: string, factory: any) => factory,
  },
}));

import loanControllerFactory from '../src/api/loan/controllers/loan';
import { calculateIOF, generateInstallments } from '../src/api/loan/utils/finance';

const loanDocs = { create: jest.fn(), findMany: jest.fn() };
const installmentDocs = { create: jest.fn() };

const strapi = {
  service: () => ({ calculateIOF, generateInstallments }),
  documents: (uid: string) => (uid === 'api::loan.loan' ? loanDocs : installmentDocs),
};

const controller: any = (loanControllerFactory as any)({ strapi });

const validData = {
  principal: 5000,
  interestRate: 0.02,
  termMonths: 6,
  amortizationSystem: 'PRICE',
};

const makeCtx = (data: any, state: any = {}) => ({
  request: { body: { data } },
  state,
  body: undefined as any,
  badRequest: jest.fn(),
});

beforeEach(() => {
  loanDocs.create.mockReset();
  loanDocs.findMany.mockReset();
  installmentDocs.create.mockReset();
  loanDocs.create.mockResolvedValue({ documentId: 'L1' });
  installmentDocs.create.mockImplementation(async (args: any) => args.data);
});

describe('loan.simulate - validacao', () => {
  it('400 com principal invalido', async () => {
    const ctx = makeCtx({ ...validData, principal: 0 });
    await controller.simulate(ctx);
    expect(ctx.badRequest).toHaveBeenCalled();
    expect(loanDocs.create).not.toHaveBeenCalled();
  });

  it('400 com taxa invalida', async () => {
    const ctx = makeCtx({ ...validData, interestRate: -1 });
    await controller.simulate(ctx);
    expect(ctx.badRequest).toHaveBeenCalled();
  });

  it('400 com prazo invalido', async () => {
    const ctx = makeCtx({ ...validData, termMonths: 0 });
    await controller.simulate(ctx);
    expect(ctx.badRequest).toHaveBeenCalled();
  });

  it('400 com sistema de amortizacao invalido', async () => {
    const ctx = makeCtx({ ...validData, amortizationSystem: 'XYZ' });
    await controller.simulate(ctx);
    expect(ctx.badRequest).toHaveBeenCalled();
  });
});

describe('loan.simulate - persistencia', () => {
  it('cria o loan simulated e uma parcela por mes', async () => {
    const ctx = makeCtx(validData);
    await controller.simulate(ctx);

    const created = loanDocs.create.mock.calls[0][0].data;
    expect(created.loanStatus).toBe('simulated');
    expect(created.principal).toBe(5000);
    expect(installmentDocs.create).toHaveBeenCalledTimes(6);
    expect(ctx.body.data.installments).toHaveLength(6);
  });

  it('vincula cada parcela ao loan criado', async () => {
    await controller.simulate(makeCtx(validData));
    installmentDocs.create.mock.calls.forEach((call: any) => {
      expect(call[0].data.loan).toBe('L1');
    });
  });

  it('customerId da policy tem prioridade sobre o do body', async () => {
    const ctx = makeCtx({ ...validData, customerId: 99 }, { customerId: 7 });
    await controller.simulate(ctx);
    expect(loanDocs.create.mock.calls[0][0].data.customer).toBe(7);
  });
});

describe('loan.find - isolamento por customer', () => {
  it('customer logado ve so os proprios loans', async () => {
    loanDocs.findMany.mockResolvedValue([{ documentId: 'L1' }]);
    const ctx = makeCtx(undefined, { customerId: 5 });
    const result = await controller.find(ctx);

    expect(loanDocs.findMany.mock.calls[0][0]).toEqual({ filters: { customer: 5 } });
    expect(result).toEqual({ data: [{ documentId: 'L1' }] });
  });

  it('admin (sem customerId) cai no find padrao, sem filtro', async () => {
    const superFind = jest.fn().mockResolvedValue('TODOS');
    Object.setPrototypeOf(controller, { find: superFind });

    const result = await controller.find(makeCtx(undefined, {}));

    expect(result).toBe('TODOS');
    expect(loanDocs.findMany).not.toHaveBeenCalled();
  });
});
