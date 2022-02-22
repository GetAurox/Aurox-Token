export interface DeploymentConfig {
    epochStartTime: number;
    auroxTokenArgs: {
        uniSwapAddress: string;
        teamRewardAddress: string;
        exchangeListingReserve: string;
        reservesAddress: string;
    };
    providerArgs: {
        uniSwapTokenAddress: string;
        epochStartTime: number;
        migrationContractAddress: string;
    };
}
