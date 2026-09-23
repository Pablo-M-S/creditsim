export default {
  routes: [
    {
      method: 'POST',
      path: '/loans/simulate',
      handler: 'loan.simulate',
      config: {
        policies: ['api::loan.is-owner-or-admin'],
        auth: {},
      },
    },
    {
      method: 'GET',
      path: '/loans',
      handler: 'loan.find',
      config: {
        policies: ['api::loan.is-owner-or-admin'],
        auth: {},
      },
    },
  ],
};
