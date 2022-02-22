import { Token } from "../../../../types/typechain/Token";
import { StakingMaster } from "../../../../types/typechain/StakingMaster";
import { BigNumberish } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

interface StakingArgs {
    amount: BigNumberish;
    duration: number;
    recipient?: string;
    Token: Token;
    StakingMaster: StakingMaster;
    User: SignerWithAddress;
}

export default async ({
    amount,
    duration,
    recipient,
    User,
    StakingMaster,
    Token,
}: StakingArgs): Promise<{ stakingAddress: string; gasUsed: number }> => {
    const address = recipient ?? User.address;

    await Token.mint(address, amount);
    await Token.increaseAllowance(StakingMaster.address, amount);

    await Token.increaseTokenAllowance(StakingMaster.address, amount);
    await Token.mint(Token.address, amount);

    const tx = await (
        await StakingMaster.createStaking(amount, duration, address)
    ).wait();

    const newStakeEvent = tx.events?.find(
        (event) => event.event === "NewStake"
    );

    if (!newStakeEvent?.args?.[0])
        throw new Error(
            "Custom: No stake address emited from creating stake event"
        );

    return {
        stakingAddress: newStakeEvent?.args?.[0],
        gasUsed: tx.gasUsed.toNumber(),
    };
};
