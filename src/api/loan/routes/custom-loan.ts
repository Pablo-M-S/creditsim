export default {
  routes: [
    {
      method: 'POST',
      path: '/loans/simulate',
      handler: 'loan.simulate',
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
};
