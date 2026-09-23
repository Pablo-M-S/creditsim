/**
 * loan controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::loan.loan', ({ strapi }) => ({

  async simulate(ctx) {
    const { principal, interestRate, termMonths, amortizationSystem, customerId } =
      ctx.request.body.data || {};

    if (!principal || principal <= 0) {
      return ctx.badRequest('Principal amount must be greater than zero.');
    }
    if (!interestRate || interestRate <= 0) {
      return ctx.badRequest('Interest rate must be greater than zero.');
    }
    if (!termMonths || termMonths <= 0) {
      return ctx.badRequest('Term in months must be greater than zero.');
    }
    if (!['PRICE', 'SAC'].includes(amortizationSystem)) {
      return ctx.badRequest('amortizationSystem must be PRICE or SAC.');
    }
    const loanService = strapi.service('api::loan.loan');

    const iofAmount = loanService.calculateIOF(principal, termMonths);

    const plan = loanService.generateInstallments(
      amortizationSystem,
      principal,
      interestRate,
      termMonths
    );

    const loanData: Record<string, unknown> = {
      principal,
      interestRates: interestRate,
      termMonths,
      amortizationSystem,
      iofAmount,
      loanStatus: 'simulated',
    };

    const effectiveCustomerId = ctx.state.customerId || customerId;

    if (effectiveCustomerId) {
      loanData.customer = effectiveCustomerId;
    }

    const loan = await strapi.documents('api::loan.loan').create({
      data: loanData as any,
      status: 'published',
    });

    const today = new Date();

    const installments = await Promise.all(
      plan.map((item: any) => {
        const dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + item.number);

        return strapi.documents('api::installment.installment').create({
          data: {
            number: item.number,
            dueDate: dueDate.toISOString().split('T')[0],
            amortization: item.amortization,
            interest: item.interest,
            paymentAmount: item.paymentAmount,
            remainingBalance: item.remainingBalance,
            loan: loan.documentId,
          },
          status: 'published',
        });
      })
    );

    ctx.body = {
      data: {
        loan,
        installments,
      },
    };
  },
  async find(ctx) {
    if (ctx.state.customerId) {
      const loans = await strapi.documents('api::loan.loan').findMany({
        filters: { customer: ctx.state.customerId },
      });
      return { data: loans };
    }
    return await super.find(ctx);
  },

}));
