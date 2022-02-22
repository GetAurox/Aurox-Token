import { DeploymentConfig } from "../types/Deployment";

export default (networkName: string) => {
    const config: DeploymentConfig =
        require(`../config/${networkName}`).default;

    if (!config) throw new Error("No Config found");

    return config;
};
