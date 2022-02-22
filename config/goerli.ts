import { EPOCH_1_START_TIME } from "../tests/helpers/constants";
import { DeploymentConfig } from "../types/Deployment";

const MyAddress = "0xd026573E38f943a51a9C4C66EeF864f6abf87f6F";

export default <DeploymentConfig>{
    auroxTokenArgs: {
        uniSwapAddress: MyAddress,
        teamRewardAddress: MyAddress,
        exchangeListingReserve: MyAddress,
        reservesAddress: MyAddress,
    },
    epochStartTime: EPOCH_1_START_TIME,
};
