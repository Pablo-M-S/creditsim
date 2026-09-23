export default {
  routes: [
    {
      method: 'POST',
      path: '/partner/oauth/token',
      handler: 'partner.token',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/webhooks/bank-decision',
      handler: 'partner.bankDecision',
      config: {
        auth: false,
      },
    },
  ],
};
