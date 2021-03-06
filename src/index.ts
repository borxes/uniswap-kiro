import * as ethers from 'ethers';
import { Telegram } from 'telegraf';
import config from './config';

import routerABI from './abi/uniswap.router.abi';
// @ts-ignore
import * as decoder from 'abi-decoder';

import { Transaction, ERC20Token, ParsedUniswapTx } from './types';
import { parseUniswapTx } from './Parser';
import { exit } from 'process';

const TOKEN_LIST = config.erc20Tokens.split(' ');
console.log(TOKEN_LIST);

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
const UniswapRouter = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
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

async function infuraScanBlock(height: number) {
  const blockInfo = await wsProvider._getBlock(height, true);
  return blockInfo.transactions as Transaction[];
}

async function scanBlock(height: number) {
  console.log(`scanning Block ${height}`);
  const txs = await infuraScanBlock(height);
  console.log(`[scanBlock] Got ${txs.length} transactions in block ${height}`);
  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    if (tx.to === dex) {
      const uniswapTx = decoder.decodeMethod(tx.data);
      const parsed = await parseUniswapTx(uniswapTx, tx.value.toHexString(), tx.hash);
      if (parsed === undefined) {
        console.log(`couldn't parse ${JSON.stringify(uniswapTx)}`);
      }
      // console.log(JSON.stringify(parsed, null, 2));
      // if (parsed && filterTx(parsed)) {
      //   // await telegram.sendMessage(CHANNEL_KIRO, buildMessage(parsed, tx));
      // }
      if (parsed && parsed.action === 'add') {
        console.log(JSON.stringify(parsed), JSON.stringify(tx));
      }
    }
  }
}

wsProvider.on('block', scanBlock);
