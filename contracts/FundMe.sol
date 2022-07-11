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

    mapping(address => uint256) public s_addressToAmountFunded;
    address[] public s_funders;

    address public immutable i_owner;
    uint256 constant MINIMUM_USD = 50 * 1e18;
    AggregatorV3Interface public s_priceFeedAddress;

    modifier onlyOwner() {
        // require(msg.sender == i_owner, "Only owner can withdraw money");
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        _;
    }

    constructor(address _priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeedAddress = AggregatorV3Interface(_priceFeedAddress);
    }

    /**
     *   @notice This function funds this contract
     *   @dev This implements price feed as our library
     */
    function fund() public payable {
        require(
            msg.value.getConversionRate(s_priceFeedAddress) >= MINIMUM_USD,
            "To small amount"
        );
        s_funders.push(msg.sender);
        s_addressToAmountFunded[msg.sender] += msg.value;
    }

    function withdraw() public onlyOwner {
        address[] memory funders = s_funders;
        for (uint256 i = 0; i < funders.length; i++) {
            address funder = funders[i];
            s_addressToAmountFunded[funder] = 0;
        }

        s_funders = new address[](0);
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(success, "Failed to send money");
    }
}
