import { readFileSync } from "fs";
import path from "path";
import {
  TransactionHash,
  TransactionStatus,
  GenLayerClient,
  DecodedDeployData,
  GenLayerChain,
} from "genlayer-js/types";
import { localnet } from "genlayer-js/chains";
import { privateKeyToAccount } from "viem/accounts";


function deriveRelayAddress(): string {
  if (process.env.PROJECT_RELAY_ADDRESS) {
    return process.env.PROJECT_RELAY_ADDRESS;
  }
  const pk = process.env.PROJECT_GENLAYER_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      "Need either PROJECT_RELAY_ADDRESS or PROJECT_GENLAYER_PRIVATE_KEY env var to derive the relay address"
    );
  }
  const normalized = (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`;
  return privateKeyToAccount(normalized).address;
}


export default async function main(client: GenLayerClient<any>) {
  const filePath = path.resolve(process.cwd(), "contracts/treasury_pilot.py");

  const relayAddress = deriveRelayAddress();

  console.log(`Deploying with relay_address=${relayAddress}`);

  try {
    const contractCode = new Uint8Array(readFileSync(filePath));

    await client.initializeConsensusSmartContract();

    const deployTransaction = await client.deployContract({
      code: contractCode,
      args: [relayAddress],
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: deployTransaction as TransactionHash,
      status: TransactionStatus.ACCEPTED,
      retries: 200,
    });

    if (
      receipt.status !== 5 &&
      receipt.status !== 6 &&
      receipt.statusName !== "ACCEPTED" &&
      receipt.statusName !== "FINALIZED"
    ) {
      throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`);
    }

    const deployedContractAddress =
      receipt.data?.contract_address ??
      (receipt.txDataDecoded as DecodedDeployData)?.contractAddress;

    console.log(`Contract deployed at address: ${deployedContractAddress}`);
  } catch (error) {
    throw new Error(`Error during deployment:, ${error}`);
  }
}
