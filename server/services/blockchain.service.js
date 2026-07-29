import web3 from "../../blockchain/web3.js";
import landContract from "../../blockchain/landContract.js";

// Gas ceiling for the transfer tx. transferOwnership() is a single storage
// write — this is generous headroom for a local Ganache network.
const TRANSFER_GAS_LIMIT = 3_000_000;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Cache of contract addresses already confirmed to hold deployed bytecode.
// `eth_getCode` is a network round-trip to Ganache and its result is immutable
// for a given address (deployed code never disappears within a node's life),
// so we memoize positive results and skip the RPC call on subsequent transfers.
// Negative results are intentionally NOT cached — a redeploy can turn an empty
// address into a live one, and we must re-check until it succeeds once.
const verifiedContractCodeCache = new Set();

/**
 * Reads the on-chain ownership record for a (plot, location) pair.
 *
 * Used by the sale-listing flow to cross-check that MongoDB ownership agrees
 * with the LandRegistry contract before we let an owner list their land.
 *
 * @param {{plotNumber: string, location: string}} args
 * @returns {Promise<{plotNumber: string, location: string, owner: string|null, registered: boolean}>}
 */
export async function readLandOnChain({ plotNumber, location }) {
  const address = process.env.CONTRACT_ADDRESS?.trim();
  if (!address || !web3.utils.isAddress(address)) {
    throw new Error(
      "Smart contract address is missing or invalid — set a valid CONTRACT_ADDRESS in server/.env"
    );
  }

  // Solidity-auto-generated getter for `mapping(string=>mapping(string=>Land))`
  // returns the struct as a positional tuple. Web3 v4 exposes it as an object
  // with both numeric and named keys — we read by name with a positional fallback.
  const result = await landContract.methods.lands(plotNumber, location).call();
  const owner = result?.owner ?? result?.[2] ?? null;

  return {
    plotNumber: result?.plotNumber ?? result?.[0] ?? "",
    location: result?.location ?? result?.[1] ?? "",
    owner,
    registered: !!owner && owner !== ZERO_ADDRESS,
  };
}

/**
 * Executes the on-chain land ownership transfer.
 *
 * IMPORTANT: the caller must NOT have written ownership changes to MongoDB
 * before invoking this. The blockchain is the source of truth and cannot be
 * rolled back — DB writes happen only AFTER this resolves successfully.
 *
 * @param {{plotNumber: string, location: string, newOwnerAddress: string}} args
 * @returns {Promise<{transactionHash: string, blockNumber: number, registrar: string}>}
 * @throws {Error} with a human-readable message on any blockchain failure.
 */
export async function transferLandOnChain({ plotNumber, location, newOwnerAddress }) {
  const address = process.env.CONTRACT_ADDRESS?.trim();

  // 1. Contract must be configured with a valid address.
  if (!address || !web3.utils.isAddress(address)) {
    throw new Error(
      "Smart contract address is missing or invalid — set a valid CONTRACT_ADDRESS in server/.env"
    );
  }

  // 2. A contract must actually be deployed at that address. Skip the RPC
  //    round-trip once we've confirmed code at this address before.
  if (!verifiedContractCodeCache.has(address)) {
    const code = await web3.eth.getCode(address);
    if (!code || code === "0x") {
      throw new Error(
        `No contract is deployed at ${address} — redeploy LandRegistry.sol to Ganache`
      );
    }
    verifiedContractCodeCache.add(address);
  }

  // 3. Destination wallet must be a valid address.
  if (!web3.utils.isAddress(newOwnerAddress)) {
    throw new Error(`Buyer wallet address is invalid: ${newOwnerAddress}`);
  }

  // 4. Resolve the backend's registrar account (Ganache account index 0).
  const accounts = await web3.eth.getAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error(
      "No accounts available from the blockchain node — is Ganache running?"
    );
  }
  const registrar = accounts[0];

  // 5. Send transferOwnership() and wait for it to be mined.
  const receipt = await landContract.methods
    .transferOwnership(plotNumber, location, newOwnerAddress)
    .send({ from: registrar, gas: TRANSFER_GAS_LIMIT });

  return {
    transactionHash: receipt.transactionHash,
    blockNumber: Number(receipt.blockNumber), // web3 v4 returns BigInt
    registrar,
  };
}
