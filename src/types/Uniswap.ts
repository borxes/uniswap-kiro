import { ERC20Token } from './Token';

type UniswapTxName =
  | 'swapExactTokensForETH'
  | 'swapExactTokensForTokens'
  | 'swapExactETHForTokens'
  | 'swapETHForExactTokens'
  | 'swapTokensForExactETH'
  | 'swapTokensForETH'
  | 'swapTokensForExactTokens';

// {"name":"swapExactETHForTokens",
// "params":[{"name":"amountOutMin","value":"11710978165346939123","type":"uint256"},
// {"name":"path","value":["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2","0x25377ddb16c79c93b0cbf46809c8de8765f03fcd"],"type":"address[]"},
// {"name":"to","value":"0xa18ead894ae55194c5891ff81a1d30c9eda9fb65","type":"address"},
// {"name":"deadline","value":"1597077531","type":"uint256"}]}

interface UniswapParam {
  name: string;
  value: string | string[];
  type: string;
}

export interface UniswapTx {
  name: string; // we also have stuff like 'removeLiquidity' on top of UniswapTxName
  params: UniswapParam[];
  value: string;
}

export interface ParsedUniswapTx {
  action: 'add' | 'remove' | 'swap';
  tokenA: ERC20Token | 'ETH';
  tokenB: ERC20Token | 'ETH';
  amountA: string;
  amountB: string;
}
