/**
 * Motor de calculo financeiro (funcoes puras, sem dependencia do Strapi).
 * Usado pelo service `api::loan.loan` e testado em tests/finance.test.ts.
 */

export interface InstallmentPlanItem {
  number: number;
  amortization: number;
  interest: number;
  paymentAmount: number;
  remainingBalance: number;
}

export const round2 = (value: number) => Math.round(value * 100) / 100;

// Taxa fixa (0.38%) + taxa diaria (0.0082% ao dia, maximo 365 dias) sobre o valor solicitado
export function calculateIOF(principal: number, termMonths: number): number {
  const dailyRate = 0.000082;
  const fixedRate = 0.0038;
  const days = termMonths * 30;
  const cappedDays = Math.min(days, 365);

  const dailyIOF = principal * dailyRate * cappedDays;
  const fixedIOF = principal * fixedRate;

  return round2(dailyIOF + fixedIOF);
}

// Sistema PRICE: parcelas fixas
export function generatePriceInstallments(
  principal: number,
  interestRate: number,
  termMonths: number
): InstallmentPlanItem[] {
  const installments: InstallmentPlanItem[] = [];
  const i = interestRate;
  const n = termMonths;

  const paymentAmount = (principal * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);

  let balance = principal;

  for (let month = 1; month <= n; month++) {
    const interest = balance * i;
    const amortization = paymentAmount - interest;
    balance = balance - amortization;

    installments.push({
      number: month,
      amortization: round2(amortization),
      interest: round2(interest),
      paymentAmount: round2(paymentAmount),
      remainingBalance: round2(Math.max(balance, 0)),
    });
  }

  return installments;
}

// Sistema SAC: amortizacao constante
export function generateSacInstallments(
  principal: number,
  interestRate: number,
  termMonths: number
): InstallmentPlanItem[] {
  const installments: InstallmentPlanItem[] = [];
  const i = interestRate;
  const n = termMonths;

  const amortization = principal / n;
  let balance = principal;

  for (let month = 1; month <= n; month++) {
    const interest = balance * i;
    const paymentAmount = amortization + interest;
    balance = balance - amortization;

    installments.push({
      number: month,
      amortization: round2(amortization),
      interest: round2(interest),
      paymentAmount: round2(paymentAmount),
      remainingBalance: round2(Math.max(balance, 0)),
    });
  }

  return installments;
}

export function generateInstallments(
  system: 'PRICE' | 'SAC',
  principal: number,
  interestRate: number,
  termMonths: number
): InstallmentPlanItem[] {
  if (system === 'SAC') {
    return generateSacInstallments(principal, interestRate, termMonths);
  }
  return generatePriceInstallments(principal, interestRate, termMonths);
}
