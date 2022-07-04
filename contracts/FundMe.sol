// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "./PriceConverter.sol";

error FundMe__NotOwner();

/** @title A contract for crowd funding
 *   @author Wojciech Mocarski
 *   @notice This is a demo contract
 *   @dev This implements price feed as our library
 */
contract FundMe {
    using PriceConverter for uint256;

    uint256 constant MINIMUM_USD = 50 * 1e18;
    AggregatorV3Interface public priceFeedAddress;

    address[] public funders;
    mapping(address => uint256) public addressToAmountFunded;
    address public immutable owner;

    modifier onlyOwner() {
        // require(msg.sender == owner, "Only owner can withdraw money");
        if (msg.sender != owner) revert FundMe__NotOwner();
        _;
    }

    constructor(address _priceFeedAddress) {
        owner = msg.sender;
        priceFeedAddress = AggregatorV3Interface(_priceFeedAddress);
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    /** 
     *   @notice This function funds this contract
     *   @dev This implements price feed as our library
     */
    function fund() public payable {
        require(
            msg.value.getConversionRate(priceFeedAddress) >= MINIMUM_USD,
            "To small amount"
        );
        funders.push(msg.sender);
        addressToAmountFunded[msg.sender] += msg.value;
    }

    function withdraw() public onlyOwner {
        for (uint256 i = 0; i < funders.length; i++) {
            address funder = funders[i];
            addressToAmountFunded[funder] = 0;
        }

        funders = new address[](0);
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(success, "Failed to send money");
    }
}
