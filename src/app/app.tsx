"use client";

import { NetworkSwitcher } from "../endu/NetworkSwitcher";
import { Connected } from "../components/Connected";
import { Connect } from "../endu/Connect";
import { AccountInfo } from "../endu/AccountInfo";
import { SignAAMessage } from "../endu/SignAAMessage";
import { Mint } from "../endu/Mint";
import { useSignMessage, useConfig } from "wagmi";
import React, { useState, useEffect } from "react";
import "./style.css";
import * as ethers from "ethers";
import { Client, Presets, BundlerJsonRpcProvider } from "./src";
import EnduNFTData from "../endu/artifacts/EnduNFT.json";

import {
  EOASignature,
  estimateUserOperationGas,
  getGasPrice,
} from "./src/preset/middleware";
import {
  encodeFunctionData,
  toBytes,
  concat,
  pad,
  toHex,
  keccak256,
  encodeAbiParameters,
  concatHex,
  zeroAddress,
  decodeFunctionData,
  isHex,
  hexToBigInt,
  getFunctionSelector,
} from "viem";
import { MerkleTree } from "merkletreejs";
import {
  getUserOperationHash,
  type Address,
  type Hex,
  type SmartAccountSigner,
  type UserOperationRequest,
  getChain,
  type SignTypedDataParams,
} from "@alchemy/aa-core";

enum ParamCondition {
  EQUAL = 0,
  GREATER_THAN = 1,
  LESS_THAN = 2,
  GREATER_THAN_OR_EQUAL = 3,
  LESS_THAN_OR_EQUAL = 4,
  NOT_EQUAL = 5,
}
interface ParamRules {
  offset: number;
  condition: ParamCondition;
  param: Hex;
}
enum Operation {
  Call = 0,
  DelegateCall = 1,
}
interface Permission {
  target: Address;
  valueLimit: number;
  sig: Hex;
  rules: ParamRules[];
  operation: Operation;
}

function encodePermissionData(
  permission: Permission,
  merkleProof?: string[]
): Hex {
  const permissionParam = {
    components: [
      {
        name: "target",
        type: "address",
      },
      {
        name: "valueLimit",
        type: "uint256",
      },
      {
        name: "sig",
        type: "bytes4",
      },
      {
        components: [
          {
            name: "offset",
            type: "uint256",
          },
          {
            internalType: "enum ParamCondition",
            name: "condition",
            type: "uint8",
          },
          {
            name: "param",
            type: "bytes32",
          },
        ],
        name: "rules",
        type: "tuple[]",
      },
      {
        internalType: "enum Operation",
        name: "operation",
        type: "uint8",
      },
    ],
    name: "permission",
    type: "tuple",
  };
  let params;
  let values;
  if (merkleProof) {
    params = [
      permissionParam,
      {
        name: "merkleProof",
        type: "bytes32[]",
      },
    ];
    values = [permission, merkleProof];
  } else {
    params = [permissionParam];
    values = [permission];
  }
  return encodeAbiParameters(params, values);
}

export function App() {
  let nodeRpcUrl = "https://rpc-l2-op-endurance-testnet1.fusionist.io/";
  const bundlerUrl = "https://test-bundler-gamewallet.fusionist.io/";
  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const accountFactory = "0x6218d8C39208C408d096Ac5F3BaC3472e6381526";
  const paymaster = "0x1a256A0221b030A8A50Cb18966Ebdc4325a92D7F";
  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35";
  const opEnduChainId = 6480001000;

  const kernelFactory = "0x696E1024cef8b682d87952A652162Bc87564834b";
  const SessionKeyOwnedValidator = "0x4755FE51b67Af2df02E940F927157FB84D5A7Fd6"
  const aaWalletSalt = "1"

  const storage = localStorage;
  const [privKey, setPrivkey] = useState("");
  const [aaAddress, setAAAddress] = useState("");
  const [isIniting, setIsIniting] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [opData, setOpData] = useState(null);
  const [showPrivKey, setShowPrivKey] = useState(false);
  const [sskData, setSSKData] = useState({});

  const [isMinting2, setIsMinting2] = useState(false);
  const [opData2, setOpData2] = useState({});

  let privKeyLocal = storage.getItem("aa_privkey");
  useEffect(() => {
    if (privKeyLocal) {
      setPrivkey(privKeyLocal.toString());
    }
  }, [privKeyLocal]);
  let aaAddressLocal = storage.getItem("aa_address");
  useEffect(() => {
    if (aaAddressLocal) {
      setAAAddress(aaAddressLocal.toString());
    }
  }, [aaAddressLocal]);
  let sessionKeyPriv = storage.getItem("ss_privkey");
  let sessionKeyAddr = storage.getItem("ss_addr");
  let sessionKeySigData = storage.getItem("ss_sigData");
  useEffect(() => {
    if (sessionKeyPriv && sessionKeyAddr && sessionKeySigData) {
      setSSKData({
        sessionKeyPriv: sessionKeyPriv,
        sessionKey: sessionKeyAddr,
        sessionKeySigData: sessionKeySigData,
      });
    }
  }, [sessionKeyPriv, sessionKeyAddr, sessionKeySigData]);

  const {
    data: signature,
    variables: sigVariables,
    isLoading: sigIsloading,
    signMessage,
  } = useSignMessage();

  useEffect(() => {
    if (sigVariables?.message && signature) {
      const privateKeyHex = signature.slice(0, 66);
      setPrivkey(privateKeyHex);
      storage.setItem("aa_privkey", privateKeyHex);
      initAAAccount(
        privateKeyHex,
        bundlerUrl,
        entryPoint,
        accountFactory,
        setAAAddress,
        storage,
        true
      );
    }
  }, [
    sigVariables,
    signature,
    storage,
    bundlerUrl,
    entryPoint,
    accountFactory,
  ]);

  function clearSig() {
    setPrivkey("");
    setAAAddress("");
    setSSKData({});
    storage.setItem("aa_privkey", "");
    storage.setItem("aa_address", "");
    storage.setItem("ss_privkey", "");
    storage.setItem("ss_addr", "");
    storage.setItem("ss_sigData", "");
  }

  function initAAAccount(
    privKey,
    bundlerUrl,
    entryPoint,
    accountFactory,
    setAAAddress,
    storage,
    state
  ) {
    return new Promise(async (resolve, reject) => {
      if (!privKey) {
        reject("Private key is missing");
        return;
      }
      if (state) {
        setIsIniting(true);
      }
      try {
        const provider = new BundlerJsonRpcProvider(nodeRpcUrl).setBundlerRpc(
          bundlerUrl
        );
        const wallet = new ethers.Wallet(privKey, provider);
        const kernel = await Presets.Builder.Kernel.init(wallet, nodeRpcUrl, {
          entryPoint: entryPoint,
          factory: kernelFactory,
          salt: aaWalletSalt,
          overrideBundlerRpc: bundlerUrl,
        });
  
        let address = kernel.getSender();
        setAAAddress(address);
        storage.setItem("aa_address", address);
        resolve(kernel);
      } catch (error) {
        console.error(error);
        reject(error);
      }
      if (state) {
        setIsIniting(false);
      }
    });
  }

  function mintNFTCore() {
    return new Promise(async (resolve, reject) => {
      try {
        setIsMinting(true);
        const kernel = await initAAAccount(
          privKey,
          bundlerUrl,
          entryPoint,
          accountFactory,
          setAAAddress,
          storage,
          false
        );

        const client = await Client.init(nodeRpcUrl, {
          entryPoint: entryPoint,
          overrideBundlerRpc: bundlerUrl,
        });

        let abi = EnduNFTData.abi;
        const provider = new ethers.providers.JsonRpcProvider(bundlerUrl);
        const NFTContract = new ethers.Contract(nftAddress, abi, provider);
        const call = {
          to: nftAddress,
          value: ethers.constants.Zero,
          data: NFTContract.interface.encodeFunctionData("safeMint", [
            aaAddress,
          ]),
        };

        let builder = kernel
          .execute(call)
          .setPaymasterAndData(paymaster);

        let opTemp = null;
        const res = await client.sendUserOperation(builder, {
          onBuild: (op) => {
            opTemp = op;
          },
        });
        console.log(opTemp);
        const ev = await res.wait();
        resolve({
          sender: opTemp.sender,
          paymaster: opTemp.paymasterAndData,
          userOpHash: res.userOpHash,
          txHash: ev?.transactionHash,
        });
      } catch (error) {
        console.error(error);
        reject(error);
      }
      setIsMinting(false);
    });
  }

  function mintNFT() {
    (async () => {
      try {
        const opData = await mintNFTCore();
        setOpData(opData);
      } catch (error) {
        console.error(error);
      }
    })();
  }

  function generateSessionKey() {
    (async () => {
      const wallet = ethers.Wallet.createRandom();
      const sessionKeyPriv = wallet.privateKey;
      const sessionKey = wallet.address;
      storage.setItem("ss_privkey", sessionKeyPriv);
      storage.setItem("ss_addr", sessionKey);

      const message = "Hello, world!";
      const messageBytes = ethers.utils.toUtf8Bytes(message);
      const sessionKeySigData = await wallet.signMessage(messageBytes);
      storage.setItem("ss_sigData", sessionKeySigData);

      setSSKData({
        sessionKeyPriv: sessionKeyPriv,
        sessionKey: sessionKey,
        sessionKeySigData: sessionKeySigData,
      });

      // const messageHash = ethers.utils.hashMessage(messageBytes);
      // const recoveredAddress = ethers.utils.recoverAddress(messageHash, sessionKeySigData);
    })();
  }

  function mintNFTBySessionKey() {

    (async () => {
      setIsMinting2(true);
      let sessionKeyPriv = storage.getItem("ss_privkey");
      if (!sessionKeyPriv) {
        return;
      }
      let sessionKeyAddr = storage.getItem("ss_addr");
      if (!sessionKeyAddr) {
        return;
      }
      let sessionKeySigData = storage.getItem("ss_sigData");
      if (!sessionKeySigData) {
        return;
      }
      let userAA1Addr = storage.getItem("aa_address");
      if (!userAA1Addr) {
        return;
      }
      console.log(sessionKeyPriv, sessionKeyAddr, sessionKeySigData);

      const target = "" // no limited
      const sessionKeyExecutor = "0xB5B2D6ab4aF3FB1C008d1933F8D0e3049e2d78Be"

      const serverAddr = "0xB5B2D6ab4aF3FB1C008d1933F8D0e3049e2d78Be"
      const serverPriv = "a01153107130534a21e9a4257e5670aed40a2c299f79b881c97e6d1a5a9f38a4"

      const provider = new BundlerJsonRpcProvider(nodeRpcUrl).setBundlerRpc(
        bundlerUrl
      );
      const serverWallet = new ethers.Wallet(serverPriv, provider);

      const kernel = await Presets.Builder.Kernel.init(serverWallet, nodeRpcUrl, {
        entryPoint: entryPoint,
        factory: kernelFactory,
        salt: aaWalletSalt,
        overrideBundlerRpc: bundlerUrl,
      });
      console.log("Kernel initialized");

      let abi = [
        {
          inputs: [
            {
              internalType: "contract IEntryPoint",
              name: "_entryPoint",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          inputs: [],
          name: "AlreadyInitialized",
          type: "error",
        },
        {
          inputs: [],
          name: "DisabledMode",
          type: "error",
        },
        {
          inputs: [],
          name: "NotAuthorizedCaller",
          type: "error",
        },
        {
          inputs: [],
          name: "NotEntryPoint",
          type: "error",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "oldValidator",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "newValidator",
              type: "address",
            },
          ],
          name: "DefaultValidatorChanged",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "bytes4",
              name: "selector",
              type: "bytes4",
            },
            {
              indexed: true,
              internalType: "address",
              name: "executor",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "validator",
              type: "address",
            },
          ],
          name: "ExecutionChanged",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "newImplementation",
              type: "address",
            },
          ],
          name: "Upgraded",
          type: "event",
        },
        {
          stateMutability: "payable",
          type: "fallback",
        },
        {
          inputs: [
            {
              internalType: "bytes4",
              name: "_disableFlag",
              type: "bytes4",
            },
          ],
          name: "disableMode",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [],
          name: "eip712Domain",
          outputs: [
            {
              internalType: "bytes1",
              name: "fields",
              type: "bytes1",
            },
            {
              internalType: "string",
              name: "name",
              type: "string",
            },
            {
              internalType: "string",
              name: "version",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "chainId",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "verifyingContract",
              type: "address",
            },
            {
              internalType: "bytes32",
              name: "salt",
              type: "bytes32",
            },
            {
              internalType: "uint256[]",
              name: "extensions",
              type: "uint256[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "entryPoint",
          outputs: [
            {
              internalType: "contract IEntryPoint",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "value",
              type: "uint256",
            },
            {
              internalType: "bytes",
              name: "data",
              type: "bytes",
            },
            {
              internalType: "enum Operation",
              name: "operation",
              type: "uint8",
            },
          ],
          name: "execute",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [],
          name: "getDefaultValidator",
          outputs: [
            {
              internalType: "contract IKernelValidator",
              name: "validator",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "getDisabledMode",
          outputs: [
            {
              internalType: "bytes4",
              name: "disabled",
              type: "bytes4",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes4",
              name: "_selector",
              type: "bytes4",
            },
          ],
          name: "getExecution",
          outputs: [
            {
              components: [
                {
                  internalType: "ValidAfter",
                  name: "validAfter",
                  type: "uint48",
                },
                {
                  internalType: "ValidUntil",
                  name: "validUntil",
                  type: "uint48",
                },
                {
                  internalType: "address",
                  name: "executor",
                  type: "address",
                },
                {
                  internalType: "contract IKernelValidator",
                  name: "validator",
                  type: "address",
                },
              ],
              internalType: "struct ExecutionDetail",
              name: "",
              type: "tuple",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "getLastDisabledTime",
          outputs: [
            {
              internalType: "uint48",
              name: "",
              type: "uint48",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint192",
              name: "key",
              type: "uint192",
            },
          ],
          name: "getNonce",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "getNonce",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "contract IKernelValidator",
              name: "_defaultValidator",
              type: "address",
            },
            {
              internalType: "bytes",
              name: "_data",
              type: "bytes",
            },
          ],
          name: "initialize",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "hash",
              type: "bytes32",
            },
            {
              internalType: "bytes",
              name: "signature",
              type: "bytes",
            },
          ],
          name: "isValidSignature",
          outputs: [
            {
              internalType: "bytes4",
              name: "",
              type: "bytes4",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "name",
          outputs: [
            {
              internalType: "string",
              name: "",
              type: "string",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
            {
              internalType: "address",
              name: "",
              type: "address",
            },
            {
              internalType: "uint256[]",
              name: "",
              type: "uint256[]",
            },
            {
              internalType: "uint256[]",
              name: "",
              type: "uint256[]",
            },
            {
              internalType: "bytes",
              name: "",
              type: "bytes",
            },
          ],
          name: "onERC1155BatchReceived",
          outputs: [
            {
              internalType: "bytes4",
              name: "",
              type: "bytes4",
            },
          ],
          stateMutability: "pure",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
            {
              internalType: "address",
              name: "",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
            {
              internalType: "bytes",
              name: "",
              type: "bytes",
            },
          ],
          name: "onERC1155Received",
          outputs: [
            {
              internalType: "bytes4",
              name: "",
              type: "bytes4",
            },
          ],
          stateMutability: "pure",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
            {
              internalType: "address",
              name: "",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
            {
              internalType: "bytes",
              name: "",
              type: "bytes",
            },
          ],
          name: "onERC721Received",
          outputs: [
            {
              internalType: "bytes4",
              name: "",
              type: "bytes4",
            },
          ],
          stateMutability: "pure",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "contract IKernelValidator",
              name: "_defaultValidator",
              type: "address",
            },
            {
              internalType: "bytes",
              name: "_data",
              type: "bytes",
            },
          ],
          name: "setDefaultValidator",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes4",
              name: "_selector",
              type: "bytes4",
            },
            {
              internalType: "address",
              name: "_executor",
              type: "address",
            },
            {
              internalType: "contract IKernelValidator",
              name: "_validator",
              type: "address",
            },
            {
              internalType: "uint48",
              name: "_validUntil",
              type: "uint48",
            },
            {
              internalType: "uint48",
              name: "_validAfter",
              type: "uint48",
            },
            {
              internalType: "bytes",
              name: "_enableData",
              type: "bytes",
            },
          ],
          name: "setExecution",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "_newImplementation",
              type: "address",
            },
          ],
          name: "upgradeTo",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [
            {
              components: [
                {
                  internalType: "address",
                  name: "sender",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "nonce",
                  type: "uint256",
                },
                {
                  internalType: "bytes",
                  name: "initCode",
                  type: "bytes",
                },
                {
                  internalType: "bytes",
                  name: "callData",
                  type: "bytes",
                },
                {
                  internalType: "uint256",
                  name: "callGasLimit",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "verificationGasLimit",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "preVerificationGas",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "maxFeePerGas",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "maxPriorityFeePerGas",
                  type: "uint256",
                },
                {
                  internalType: "bytes",
                  name: "paymasterAndData",
                  type: "bytes",
                },
                {
                  internalType: "bytes",
                  name: "signature",
                  type: "bytes",
                },
              ],
              internalType: "struct UserOperation",
              name: "userOp",
              type: "tuple",
            },
            {
              internalType: "bytes32",
              name: "userOpHash",
              type: "bytes32",
            },
            {
              internalType: "uint256",
              name: "missingAccountFunds",
              type: "uint256",
            },
          ],
          name: "validateUserOp",
          outputs: [
            {
              internalType: "ValidationData",
              name: "validationData",
              type: "uint256",
            },
          ],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [],
          name: "version",
          outputs: [
            {
              internalType: "string",
              name: "",
              type: "string",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          stateMutability: "payable",
          type: "receive",
        },
      ];
      
      const KernelContract = new ethers.Contract(userAA1Addr, abi, provider);

      let nftAbi = [
        {
          inputs: [],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "owner",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "approved",
              type: "address",
            },
            {
              indexed: true,
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
          ],
          name: "Approval",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "owner",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "operator",
              type: "address",
            },
            {
              indexed: false,
              internalType: "bool",
              name: "approved",
              type: "bool",
            },
          ],
          name: "ApprovalForAll",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "previousOwner",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "newOwner",
              type: "address",
            },
          ],
          name: "OwnershipTransferred",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "from",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              indexed: true,
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
          ],
          name: "Transfer",
          type: "event",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
          ],
          name: "approve",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "owner",
              type: "address",
            },
          ],
          name: "balanceOf",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
          ],
          name: "getApproved",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "owner",
              type: "address",
            },
            {
              internalType: "address",
              name: "operator",
              type: "address",
            },
          ],
          name: "isApprovedForAll",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "name",
          outputs: [
            {
              internalType: "string",
              name: "",
              type: "string",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "owner",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
          ],
          name: "ownerOf",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "renounceOwnership",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
          ],
          name: "safeMint",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "from",
              type: "address",
            },
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
          ],
          name: "safeTransferFrom",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "from",
              type: "address",
            },
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
            {
              internalType: "bytes",
              name: "data",
              type: "bytes",
            },
          ],
          name: "safeTransferFrom",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "operator",
              type: "address",
            },
            {
              internalType: "bool",
              name: "approved",
              type: "bool",
            },
          ],
          name: "setApprovalForAll",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes4",
              name: "interfaceId",
              type: "bytes4",
            },
          ],
          name: "supportsInterface",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "symbol",
          outputs: [
            {
              internalType: "string",
              name: "",
              type: "string",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
          ],
          name: "tokenURI",
          outputs: [
            {
              internalType: "string",
              name: "",
              type: "string",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "from",
              type: "address",
            },
            {
              internalType: "address",
              name: "to",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
          ],
          name: "transferFrom",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "newOwner",
              type: "address",
            },
          ],
          name: "transferOwnership",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];

      const NFTContract = new ethers.Contract(nftAddress, nftAbi, provider);

      const call = {
        to: userAA1Addr,
        value: 0,
        data: KernelContract.interface.encodeFunctionData("execute", [
          nftAddress,
          0,
          NFTContract.interface.encodeFunctionData("safeMint", [userAA1Addr]),
          0,
        ]),
      };

      const permissions: Permission[] = [
        // {
        //   target: target as Hex,
        //   valueLimit: 0,
        //   sig: getFunctionSelector("mint(address)"),
        //   operation: Operation.Call,
        //   rules: [
        //     {
        //       condition: ParamCondition.EQUAL,
        //       offset: 0,
        //       param: pad(sessionKeyExecutor as Hex, { size: 32 }),
        //     },
        //   ],
        // },
      ];

      const sessionKeyData = {
        validAfter: 0,
        validUntil: 0,
        permissions,
        paymaster: paymaster,
      };

      const validatorMode = "0x00000002";

      function getMerkleTree(): MerkleTree {
        const permissionPacked = sessionKeyData.permissions?.map((permission) =>
          encodePermissionData(permission)
        );
        if (permissionPacked?.length === 1)
          permissionPacked.push(permissionPacked[0]);

        return permissionPacked && permissionPacked.length !== 0
          ? new MerkleTree(permissionPacked, keccak256, {
              sortPairs: true,
              hashLeaves: true,
            })
          : new MerkleTree([pad("0x00", { size: 32 })], keccak256, {
              hashLeaves: false,
            });
      }

      const merkleTree = getMerkleTree();
      const enableData = concat([
        sessionKeyAddr as Hex,
        pad(merkleTree.getHexRoot() as Hex, { size: 32 }),
        pad(toHex(sessionKeyData.validAfter), { size: 6 }),
        pad(toHex(sessionKeyData.validUntil), { size: 6 }),
        // paymaster,
        serverAddr, // my self logic
      ]);
      const enableDataLength = enableData.length / 2 - 1;

      const encodedPermissionData =
        sessionKeyData.permissions &&
        sessionKeyData.permissions.length !== 0 &&
        permissions
          ? encodePermissionData(permissions[0])
          : "0x";

      const merkleProof = merkleTree.getHexProof(
        keccak256(encodedPermissionData)
      );

      const encodedData =
        sessionKeyData.permissions &&
        sessionKeyData.permissions.length !== 0 &&
        permissions
          ? encodePermissionData(permissions[0], merkleProof)
          : "0x";

      const sessionKeySig = concatHex([
        sessionKeyAddr as Hex,
        sessionKeySigData as Hex,
        encodedData,
      ]);

      const validAfter = 10000000000;
      const validUntil = 10000000000;

      let domain = {};

      let types = {
        ValidatorApproved: [
          { name: "sig", type: "bytes4" },
          { name: "validatorData", type: "uint256" },
          { name: "executor", type: "address" },
          { name: "enableData", type: "bytes" },
        ],
      };
      let message = {
        sig: getFunctionSelector("mint(address)"),
        validatorData: hexToBigInt(
          concatHex([
            pad(toHex(validUntil), { size: 6 }),
            pad(toHex(validAfter), { size: 6 }),
            SessionKeyOwnedValidator,
          ]),
          { size: 32 }
        ),
        executor: sessionKeyExecutor as Address,
        enableData: await enableData,
      };
      let enableSignature = await serverWallet._signTypedData(
        domain,
        types,
        message
      );
      console.log("enableSignature", enableSignature);
      const enableSigLength = 65;

      const signature = concatHex([
        validatorMode,
        pad(toHex(validUntil), { size: 6 }), // 6 bytes 4 - 10
        pad(toHex(validAfter), { size: 6 }), // 6 bytes 10 - 16
        pad(SessionKeyOwnedValidator, { size: 20 }), // 20 bytes 16 - 36
        pad(sessionKeyExecutor as Hex, { size: 20 }), // 20 bytes 36 - 56
        pad(toHex(enableDataLength), { size: 32 }),
        enableData,
        pad(toHex(enableSigLength), { size: 32 }),
        enableSignature as Hex,
        sessionKeySig as Hex,
      ]);

      // console.log(signature)
      const builder = kernel
        .execute(call)
        .setSignature(signature)
        .setPaymasterAndData(paymaster);
      console.log("Builder initialized");

      const client = await Client.init(nodeRpcUrl, {
        "entryPoint": entryPoint,
        "overrideBundlerRpc": bundlerUrl,
      });
      let opTemp = null
      const res = await client.sendUserOperation(builder, {
        onBuild: (op) => {
          opTemp = op
        },
      });
      console.log(`UserOpHash: ${res.userOpHash}`);

      const receipt = await res.wait();
      console.log(`receipt: ${receipt?.transactionHash}`);

      setOpData2({
        sender: opTemp?.sender,
        paymaster: opTemp?.paymasterAndData,
        userOpHash: res.userOpHash,
        txHash: receipt?.transactionHash,
      });
      setIsMinting2(false);
    })();
  }

  return (
    <div className="main-wrapper">
      <div className="content-wrapper">
        <section className="wallet-section">
          <h2>Connect Your Wallet</h2>
          <Connect clearSig={clearSig} />
        </section>
        <main className="main-content">
          <Connected>
            <section className="account-info">
              <h2>Check your network</h2>
              <NetworkSwitcher opEnduChainId={opEnduChainId} />
            </section>

            <section className="message-sign">
              <h2>Sign a message</h2>
              <SignAAMessage
                privKey={privKey}
                sigIsloading={sigIsloading}
                signMessage={signMessage}
              />
            </section>

            <section className="account-info">
              <h2>Abstract Account Information</h2>
              <AccountInfo
                aaAddress={aaAddress}
                nftAddress={nftAddress}
                opEnduChainId={opEnduChainId}
                isIniting={isIniting}
              />
            </section>

            <section className="account-info">
              <h2>Mint a NFT</h2>
              <Mint
                mintNFT={mintNFT}
                isMinting={isMinting}
                opData={opData}
                privKey={privKey}
              />
            </section>

            <section className="account-info">
              <h2>Export AA Account Private Key</h2>
              <div className="mint-section">
                {!showPrivKey && (
                  <button
                    className="mint-button"
                    type="submit"
                    onClick={() => setShowPrivKey(true)}
                    disabled={!privKey}
                  >
                    Show Private Key
                  </button>
                )}
                {showPrivKey && (
                  <button
                    className="mint-button"
                    type="submit"
                    onClick={() => setShowPrivKey(false)}
                    disabled={!privKey}
                  >
                    Hide Private Key
                  </button>
                )}
                <br />
                <br />
                {showPrivKey && privKey && (
                  <div className="privkey">
                    <div className="privkey-content">{privKey}</div>
                  </div>
                )}
              </div>
            </section>

            <section className="account-info">
              <h2>Generate a Session Key</h2>
              <div className="mint-section">
                {
                  <button
                    className="mint-button"
                    type="submit"
                    onClick={() => generateSessionKey()}
                    disabled={!privKey}
                  >
                    Create
                  </button>
                }
                <br />
                <br />
                {sskData.sessionKey && (
                  <div className="privkey">
                    <div className="privkey-content">
                      <div>Session Key: {sskData.sessionKey}</div>
                      <div>
                        Session Key Private Key: {sskData.sessionKeyPriv}
                      </div>
                      {/* <div>
                        Session Key Signature Data: {sskData.sessionKeySigData}
                      </div> */}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="account-info">
              <h2>Mint NFT by Session Key</h2>
              <div className="mint-section">
                {
                  <button
                    className="mint-button"
                    type="submit"
                    onClick={() => mintNFTBySessionKey()}
                    disabled={!privKey || isMinting2 || !sskData.sessionKey}
                  >
                    Mint by Session Key
                  </button>
                }
                <br />
                <br />
                {opData2.sender && (
                  <div className="privkey">
                    <div className="privkey-content">
                      <div>Sender: {opData2.sender}</div>
                      <div>Paymaster: {opData2.paymaster}</div>
                      <div>UserOpHash: {opData2.userOpHash}</div>
                      <div>TxHash: {opData2.txHash}</div>
                      <div>View on Explorer: <a href={`https://explorer-l2-op-endurance-testnet1.fusionist.io/tx/${opData2.txHash}`} target="_blank">Check it</a></div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </Connected>
        </main>
      </div>
    </div>
  );
}
