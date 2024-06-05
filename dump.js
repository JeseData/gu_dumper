import { ImmutableX, Config} from '@imtbl/core-sdk';
import { generateWalletConnection } from './funcs/walletConnection.js';
import https from "https";
import { fetchOwnedAssets } from "./funcs/getAssets.js";
import { avgPriceFromXListed, maxListsPerCard, discountPercentFromAvg } from './utils/constants.js';

const priceEth = await getPrices()
const walletConnection = await generateWalletConnection('mainnet');
const imxClient = new ImmutableX(Config.PRODUCTION);
const userAddress = await walletConnection.ethSigner.getAddress();

main()

async function main(){
  // Get assets
  const assetsList = await fetchOwnedAssets(userAddress)
  const protos = Object.keys(assetsList)
  // For unique proto + quality
  for(let proto of protos){
    let qualities = Object.keys(assetsList[proto])

    for(let quality of qualities){
      const averagePriceWei = await getAveragePrice(proto, quality)
      const avgPriceUsd = parseFloat(averagePriceWei) / parseFloat(10n**18n) * priceEth
      const discountedPrice = avgPriceUsd / 100 * (100-discountPercentFromAvg)
      
      const discountedWei = BigInt(parseInt((discountedPrice / priceEth)* 1000000000)) * 10n**18n / 1000000000n 

      let listingCount = 0

      for(let tokenId of assetsList[proto][quality].tokenIds){
        if(listingCount >= maxListsPerCard){
          break
        }
        await createListing(discountedWei, tokenId)
        listingCount++
      }
    }
  }
}


async function createListing(sellPrice, id){

  let listingParams = {
    user:userAddress,
    buy: {amount: sellPrice.toString(), type:"ETH"},
    sell: {
      type: 'ERC721',
      tokenAddress: "0xacb3c6a43d15b907e8433077b6d38ae40936fe2c",
      tokenId: id.toString(),
    },
    fees: [
      {
        address: '0x691ea670f75dac6d42047873e6e486c6a8def546',
        fee_percentage: 1,
      },
    ],
  };

  try {
    const orderResponse = await imxClient.createOrder(
      walletConnection,
      listingParams,
    );
    console.log('orderResponse', orderResponse);
  } catch (error) {
    console.error(error);
  };
};


async function getAveragePrice(proto, quality) {
  const url = `https://api.x.immutable.com/v3/orders?page_size=50&status=active&buy_token_type=ETH&direction=asc&order_by=buy_quantity_with_fees&sell_token_address=0xacb3c6a43d15b907e8433077b6d38ae40936fe2c&sell_metadata=%7B%22proto%22%3A%20%5B%22${proto}%22%5D%2C%22quality%22%3A%5B%22${quality}%22%5D%7D`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          let totalPrice = 0n
          let totalCount = 0n

          for(let i=0; i < avgPriceFromXListed; i++){
            if(i>=json.result.length){
              break
            }
            totalPrice += BigInt(json.result[i].buy.data.quantity_with_fees)
            totalCount++
          }
          if(totalCount === 0n){
            resolve(1n)
          }
          resolve(totalPrice / totalCount)
        } catch (error) {
          reject(error);
        }
      });

      res.on('error', (error) => {
        reject(error);
      });
    });
  });
}

async function getPrices(){
  //Calls coingecko api for current price of tokens
  return new Promise((resolve, reject) => {
    const optionsApi = {
      hostname: 'api.coingecko.com',
      path: '/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      method: 'GET'
    };

    const req = https.request(optionsApi, res => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk.toString();
      });

      res.on('end', () => {
        const data = JSON.parse(body);
        resolve(data.ethereum.usd);
      });

      // Handle errors
      req.on('error', error => {
        console.error(error);
      });
    });

    // Send the request
    req.end();
  });
}


