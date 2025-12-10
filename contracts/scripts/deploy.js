const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying StandNFT to Base...");

  const StandNFT = await hre.ethers.getContractFactory("StandNFT");
  const standNFT = await StandNFT.deploy();

  await standNFT.waitForDeployment();

  const address = await standNFT.getAddress();
  console.log("✅ StandNFT deployed to:", address);
  
  console.log("\n📝 Save this address to your .env file:");
  console.log(`VITE_STAND_NFT_CONTRACT=${address}`);
  
  console.log("\n⏳ Waiting for block confirmations...");
  await standNFT.deploymentTransaction().wait(5);
  
  console.log("\n🔍 Verifying contract on BaseScan...");
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
    console.log("✅ Contract verified!");
  } catch (error) {
    console.log("⚠️ Verification failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
