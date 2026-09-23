import {
  calculateIOF,
  generatePriceInstallments,
  generateSacInstallments,
  generateInstallments,
} from '../src/api/loan/utils/finance';

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);

describe('calculateIOF', () => {
  it('soma taxa fixa e taxa diaria (12 meses = 360 dias)', () => {
    expect(calculateIOF(1000, 12)).toBe(33.32);
  });

  it('limita a taxa diaria a 365 dias', () => {
    expect(calculateIOF(1000, 24)).toBe(33.73);
    expect(calculateIOF(1000, 13)).toBe(calculateIOF(1000, 24));
  });

  it('escala proporcionalmente ao valor', () => {
    expect(calculateIOF(2000, 12)).toBe(66.64);
  });
});

describe('PRICE', () => {
  const plan = generatePriceInstallments(1000, 0.01, 12);

  it('gera uma parcela por mes, numeradas de 1 a n', () => {
    expect(plan).toHaveLength(12);
    expect(plan[0].number).toBe(1);
    expect(plan[11].number).toBe(12);
  });

  it('mantem a parcela fixa', () => {
    plan.forEach((item) => expect(item.paymentAmount).toBe(88.85));
  });

  it('juros da 1a parcela = saldo * taxa', () => {
    expect(plan[0].interest).toBe(10);
  });

  it('juros caem e amortizacao cresce ao longo do tempo', () => {
    expect(plan[11].interest).toBeLessThan(plan[0].interest);
    expect(plan[11].amortization).toBeGreaterThan(plan[0].amortization);
  });

  it('quita o principal e zera o saldo devedor', () => {
    expect(Math.abs(sum(plan.map((p) => p.amortization)) - 1000)).toBeLessThan(0.1);
    expect(plan[11].remainingBalance).toBeCloseTo(0, 2);
  });
});

describe('SAC', () => {
  const plan = generateSacInstallments(1200, 0.01, 12);

  it('amortizacao constante', () => {
    plan.forEach((item) => expect(item.amortization).toBe(100));
  });

  it('1a parcela = amortizacao + juros sobre o saldo total', () => {
    expect(plan[0].interest).toBe(12);
    expect(plan[0].paymentAmount).toBe(112);
  });

  it('ultima parcela = amortizacao + juros do ultimo saldo', () => {
    expect(plan[11].interest).toBe(1);
    expect(plan[11].paymentAmount).toBe(101);
    expect(plan[11].remainingBalance).toBe(0);
  });

  it('parcelas decrescentes', () => {
    for (let k = 1; k < plan.length; k++) {
      expect(plan[k].paymentAmount).toBeLessThan(plan[k - 1].paymentAmount);
    }
  });
});

describe('generateInstallments', () => {
  it('SAC usa o sistema SAC', () => {
    expect(generateInstallments('SAC', 1200, 0.01, 12)).toEqual(
      generateSacInstallments(1200, 0.01, 12)
    );
  });

  it('PRICE usa o sistema PRICE', () => {
    expect(generateInstallments('PRICE', 1000, 0.01, 12)).toEqual(
      generatePriceInstallments(1000, 0.01, 12)
    );
  });
});
