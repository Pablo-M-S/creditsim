export default async (policyContext: any, config: any, { strapi }: any) => {
  const user = policyContext.state.user;

  console.log('DEBUG user:', JSON.stringify(user));

  if (!user) {
    return false;
  }

  const roleName = user.role?.name;

  console.log('DEBUG roleName:', roleName);

  if (roleName === 'Admin-app') {
    return true;
  }

  if (roleName !== 'Customer') {
    return false;
  }

  const customer = await strapi.db.query('api::customer.customer').findOne({
    where: { users_permissions_user: user.id },
  });

  if (!customer) {
    return false;
  }

  policyContext.state.customerId = customer.id;

  return true;
};
