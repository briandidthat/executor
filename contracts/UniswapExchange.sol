// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "./interfaces/TokenLibrary.sol";
import "./interfaces/IUniswapExchange.sol";

contract UniswapExchange is IUniswapExchange {
    address public immutable owner;

    ISwapRouter public constant swapRouter =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    uint24 public constant POOL_FEE = 3000;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call");
        _;
    }

    function swapForWETH(uint256 _amountIn, address _stablecoin)
        external
        override
        returns (uint256 amountOut)
    {
        require(TokenLibrary.isStableCoin(_stablecoin), "Invalid token");

        // Transfer the specified amount of _stablecoin to this contract.
        TransferHelper.safeTransferFrom(
            _stablecoin,
            msg.sender,
            address(this),
            _amountIn
        );

        TransferHelper.safeApprove(_stablecoin, address(swapRouter), _amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: _stablecoin,
                tokenOut: WETH9,
                fee: POOL_FEE,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: _amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
        emit Swap(msg.sender, _stablecoin, amountOut);
    }
}