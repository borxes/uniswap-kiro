require('dotenv').config();
export default {
  telegramToken: process.env.TELEGRAM_TOKEN || '',
  infuraToken: process.env.INFURA_TOKEN || '',
};
