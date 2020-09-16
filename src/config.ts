require('dotenv').config();
export default {
  telegramToken: process.env.TELEGRAM_TOKEN || '',
  infuraToken: process.env.INFURA_TOKEN || '',
  erc20Tokens: process.env.ERC20TOKENS || 'KIRO',
};
