// swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)
import * as ethers from 'ethers';
import bn from 'bignumber.js';
import { UniswapTx, ParsedUniswapTx } from './types';

import UniswapPairABI from './abi/pair.json';

import TokenInfo from './TokenInfo';
import provider from './Provider';
import utils from 'web3-utils';

async function parseSwapLog(txHash: string): Promise<ethers.BigNumber[]> {
  try {
    const pairInterface = new ethers.utils.Interface(JSON.parse(UniswapPairABI));
    const receipt = await provider.getTransactionReceipt(txHash);
    const args = pairInterface.parseLog(receipt.logs[4]).args;
    console.log('Desc: ', args.length, args);
    console.log('Args[0]', args[0]);
    console.log('Type', typeof args);
    let amount0In: ethers.BigNumber,
      amount1In: ethers.BigNumber,
      amount0Out: ethers.BigNumber,
      amount1Out: ethers.BigNumber;
    let sender: string, to: string;
    [sender, amount0In, amount1In, amount0Out, amount1Out, to] = args;
    let res: BigInt[] = [];
    return [
      amount0In.gt(amount1In) ? amount0In : amount1In,
      amount0Out.gt(amount1Out) ? amount0Out : amount1Out,
    ];
  } catch (err) {
    console.log(`Error parsing ${txHash}: ${err}`);
    return [];
  }
}

export async function parseUniswapTx(
  tx: UniswapTx,
  valueHex: string,
  txHash: string,
): Promise<ParsedUniswapTx | undefined> {
  const { name, params } = tx;
  const valueBN = BigInt(valueHex);
  const value = utils.fromWei(valueBN.toString(), 'ether');
  let res: ParsedUniswapTx | undefined = undefined;
  switch (name) {
    // function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
    case 'swapExactTokensForETH':
      {
        const swapFrom = params[2].value[0];
        const swapTo = params[2].value.slice(-1)[0];
        const to = params[3].value;

        const tokenA = await TokenInfo.getToken(swapFrom);
        const tokenB = await TokenInfo.getToken(swapTo);

        try {
          const amtInBn = new bn(params[0].value as string);
          const amtOutBn = new bn(params[1].value as string);

          const amtIn = amtInBn.dividedBy(Math.pow(10, tokenA.decimals));
          const amtOutMin = amtOutBn.dividedBy(Math.pow(10, tokenB.decimals));

          res = {
            action: 'swap',
            tokenA,
            tokenB,
            amountA: amtIn.toString(),
            amountB: amtOutMin.toString(),
          };
        } catch (err) {
          console.log(`conversion error ${err}`);
        }
      }
      break;

    // function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
    case 'swapExactETHForTokens':
      {
        const swapFrom = params[1].value[0];
        const swapTo = params[1].value.slice(-1)[0];
        const to = params[2].value;

        const tokenA = await TokenInfo.getToken(swapFrom);
        const tokenB = await TokenInfo.getToken(swapTo);

        try {
          const amtInBn = new bn(params[0].value as string);

          const amtIn = amtInBn.dividedBy(Math.pow(10, tokenA.decimals));

          res = {
            action: 'swap',
            tokenA: 'ETH',
            tokenB,
            amountA: value,
            amountB: amtIn.toString(),
          };
        } catch (err) {
          console.log(`conversion error ${err}`);
        }
      }
      break;

    // function swapExactTokensForTokens(
    //   uint amountIn,
    //   uint amountOutMin,
    //   address[] calldata path,
    //   address to,
    //   uint deadline

    case 'swapExactTokensForTokens':
      const swapFrom = params[2].value[0];
      const swapTo = params[2].value.slice(-1)[0];
      const to = params[3].value;

      const tokenA = await TokenInfo.getToken(swapFrom);
      const tokenB = await TokenInfo.getToken(swapTo);
      try {
        const amtInBn = new bn(params[0].value as string);
        const amtOutBn = new bn(params[1].value as string);

        const amtIn = amtInBn.dividedBy(Math.pow(10, tokenA.decimals));
        const amtOutMin = amtOutBn.dividedBy(Math.pow(10, tokenB.decimals));

        // TODO calculate amounts with decimals taken from tokeninfo ?
        // return `swapExactTokenForTokens: ${to} swapped ${amtIn.toString()} $${
        //   tokenA.symbol
        // } to ${amtOutMin.toString()} $${tokenB.symbol}`;
        res = {
          action: 'swap',
          tokenA,
          tokenB,
          amountA: amtIn.toString(),
          amountB: amtOutMin.toString(),
        };
      } catch (err) {
        console.log(`conversion error ${err}`);
      }

      break;

    // function addLiquidity(
    //   address tokenA,
    //   address tokenB,
    //   uint amountADesired,
    //   uint amountBDesired,
    //   uint amountAMin,
    //   uint amountBMin,
    //   address to,
    //   uint deadline
    case 'addLiquidity':
      {
        const tokenA = await TokenInfo.getToken(params[0].value as string);
        const tokenB = await TokenInfo.getToken(params[1].value as string);
        const to = params[6].value;
        try {
          const amtADesired = new bn(params[2].value as string);
          const amtBDesired = new bn(params[3].value as string);

          const amtA = amtADesired.dividedBy(Math.pow(10, tokenA.decimals));
          const amtB = amtBDesired.dividedBy(Math.pow(10, tokenB.decimals));
          // return `addLiquidity: ${to} added ${amtA} of ${tokenA.symbol} and ${amtB} of ${tokenB.symbol}`;
          res = {
            action: 'add',
            tokenA,
            tokenB,
            amountA: amtA.toString(),
            amountB: amtB.toString(),
          };
        } catch (err) {
          console.log('conversion error at [addLiquidity]');
        }
      }

      break;

    // function addLiquidityETH(
    //   address token,
    //   uint amountTokenDesired,
    //   uint amountTokenMin,
    //   uint amountETHMin,
    //   address to,
    //   uint deadline
    case 'addLiquidityETH':
      {
        const token = await TokenInfo.getToken(params[0].value as string);
        const to = params[4].value;
        try {
          const amtTokenDesired = new bn(params[1].value as string);
          const amtETHDesired = value;

          const amtToken = amtTokenDesired.dividedBy(Math.pow(10, token.decimals));
          // return `addLiquidityETH: ${to} added ${amtToken} of ${token.symbol} and ${value} $ETH`;
          res = {
            action: 'add',
            tokenA: token,
            tokenB: 'ETH',
            amountA: amtToken.toString(),
            amountB: value,
          };
        } catch (err) {
          console.log('error converting bn at [addLiquidityETH');
        }
      }
      break;

    // function removeLiquidity(
    // address tokenA,
    // address tokenB,
    // uint liquidity,
    // uint amountAMin,
    // uint amountBMin,
    // address to,
    // uint deadline)
    case 'removeLiquidity':
      {
        const tokenA = await TokenInfo.getToken(params[0].value as string);
        const tokenB = await TokenInfo.getToken(params[1].value as string);
        const to = params[5].value;
        try {
          const amtAMin = new bn(params[3].value as string);
          const amtBMin = new bn(params[4].value as string);

          const amtA = amtAMin.dividedBy(Math.pow(10, tokenA.decimals));
          const amtB = amtBMin.dividedBy(Math.pow(10, tokenB.decimals));
          // return `addLiquidity: ${to} added ${amtA} of ${tokenA.symbol} and ${amtB} of ${tokenB.symbol}`;
          res = {
            action: 'remove',
            tokenA,
            tokenB,
            amountA: amtA.toString(),
            amountB: amtB.toString(),
          };
        } catch (err) {
          console.log('conversion error at [removeLiquidity]');
        }
      }

      break;

    // function removeLiquidityETH(
    //   address token,
    //   uint liquidity,
    //   uint amountTokenMin,
    //   uint amountETHMin,
    //   address to,
    //   uint deadline
    case 'removeLiquidityETH':
      {
        const token = await TokenInfo.getToken(params[0].value as string);
        const to = params[4].value;
        try {
          const amtTokenMin = new bn(params[2].value as string);
          const amtETHMin = new bn(params[3].value as string);

          const amtToken = amtTokenMin.dividedBy(Math.pow(10, token.decimals));
          const amtETH = amtETHMin.dividedBy(Math.pow(10, token.decimals));
          // return `removeLiquidityETH: ${to} remove ${amtToken} of ${token.symbol} and ${amtETH} $ETH`;
          res = {
            action: 'remove',
            tokenA: token,
            tokenB: 'ETH',
            amountA: amtToken.toString(),
            amountB: amtETH.toString(),
          };
        } catch (err) {
          console.log('error converting bn at [removeLiquidityETH');
        }
      }
      break;

    // function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline
    case 'swapETHForExactTokens':
      {
        const swapFrom = params[1].value[0];
        const swapTo = params[1].value.slice(-1)[0];
        const to = params[2].value;

        const tokenA = await TokenInfo.getToken(swapFrom);
        const tokenB = await TokenInfo.getToken(swapTo);

        try {
          const amtInBn = new bn(params[0].value as string);

          const amtIn = amtInBn.dividedBy(Math.pow(10, tokenA.decimals));

          res = {
            action: 'swap',
            tokenA: 'ETH',
            tokenB,
            amountA: value,
            amountB: amtIn.toString(),
          };
        } catch (err) {
          console.log(`conversion error ${err}`);
        }
      }
      break;

    case 'swapTokensForETH':
      break;

    // function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
    case 'swapTokensForExactETH':
      {
        const swapFrom = params[2].value[0];
        const to = params[3].value;

        const tokenA = await TokenInfo.getToken(swapFrom);

        try {
          const amtInBn = new bn(params[1].value as string);

          const amtIn = amtInBn.dividedBy(Math.pow(10, tokenA.decimals));

          const amtOutBn = new bn(params[0].value as string);
          const amtOut = utils.fromWei(amtOutBn.toString(), 'ether');

          // TODO calculate amounts with decimals taken from tokeninfo ?
          // return `swapETHForExactTokens: ${to} swapped ${value} $ETH for ${amtIn.toString()} $${
          //   tokenB.symbol
          // }`;
          res = {
            action: 'swap',
            tokenA,
            tokenB: 'ETH',
            amountA: amtIn.toString(),
            amountB: amtOut,
          };
        } catch (err) {
          console.log(`conversion error ${err}`);
        }
      }
      break;

    default:
      return undefined;
  }
  if (res?.action === 'swap') {
    const amounts = await parseSwapLog(txHash);
    if (amounts.length > 0) {
      console.log(
        `replacing ${res.amountA} with ${amounts[0].toString()}, ${
          res.amountB
        } with ${amounts[1].toString()}`,
      );
      res.amountA = amounts[0].toString();
      res.amountB = amounts[1].toString();
    }
  }
}
