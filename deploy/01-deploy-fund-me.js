const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments, network }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
 
    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        log("Working in development mode ...")
        ethUsdPriceFeed = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdPriceFeed.address
    } else {
        log("Working in non-development mode")
        ethUsdPriceFeedAddress =
            networkConfig[network.config.chainId].priceFeedAddress
    }

    log("Network detected. Deploying contract...")
    const args = [ethUsdPriceFeedAddress]
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("Contract deployed!")
    log("--------------------------------------")

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Starting to verify...")
        await verify(fundMe.address, args)
    } else {
        log("Veryfing imposible. It's development network")
    }
}

module.exports.tags = ["all", "fundme"]
