import { Token } from "../../../../types/typechain/Token";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { BURN_ADDRESS } from "../../constants";

export interface TokenBinding {
    Token: Token;
    TokenAPI: TokenAPI;
}

export interface TokenAPI {
    myBalance: () => Promise<BigNumber>;
    resetBalance: () => Promise<void>;
}

// class TokenExtension extends Token {
//     User: SignerWithAddress;

//     constructor(User: SignerWithAddress, tokenAddress: string) {
//         super(tokenAddress);
//         this.User = User;

//     }
//     get myBalance() {
//         this.balanceOf()
//     }
// }

const returnMyBalance = (User: SignerWithAddress, Token: Token) =>
    Token.balanceOf(User.address);

export default (User: SignerWithAddress, Token: Token): TokenBinding => ({
    Token,
    TokenAPI: {
        myBalance: () => returnMyBalance(User, Token),
        resetBalance: async () => {
            Token.transfer(BURN_ADDRESS, await returnMyBalance(User, Token));
        },
    },
});
