import web3 from "./web3.js";

// The contract address is environment-driven. It changes on every redeploy,
// so it must NOT be hard-coded. Set CONTRACT_ADDRESS in server/.env to the
// address printed by Ganache/Remix after deploying LandRegistry.sol.
// The format is validated here so a malformed value (stray quotes, a trailing
// ';', etc.) cannot crash the server when the Contract object is constructed.
const RAW_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS?.trim();
const CONTRACT_ADDRESS =
  RAW_CONTRACT_ADDRESS && web3.utils.isAddress(RAW_CONTRACT_ADDRESS)
    ? RAW_CONTRACT_ADDRESS
    : undefined;

// ABI for LandRegistry.sol (with admin/registrar access control).
const ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "string", name: "plot", type: "string" },
      { indexed: false, internalType: "string", name: "location", type: "string" },
      { indexed: true, internalType: "address", name: "owner", type: "address" },
    ],
    name: "LandRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "string", name: "plot", type: "string" },
      { indexed: false, internalType: "string", name: "location", type: "string" },
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "registrar", type: "address" },
      { indexed: false, internalType: "bool", name: "authorized", type: "bool" },
    ],
    name: "RegistrarUpdated",
    type: "event",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "registrars",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "", type: "string" },
      { internalType: "string", name: "", type: "string" },
    ],
    name: "lands",
    outputs: [
      { internalType: "string", name: "plotNumber", type: "string" },
      { internalType: "string", name: "location", type: "string" },
      { internalType: "address", name: "owner", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_registrar", type: "address" },
      { internalType: "bool", name: "_authorized", type: "bool" },
    ],
    name: "setRegistrar",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_plot", type: "string" },
      { internalType: "string", name: "_location", type: "string" },
      { internalType: "address", name: "_owner", type: "address" },
    ],
    name: "registerLand",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_plot", type: "string" },
      { internalType: "string", name: "_location", type: "string" },
      { internalType: "address", name: "_newOwner", type: "address" },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

if (!CONTRACT_ADDRESS) {
  console.warn(
    RAW_CONTRACT_ADDRESS
      ? `⚠️  [blockchain] CONTRACT_ADDRESS "${RAW_CONTRACT_ADDRESS}" is not a ` +
          "valid address — fix server/.env (0x + 40 hex, no quotes, no semicolon)."
      : "⚠️  [blockchain] CONTRACT_ADDRESS is not set in server/.env — " +
          "blockchain writes will fail until it is configured."
  );
}

const landContract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

/**
 * Verifies that a contract is actually deployed at CONTRACT_ADDRESS on the
 * connected Ganache node. Run at server startup so a stale/wrong address is
 * caught immediately, instead of failing with an opaque error on the first
 * transaction. Non-fatal: the server still boots (MongoDB-only routes work).
 */
export async function verifyContractDeployment() {
  if (!CONTRACT_ADDRESS) {
    console.warn(
      "⚠️  [blockchain] Skipping verification — CONTRACT_ADDRESS not set."
    );
    return false;
  }

  try {
    const code = await web3.eth.getCode(CONTRACT_ADDRESS);
    if (!code || code === "0x") {
      console.warn(
        `⚠️  [blockchain] No contract code found at ${CONTRACT_ADDRESS}. ` +
          "Re-deploy LandRegistry.sol to Ganache and update CONTRACT_ADDRESS in server/.env."
      );
      return false;
    }
    console.log(`✅ [blockchain] LandRegistry verified at ${CONTRACT_ADDRESS}`);
    return true;
  } catch (error) {
    console.warn(
      `⚠️  [blockchain] Cannot reach Ganache RPC — ${error.message}`
    );
    return false;
  }
}

export default landContract;
