/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { IProvider, IProviderInterface } from "../IProvider";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "addLiquidity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "_sendRewardsToStaking",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "stakeDuration",
        type: "uint256",
      },
    ],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "_user",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "_amount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "_bonusRewardMultiplier",
            type: "uint256",
          },
        ],
        internalType: "struct IProvider.MigrateArgs[]",
        name: "allMigrateArgs",
        type: "tuple[]",
      },
    ],
    name: "migrateUsersLPPositions",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "removeLiquidity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
    ],
    name: "returnAllClaimableRewardAmounts",
    outputs: [
      {
        internalType: "uint256",
        name: "rewardTotal",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "lastLiquidityAddedEpochReference",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "lastEpochLiquidityWithdrawn",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "epoch",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
    ],
    name: "returnUsersEpochTotals",
    outputs: [
      {
        internalType: "uint256",
        name: "shareTotal",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "currentInvestmentTotal",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "allPrevInvestmentTotals",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_user",
        type: "address",
      },
    ],
    name: "returnUsersInvestmentTotal",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export class IProvider__factory {
  static readonly abi = _abi;
  static createInterface(): IProviderInterface {
    return new utils.Interface(_abi) as IProviderInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IProvider {
    return new Contract(address, _abi, signerOrProvider) as IProvider;
  }
}