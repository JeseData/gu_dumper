import https from 'https';
import { guCardsAddress } from '../utils/constants.js';

const ownedSets = {}

export async function fetchOwnedAssets(mainWallet, cursor="") {

  await new Promise(r => setTimeout(r, 250));

  const url = `https://api.x.immutable.com/v1/assets?user=${mainWallet}&collection=${guCardsAddress}&cursor=${cursor}`
  return new Promise((resolve, reject) => {
    const request = https.get(url, async (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', async () => {
        try {
          const jsonData = JSON.parse(data);
          cursor = jsonData.cursor
          if (jsonData && jsonData.result && Array.isArray(jsonData.result)) {
            jsonData.result.forEach((item) => {
              if (item.token_address === guCardsAddress) {
                // for each token, add one to ownedSets[item.metadata.quality][item.metadta.set][item.metadata.proto].count
                try {
                    if(item.metadata.proto < 9999){
                      if(!ownedSets[item.metadata.proto]){
                        ownedSets[item.metadata.proto] = {}
                      }
                      if(!ownedSets[item.metadata.proto][item.metadata.quality]){
                        ownedSets[item.metadata.proto][item.metadata.quality] =  {count:0, tokenIds: []}
                      }
                      ownedSets[item.metadata.proto][item.metadata.quality].count++;
                      ownedSets[item.metadata.proto][item.metadata.quality].tokenIds.push(item.token_id)
                      
                  }
                } catch (error) {
                  console.log({error})
                }
              }

            });

            if(jsonData.remaining !== 0){
              await fetchOwnedAssets(mainWallet, cursor)
            } else {
              resolve(ownedSets);
            }
          } else {
            console.log('Invalid JSON format or missing data.result array.');
            reject(new Error('Invalid JSON format or missing data.result array.'));
          }
        } catch (error) {
          console.error('Error parsing JSON:', error.message);
          reject(error);
        }
      });
    }).on('error', (error) => {
      if (error.code === 'ECONNRESET') {
        console.error('Connection reset by peer. Retrying...');
        request.abort();
        setTimeout(async() => {
          await fetchOwnedAssets(mainWallet, cursor).then(resolve).catch(reject);
        }, 1000);
      } else {
        console.error('Error fetching data:', error.message);
        reject(error);
      }
    });
    
  });

}
