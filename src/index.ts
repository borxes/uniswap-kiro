import * as ethers from 'ethers';
import { Telegram } from 'telegraf';
import config from './config';

import routerABI from './abi/uniswap.router.abi';
// @ts-ignore
import * as decoder from 'abi-decoder';

import { Transaction, ERC20Token, ParsedUniswapTx } from './types';
import { parseUniswapTx } from './Parser';
import { CloudflareEth } from './Cloudflare';
import { exit } from 'process';
import { PRIORITY_BELOW_NORMAL } from 'constants';

const TOKEN_LIST = ['KIRO', 'YFI', 'PICKLE', 'SUSHI', 'MTA', 'AMPL', 'SAFE'];

const CHANNEL_KIRO = '-1001488214429';

if (!config.telegramToken) {
  console.error('No Telegram Token provided');
  exit();
}

if (!config.infuraToken) {
  console.error('No Infura Token provided');
  exit();
}

const INFURA = `wss://mainnet.infura.io/ws/v3/${config.infuraToken}`;
const UniswapRouter = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d';
const SushiRouter = '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f';

const dex = UniswapRouter;

const wsProvider = new ethers.providers.WebSocketProvider(INFURA);
decoder.addABI(routerABI);

const telegram = new Telegram(config.telegramToken);

function buildMessage(tx: ParsedUniswapTx, fullTx: Transaction) {
  function tokenSymbol(token: ERC20Token | 'ETH') {
    return token === 'ETH' ? 'ETH' : token.symbol;
  }

  let res = '';
  switch (tx.action) {
    case 'swap':
      res += `Traded ${tx.amountA} of $${tokenSymbol(tx.tokenA)} for 
        ${tx.amountB} of $${tokenSymbol(tx.tokenB)}`;
      break;

    case 'add':
      res += `Added liquidity of ${tx.amountA} $${tokenSymbol(tx.tokenA)} and ${
        tx.amountB
      } $${tokenSymbol(tx.tokenB)}`;
      break;

    case 'remove':
      res += `Removed liquidity of ${tx.amountA} $${tokenSymbol(tx.tokenA)} and ${
        tx.amountB
      } $${tokenSymbol(tx.tokenB)}`;
      break;
  }
  return `${res}\n https://etherscan.io/tx/${fullTx.hash}`;
}

function filterTx(tx: ParsedUniswapTx | undefined) {
  if (!tx) return false;
  return (
    (tx.tokenA !== 'ETH' && TOKEN_LIST.includes(tx.tokenA.symbol)) ||
    (tx.tokenB !== 'ETH' && TOKEN_LIST.includes(tx.tokenB.symbol))
  );
}

async function scanBlock(height: number) {
  console.log(`scanning Block ${height}`);
  const txs = await CloudflareEth.scanBlock(height);
  console.log(`[scanBlock] Got ${txs.length} transactions in block ${height}`);
  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    if (tx.to === dex) {
      const uniswapTx = decoder.decodeMethod(tx.input);
      const parsed = await parseUniswapTx(uniswapTx, tx.value);
      if (parsed === undefined) {
        console.log(`couldn't parse ${JSON.stringify(uniswapTx)}`);
      }
      console.log(JSON.stringify(parsed, null, 2));
      if (parsed && filterTx(parsed)) {
        await telegram.sendMessage(CHANNEL_KIRO, buildMessage(parsed, tx));
      }
    }
  }
}

wsProvider.on('block', scanBlock);
