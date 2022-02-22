import { DeploymentConfig } from "../types/Deployment";
import { BURN_ADDRESS, EPOCH_1_START_TIME } from "../tests/helpers/constants";

export default <DeploymentConfig>{
    auroxTokenArgs: {
        uniSwapAddress: BURN_ADDRESS,
        teamRewardAddress: "0xb09029F0429fF5900695991E81BB51EA7644A5Fe",
        exchangeListingReserve: BURN_ADDRESS,
        reservesAddress: "0xF9A6299a726a60C942Ee956a0C379A74FCbDd051",
    },
    epochStartTime: EPOCH_1_START_TIME,
};
