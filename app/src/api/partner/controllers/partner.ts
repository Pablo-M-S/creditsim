/**
 * partner controller
 * - token: mock OAuth2 client_credentials
 * - bankDecision: webhook em que o banco parceiro aprova/rejeita um loan
 */

export default ({ strapi }: { strapi: any }) => ({
  async token(ctx: any) {
    const partner = strapi.service('api::partner.partner');

    if (!partner.isConfigured()) {
      ctx.status = 500;
      ctx.body = { error: 'server_error', error_description: 'Partner credentials not configured.' };
      return;
    }

    const body = ctx.request.body || {};

    if (body.grant_type !== 'client_credentials') {
      ctx.status = 400;
      ctx.body = { error: 'unsupported_grant_type' };
      return;
    }

    if (!partner.validateClient(body.client_id, body.client_secret)) {
      ctx.status = 401;
      ctx.body = { error: 'invalid_client' };
      return;
    }

    ctx.set('Cache-Control', 'no-store');
    ctx.body = partner.issueToken(body.client_id);
  },

  async bankDecision(ctx: any) {
    const partner = strapi.service('api::partner.partner');

    const header: string = ctx.request.header.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token || !partner.verifyToken(token)) {
      return ctx.unauthorized('Invalid or missing partner token.');
    }

    const { loanId, decision, reason } = ctx.request.body || {};

    if (!loanId || typeof loanId !== 'string') {
      return ctx.badRequest('loanId (documentId) is required.');
    }
    if (!['approved', 'rejected'].includes(decision)) {
      return ctx.badRequest('decision must be "approved" or "rejected".');
    }

    const loan = await strapi.documents('api::loan.loan').findOne({
      documentId: loanId,
      status: 'published',
    });
    if (!loan) {
      return ctx.notFound('Loan not found.');
    }

    // So decide sobre loan ainda "simulated"; repetir o webhook nao altera nada
    if (loan.loanStatus !== 'simulated') {
      ctx.status = 409;
      ctx.body = {
        error: {
          status: 409,
          name: 'ConflictError',
          message: `Loan already ${loan.loanStatus}.`,
        },
      };
      return;
    }

    const updated = await strapi.documents('api::loan.loan').update({
      documentId: loanId,
      data: { loanStatus: decision },
      status: 'published',
    });

    strapi.log.info(
      `[partner] loan ${loanId} -> ${decision}${reason ? ` (${String(reason)})` : ''}`
    );

    ctx.body = {
      data: { documentId: updated.documentId, loanStatus: decision },
    };
  },
});
