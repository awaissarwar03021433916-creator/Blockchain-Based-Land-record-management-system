// Web3 connection to the Ethereum node (Ganache) over JSON-RPC.
// The RPC URL is environment-driven so it is never hard-coded; it falls back
// to the Ganache GUI default (port 7545) for local development.
import Web3 from "web3";

const RPC_URL = process.env.GANACHE_RPC_URL || "http://127.0.0.1:7545";

const web3 = new Web3(RPC_URL);

export default web3;
