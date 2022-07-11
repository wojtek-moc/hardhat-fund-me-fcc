const { assert, expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

describe("FundMe", async function () {
    let deployer
    let fundMe
    let mockV3Aggregator
    const sendValue = ethers.utils.parseEther("1")
    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture("all")
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        )
    })

    describe("constructor", async function () {
        it("sets the aggregator address correctly", async function () {
            const response = await fundMe.s_priceFeedAddress()
            assert.equal(response, mockV3Aggregator.address)
        })
    })

    describe("fund", async function () {
        it("fails if I don't send enough ETH", async function () {
            await expect(fundMe.fund()).to.be.revertedWith("To small amount")
        })
        it("updated the addressToAmountFunded data structure", async function () {
            await fundMe.fund({ value: sendValue })
            const response = await fundMe.s_addressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })
        it("added funder to funders array", async function () {
            await fundMe.fund({ value: sendValue })
            const funder = await fundMe.s_funders(0)
            assert.equal(funder, deployer)
        })
    })

    describe("withdraw", async function () {
        beforeEach(async function () {
            await fundMe.fund({ value: sendValue })
        })

        it("withdraw ETH from a single funder", async function () {
            // Arrange -> Act -> Assert
            // Arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            // console.log(startingFundMeBalance.toString())
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            // console.log(startingDeployerBalance.toString())
            // Act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            // console.log(transactionReceipt, "Trx receipt")

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            // console.log(endingFundMeBalance.toString())
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            // console.log(endingDeployerBalance.toString())

            // Assert
            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                startingDeployerBalance.add(startingFundMeBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            )
        })

        it("allows us to withdraw with multiple funders", async function () {
            // Arrange
            account = await ethers.getSigners()
            for (let i = 1; i < 7; i++) {
                // console.log(account[i])
                const connectedContract = await fundMe.connect(account[i])
                await connectedContract.fund({ value: sendValue })
            }

            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            // Act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )

            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )
            // console.log(endingFundMeBalance.toString())
            // Assert

            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                startingDeployerBalance.add(startingFundMeBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            )

            await expect(fundMe.s_funders(0)).to.be.reverted

            for (let i = 1; i < 7; i++) {
                assert.equal(await fundMe.s_addressToAmountFunded(account[i].address), 0)
            }
        })

        it("Only owner can withdraw", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await fundMe.connect(attacker)
            await expect(
                attackerConnectedContract.withdraw()
            ).to.be.revertedWith("FundMe__NotOwner")
        })
    })
})
