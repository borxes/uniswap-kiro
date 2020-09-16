// import { ChainId, Token, Fetcher } from '@uniswap/sdk';
import * as ethers from 'ethers';
import erc20ABI from './abi/erc20.abi';
import { ERC20Token } from './types';

const restProvider = new ethers.providers.InfuraProvider(
  'homestead',
  'bd8dbc67da2e4159a57ec66002b9ae2c',
);

export default class TokenInfo {
  static tokenCache: { [address: string]: ERC20Token } = {};

  static async getToken(address: string) {
    if (!TokenInfo.tokenCache[address]) {
      const tokenContract = new ethers.Contract(address, erc20ABI, restProvider);
      // const [decimals, symbol] = [await tokenContract.decimals(), await tokenContract.symbol()];
      let decimals, symbol;
      try {
        decimals = await tokenContract.decimals();
        symbol = await tokenContract.symbol();
      } catch (err) {
        console.log(`[TokenInfo.getToken] error ${err} for erc20 at ${address}`);
        decimals = 18;
        symbol = address.slice(0, 8);
      }
      TokenInfo.tokenCache[address] = {
        decimals,
        symbol,
        address,
      };
      console.log(`[getToken] got ${JSON.stringify(TokenInfo.tokenCache[address])} for ${address}`);
    }
    return TokenInfo.tokenCache[address];
  }
}
