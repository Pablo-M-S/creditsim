/**
 * loan service
 * A logica de calculo mora em ../utils/finance (funcoes puras, testaveis).
 */

import { factories } from '@strapi/strapi';
import {
  calculateIOF,
  generatePriceInstallments,
  generateSacInstallments,
  generateInstallments,
} from '../utils/finance';

export default factories.createCoreService('api::loan.loan', () => ({
  calculateIOF,
  generatePriceInstallments,
  generateSacInstallments,
  generateInstallments,
}));
