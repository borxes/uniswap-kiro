import config from './config';
import * as ethers from 'ethers';

const INFURA = `wss://mainnet.infura.io/ws/v3/${config.infuraToken}`;

const wsProvider = new ethers.providers.WebSocketProvider(INFURA);

export default wsProvider;
