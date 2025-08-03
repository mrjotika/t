async function main() {
    const BaccaratGame = await ethers.getContractFactory("BaccaratGame");
    const game = await BaccaratGame.deploy(YOUR_SUBSCRIPTION_ID);
    await game.deployed();
    console.log("Contract deployed to:", game.address);
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });