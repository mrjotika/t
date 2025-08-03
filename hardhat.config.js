require("@nomicfoundation/hardhat-toolbox");
  require("@chainlink/contracts");

  module.exports = {
    solidity: "0.8.9",
    networks: {
      arbitrumSepolia: {
        url: "https://sepolia-rollup.arbitrum.io/rpc",
        accounts: ["YOUR_PRIVATE_KEY"],
        chainId: 421614,
      },
    },
  };