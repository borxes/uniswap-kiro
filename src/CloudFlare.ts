import axios from "axios";

import { Transaction } from "./types";

const CLOUDFLARE_ETH = "https://cloudflare-eth.com";
const MAX_ATTEMPTS = 5;
const RETRY_DELAY = 10000;

export class CloudflareEth {
  static async scanBlock(height: number) {
    console.log(`[CloudflareEth.scanBlock] querying block ${height}`);
    const params = {
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: ["0x" + Number(height).toString(16), true],
      id: 1,
    };
    let tries = 0;
    let success = false;
    let txs: Transaction[] = [];
    try {
      while (!success && tries < MAX_ATTEMPTS) {
        let resp = await axios.post(CLOUDFLARE_ETH, params);
        txs = resp.data.result ? resp.data.result.transactions : [];
        console.log(
          `[CloudFlareEth.scanBlock] Got ${
            txs.length
          } transactions in block ${height}  attempt #${tries + 1}`
        );
        if (txs.length === 0) {
          console.log(
            `[CloudflareEth.scanBlock] waiting to retry block ${height}`
          );
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
          tries++;
        } else {
          console.log(
            `[CloudFlareEth.scanBlock] returning ${txs.length} txs for block ${height}`
          );
          success = true;
        }
      }
    } catch (err) {
      console.log(`[CloudflareEth.scanBlock] error ${err}`);
    } finally {
      return txs;
    }
  }

  static erc20TokenInfo(address: string) {
    return;
  }
}
