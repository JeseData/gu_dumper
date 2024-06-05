import { AlchemyProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { createStarkSigner, generateLegacyStarkPrivateKey } from '@imtbl/core-sdk';
import { privateKey } from './../utils/constants.js';


export const generateWalletConnection = async () => {
    
    const userPrivateKey = privateKey
    const alchemyKey = (''); // Not needed for non-new

    const wallet = new Wallet(userPrivateKey);
    const userStarkKey  = await generateLegacyStarkPrivateKey(wallet);

    // connect provider
    const provider = new AlchemyProvider("mainnet", alchemyKey);
    // L1 credentials
    const ethSigner = new Wallet(userPrivateKey).connect(provider);
    // L2 credentials
    const starkSigner = createStarkSigner(userStarkKey);
    return {
        ethSigner,
        starkSigner,
    };
};

