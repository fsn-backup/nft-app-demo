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
import EnduNFTData from "../endu/artifacts/EnduNFT.json";
import { usePublicClient, useWalletClient } from "wagmi";
import { providers } from "ethers";
import { useAccount, useEnsName } from "wagmi";

import {
  UserOperationBuilder,
  DEFAULT_CALL_GAS_LIMIT,
  DEFAULT_VERIFICATION_GAS_LIMIT,
  DEFAULT_PRE_VERIFICATION_GAS,
  DEFAULT_USER_OP,
  UserOperationMiddlewareFn,
  Client,
  Presets,
  BundlerJsonRpcProvider,
} from "./src";
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
  getContract,
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
import { UserOperationMiddlewareCtx } from "./src/context";
import {
  ParamCondition,
  ParamRules,
  Operation,
  Permission,
  encodePermissionData,
} from "./src/kernel_util";
import { OpToJSON } from "./src/utils";

export function App() {
  const { address: userAddress, connector, isConnected } = useAccount();

  const nodeRpcUrl = "https://rpc-l2-op-endurance-testnet1.fusionist.io/";
  const bundlerUrl = "https://test-bundler-gamewallet.fusionist.io/";
  const paymasterUrl =
    "https://rpc-paymaster-l2-op-endurance-testnet1.fusionist.io/paymaster";

  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const paymaster = "0x396634BcFc59ad0096BE03c04f179a3B5aC00568";
  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35";

  const opEnduChainId = 6480001000;
  const aaWalletSalt = "1";

  const kernelFactory = "0xA171f41588bA43666F4ee9F1f87C1D84f573d848";
  const kernelImpl = "0x3FEf6c193e5632d6fd65Da1bC82d34EDc33Cd251";
  const ECDSAValidator = "0xBdD707ac36bC0176464292D03f4fAA1bf5fBCeba";
  const SessionKeyExecValidator = "0x75Fb570b6e16D6cA61C733E629c297E863F24076";
  const SessionKeyOwnedValidator = "0x99D08AA79ea8BD6d127f51CF87ce0aD64643b854";

  const storage = localStorage;
  const [aaAddress, setAAAddress] = useState("");
  const [isIniting, setIsIniting] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [opData, setOpData] = useState({});
  const [sskData, setSSKData] = useState({});
  const [isGeneratingSSK, setGeneratingSSK] = useState(false);

  let aaAddressLocal = storage.getItem("aa_address");
  useEffect(() => {
    if (aaAddressLocal) {
      setAAAddress(aaAddressLocal.toString());
    }
  }, [aaAddressLocal]);

  let sessionKeyPriv = storage.getItem("ss_privkey");
  let sessionKeyAddr = storage.getItem("ss_addr");
  let sessionKeySigData = storage.getItem("ss_sigData");
  let sessionKeyEnableData = storage.getItem("ss_enableData");
  let sessionKeyValidAfter = storage.getItem("ss_validAfter");
  let sessionKeyValidUntil = storage.getItem("ss_validUntil");
  useEffect(() => {
    if (
      sessionKeyAddr &&
      sessionKeyPriv &&
      sessionKeySigData &&
      sessionKeyEnableData &&
      sessionKeyValidAfter &&
      sessionKeyValidUntil
    ) {
      setSSKData({
        sessionKeyPriv: sessionKeyPriv,
        sessionKey: sessionKeyAddr,
        sessionKeySigData: sessionKeySigData,
        sessionKeyEnableData: sessionKeyEnableData,
        ValidAfter: sessionKeyValidAfter,
        ValidUntil: sessionKeyValidUntil,
      });
    } else {
      if (sessionKeyAddr && sessionKeyPriv) {
        setSSKData({
          sessionKeyPriv: sessionKeyPriv,
          sessionKey: sessionKeyAddr,
        });
      }
    }
  }, [sessionKeyPriv, sessionKeyAddr, sessionKeySigData, sessionKeyEnableData]);

  function clearSig() {
    setAAAddress("");
    setSSKData({});
    setOpData({});
    storage.setItem("aa_privkey", "");
    storage.setItem("aa_address", "");
    storage.setItem("ss_privkey", "");
    storage.setItem("ss_addr", "");
    storage.setItem("ss_enableData", "");
    storage.setItem("ss_validAfter", "");
    storage.setItem("ss_validUntil", "");
  }

  function walletClientToSigner(walletClient: WalletClient) {
    const { account, chain, transport } = walletClient;
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    };
    const provider = new providers.Web3Provider(transport, network);
    const signer = provider.getSigner(account.address);
    return signer;
  }

  /** Hook to convert a viem Wallet Client to an ethers.js Signer. */
  function useEthersSigner({ chainId }: { chainId?: number } = {}) {
    const { data: walletClient } = useWalletClient({ chainId });
    return React.useMemo(
      () => (walletClient ? walletClientToSigner(walletClient) : undefined),
      [walletClient]
    );
  }

  const userWallet = useEthersSigner();

  function getKernelAddress() {
    (async () => {
      setIsIniting(true);
      console.log("start init kernel");
      const kernel = await Presets.Builder.Kernel.init(userWallet, nodeRpcUrl, {
        entryPoint: entryPoint,
        factory: kernelFactory,
        salt: aaWalletSalt,
        overrideBundlerRpc: bundlerUrl,
        kernelImpl: kernelImpl,
        ECDSAValidator: ECDSAValidator,
        paymasterMiddleware: paymasterFn,
      });
      console.log("kernel:", kernel);
      const address = kernel.getSender();
      console.log(`Kernel address: ${address}`);

      setAAAddress(address);
      storage.setItem("aa_address", address);
      setIsIniting(false);
    })();
  }

  const paymasterFn = async (ctx: UserOperationMiddlewareCtx) => {
    console.log("Enter verifyingPaymaster");

    const validAfter = 1594068745;
    let validUntil = 1623012745;
    const SvalidAfter = 1594068745;
    let SvalidUntil = 1923012745;

    const pProvider = new ethers.providers.JsonRpcProvider(paymasterUrl);
    const pm = await pProvider.send("pm_sponsorUserOperation", [
      OpToJSON(ctx.op),
      ctx.entryPoint,
      ctx,
      SvalidUntil,
      validUntil,
    ]);

    ctx.op.paymasterAndData = concatHex([
      pm["paymaster"] as Hex,
      pad(toHex(SvalidUntil), { size: 32 }),
      pad(toHex(validUntil), { size: 32 }),
      pm["paymasterSignature"] as Hex,
    ]);
  };

  function signSessionKey() {
    (async () => {
      const validAfter = 1;
      let validUntil = 1623012745;
      const ssk_validAfter = 1;
      let ssk_validUntil = 1923012745;

      validUntil = Math.floor(Date.now() / 1000);
      ssk_validUntil = validUntil + 5 * 60;

      const sig = getFunctionSelector("safeMint(address)")
      const permissions: Permission[] = [
        {
          target: nftAddress as Hex,
          valueLimit: 0,
          sig: sig,
          operation: Operation.Call,
          rules: [
            {
              condition: ParamCondition.EQUAL,
              offset: 0,
              param: pad(aaAddress as Hex, { size: 32 }),
            },
          ],
        },
      ];

      const sessionKeyData = {
        validAfter: ssk_validAfter,
        validUntil: ssk_validUntil,
        permissions,
        paymaster: paymaster,
      };

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
        paymaster,
      ]);
      console.log("enableData:", enableData);
      const enableDataLength = enableData.length / 2 - 1;

      const kernel = await Presets.Builder.Kernel.init(userWallet, nodeRpcUrl, {
        entryPoint: entryPoint,
        factory: kernelFactory,
        salt: aaWalletSalt,
        overrideBundlerRpc: bundlerUrl,
        kernelImpl: kernelImpl,
        ECDSAValidator: ECDSAValidator,
        paymasterMiddleware: paymasterFn,
      });
      const NFTContract = new ethers.Contract(
        nftAddress,
        EnduNFTData.abi,
        userWallet
      );
      const call = {
        to: nftAddress,
        value: 0,
        data: NFTContract.interface.encodeFunctionData("safeMint", [aaAddress]),
      };

      const callData = kernel.proxy.interface.encodeFunctionData("execute", [
        call.to,
        call.value,
        call.data,
        Operation.Call,
      ]);
      const enableSigHex = callData.slice(2, 2 + 8);
      const enableSig = Buffer.from(enableSigHex, "hex");

      const domain = {
        name: "Kernel",
        version: "0.2.1",
        chainId: 6480001000,
        verifyingContract: aaAddress,
      };
      const types = {
        ValidatorApproved: [
          { name: "sig", type: "bytes4" },
          { name: "validatorData", type: "uint256" },
          { name: "executor", type: "address" },
          { name: "enableData", type: "bytes" },
        ],
      };
      const message = {
        sig: enableSig,
        validatorData: hexToBigInt(
          concatHex([
            pad(toHex(validUntil), { size: 6 }),
            pad(toHex(validAfter), { size: 6 }),
            SessionKeyExecValidator,
          ]),
          { size: 32 }
        ),
        executor: aaAddress as Address,
        enableData: enableData,
      };
      const enableSignature = await userWallet._signTypedData(
        domain,
        types,
        message
      );
      console.log("enableSignature:", enableSignature);

      setSSKData({
        ...sskData,
        sessionKeySigData: enableSignature,
        sessionKeyEnableData: enableData,
        ValidAfter: sessionKeyData.validAfter,
        validUntil: sessionKeyData.validUntil,
      });
      storage.setItem("ss_sigData", enableSignature);
      storage.setItem("ss_enableData", enableData);
      storage.setItem("ss_validAfter", validUntil.toString());
      storage.setItem("ss_validUntil", ssk_validUntil.toString());
    })();
  }

  function generateSessionKey() {
    (async () => {
      setGeneratingSSK(true);
      const wallet = ethers.Wallet.createRandom();
      const sessionKeyPriv = wallet.privateKey;
      const sessionKey = wallet.address;
      storage.setItem("ss_privkey", sessionKeyPriv);
      storage.setItem("ss_addr", sessionKey);
      storage.setItem("ss_sigData", "");

      setSSKData({
        sessionKeyPriv: sessionKeyPriv,
        sessionKey: sessionKey,
        sessionKeySigData: "",
        ValidAfter: 0,
        validUntil: 0,
      });
      setGeneratingSSK(false);
    })();
  }

  function mintNFTBySessionKey() {
    (async () => {
      setIsMinting(true);
      let sessionKeyPriv = storage.getItem("ss_privkey");
      if (!sessionKeyPriv) {
        return;
      }
      let sessionKeyAddr = storage.getItem("ss_addr");
      if (!sessionKeyAddr) {
        return;
      }
      let sessionKeyEnableData = storage.getItem("ss_enableData");
      if (!sessionKeyEnableData) {
        return;
      }
      let enableSigData = storage.getItem("ss_sigData");
      if (!enableSigData) {
        return;
      }
      let aaAddress = storage.getItem("aa_address");
      if (!aaAddress) {
        return;
      }
      console.log(sessionKeyPriv, sessionKeyAddr, enableSigData);

      const serverAddr = "0xB5B2D6ab4aF3FB1C008d1933F8D0e3049e2d78Be";
      const serverPriv =
        "a01153107130534a21e9a4257e5670aed40a2c299f79b881c97e6d1a5a9f38a4";

      const client = await Client.init(nodeRpcUrl, {
        entryPoint: entryPoint,
        overrideBundlerRpc: bundlerUrl,
      });

      const validatorMode = "0x00000002";

      const validAfter = 1;
      const validUntilStr = storage.getItem("ss_validAfter");
      if (!validUntilStr) {
        return;
      }
      const validUntil = parseInt(validUntilStr.toString(), 10);
      const ssk_validAfter = 1;
      let ssk_validUntilStr = storage.getItem("ss_validUntil");
      if (!ssk_validUntilStr) {
        return;
      }
      const ssk_validUntil = parseInt(ssk_validUntilStr.toString(), 10);
      console.log("validUntil:", validUntil, "ssk_validUntil:", ssk_validUntil);

      const provider = new BundlerJsonRpcProvider(nodeRpcUrl).setBundlerRpc(
        bundlerUrl
      );
      const serverWallet = new ethers.Wallet(serverPriv, provider);

      const kernel = await Presets.Builder.Kernel.init(
        serverWallet,
        nodeRpcUrl,
        {
          entryPoint: entryPoint,
          factory: kernelFactory,
          salt: aaWalletSalt,
          overrideBundlerRpc: bundlerUrl,
          kernelImpl: kernelImpl,
          ECDSAValidator: ECDSAValidator,
          paymasterMiddleware: paymasterFn,
          singer: userAddress,
        }
      );

      const NFTContract = new ethers.Contract(
        nftAddress,
        EnduNFTData.abi,
        userWallet
      );

      const call = {
        to: nftAddress,
        value: 0,
        data: NFTContract.interface.encodeFunctionData("safeMint", [aaAddress]),
      };

      const builder = kernel.execute(call).setSender(aaAddress);
      const userOp = await client.buildUserOperation(builder);

      const hash = getUserOperationHash(
        {
          sender: userOp.sender as Address,
          nonce: userOp.nonce as Hex,
          initCode: userOp.initCode as Hex,
          callData: userOp.callData as Hex,
          callGasLimit: userOp.callGasLimit as Hex,
          verificationGasLimit: userOp.verificationGasLimit as Hex,
          preVerificationGas: userOp.preVerificationGas as Hex,
          maxFeePerGas: userOp.maxFeePerGas as Hex,
          maxPriorityFeePerGas: userOp.maxPriorityFeePerGas as Hex,
          paymasterAndData: userOp.paymasterAndData as Hex,
          signature: userOp.signature as Hex,
        },
        entryPoint,
        BigInt(opEnduChainId)
      );

      const sessionKeyWallet = new ethers.Wallet(sessionKeyPriv, provider);

      const sig = getFunctionSelector("safeMint(address)")
      const permissions: Permission[] = [
        {
          target: nftAddress as Hex,
          valueLimit: 0,
          sig: sig,
          operation: Operation.Call,
          rules: [
            {
              condition: ParamCondition.EQUAL,
              offset: 0,
              param: pad(aaAddress as Hex, { size: 32 }),
            },
          ],
        },
      ];

      const sessionKeyData = {
        validAfter: ssk_validAfter,
        validUntil: ssk_validUntil,
        permissions,
        paymaster: paymaster,
      };

      const encodedPermissionData =
        sessionKeyData.permissions &&
        sessionKeyData.permissions.length !== 0 &&
        permissions
          ? encodePermissionData(permissions[0])
          : "0x";

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
      const merkleProof = merkleTree.getHexProof(
        keccak256(encodedPermissionData)
      );

      const encodedData =
        sessionKeyData.permissions &&
        sessionKeyData.permissions.length !== 0 &&
        permissions
          ? encodePermissionData(permissions[0], merkleProof)
          : "0x";

      const messageBytes = ethers.utils.arrayify(hash);
      const sessionKeySigData = await sessionKeyWallet.signMessage(
        messageBytes
      );

      const sessionKeySig = concatHex([
        sessionKeyAddr as Hex,
        sessionKeySigData as Hex,
        encodedData,
      ]);

      const enableSigLength = enableSigData.length / 2 - 1;
      const enableDataLength = sessionKeyEnableData.length / 2 - 1;

      const signature = concatHex([
        validatorMode,
        pad(toHex(validUntil), { size: 6 }), // 6 bytes 4 - 10
        pad(toHex(validAfter), { size: 6 }), // 6 bytes 10 - 16
        pad(SessionKeyExecValidator, { size: 20 }), // 20 bytes 16 - 36
        pad(aaAddress as Hex, { size: 20 }), // 20 bytes 36 - 56
        pad(toHex(enableDataLength), { size: 32 }),
        sessionKeyEnableData as Hex,
        pad(toHex(enableSigLength), { size: 32 }),
        enableSigData as Hex,
        sessionKeySig as Hex,
      ]);

      userOp.signature = signature;
      let opTemp = null;
      let res;
      try {
        res = await client.sendUserOperationOnly(builder, userOp, {
          onBuild: (op) => {
            opTemp = op;
          },
        });
      } catch (error) {
        const errorMessage = error.message;
        const errorCode = error.code;
        const requestBody = error.requestBody;
        const requestMethod = error.requestMethod;
        const url = error.url;
        const version = error.version;

        const jsonBody = errorMessage.match(/body="({.*})"/)[1];
        setOpData({
          error: jsonBody
        });
        setIsMinting(false);
        return;
      }
      console.log(`UserOpHash: ${res.userOpHash}`);

      const receipt = await res.wait();
      console.log(`receipt: ${receipt?.transactionHash}`);

      setOpData({
        sender: opTemp?.sender,
        paymaster: opTemp?.paymasterAndData,
        userOpHash: res.userOpHash,
        txHash: receipt?.transactionHash,
        sessionKey: sessionKeyAddr,
      });
      setIsMinting(false);
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
              <h2>Create your Abstract Account</h2>
              <div className="sign-message-section">
                {!aaAddress && !isIniting && (
                  <div className="PromptMessage">
                    You may need to sign a message to create your Abstract
                    Account.
                  </div>
                )}
                {aaAddress && !isIniting && (
                  <div className="ConfirmationMessage">
                    You already created your Abstract Account.
                  </div>
                )}
                {
                  <button
                    className="sign-button"
                    disabled={aaAddress || isIniting}
                    onClick={() => getKernelAddress()}
                  >
                    Init Abstract Account
                  </button>
                }
                <br />
                <br />
              </div>
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
              <h2>Generate a Session Key</h2>
              <div className="mint-section">
                {isGeneratingSSK && (
                  <div className="ProcessingMessage">Generating...</div>
                )}
                {
                  <button
                    className="mint-button"
                    type="submit"
                    onClick={() => generateSessionKey()}
                    disabled={!aaAddress || isGeneratingSSK}
                  >
                    Generate a Session Key
                  </button>
                }
                <br />
                <br />
                {sskData.sessionKey && !isGeneratingSSK && (
                  <div className="privkey">
                    <div className="privkey-content">
                      <div className="mint-success-data">
                        <div className="mint-success-data-title">
                          Session Key
                        </div>
                        <div className="mint-success-data-content">
                          {sskData.sessionKey}
                        </div>
                        <div className="mint-success-data-title">
                          Session Key Private Key
                        </div>
                        <div className="mint-success-data-content">
                          {sskData.sessionKeyPriv}
                        </div>
                        <div className="mint-success-data-title">
                          Session Key Signature
                        </div>
                        <div className="mint-success-data-content">
                          {sskData.sessionKeySigData && (
                            <span>{sskData.sessionKeySigData}</span>
                          )}
                          {!sskData.sessionKeySigData && (
                            <span className="red">Not signed yet</span>
                          )}
                        </div>
                        <div className="mint-success-data-title">
                          Valid After
                        </div>
                        <div className="mint-success-data-content">
                          {sskData.sessionKeySigData && (
                            <span>
                              {new Date(
                                sskData.ValidAfter * 1000
                              ).toLocaleString()}
                              {/* {sskData.ValidAfter} */}
                            </span>
                          )}
                          {!sskData.sessionKeySigData && (
                            <span className="red">Not signed yet</span>
                          )}
                        </div>
                        <div className="mint-success-data-title">
                          Valid Until
                        </div>
                        <div className="mint-success-data-content">
                          {sskData.sessionKeySigData && (
                            <span>
                              {new Date(
                                sskData.ValidUntil * 1000
                              ).toLocaleString()}
                              {/* {sskData.ValidUntil} */}
                            </span>
                          )}
                          {!sskData.sessionKeySigData && (
                            <span className="red">Not signed yet</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="message-sign">
              <h2>Sign the Sesskey Key</h2>
              <div className="sign-message-section">
                {sskData.sessionKeySigData && (
                  <div className="ConfirmationMessage">
                    You already signed the Session Key
                  </div>
                )}
                {
                  <button
                    className="sign-button"
                    onClick={() => signSessionKey()}
                    disabled={sskData.sessionKeySigData || !sskData.sessionKey}
                  >
                    Sign it
                  </button>
                }
                <br />
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
                    disabled={isMinting || !sskData.sessionKeySigData}
                  >
                    Mint by Session Key
                  </button>
                }
                <br />
                {opData.sender && !isMinting && !opData.error && (
                  <div className="ConfirmationMessage">
                    Mint NFT successfully
                  </div>
                )}
                <br />
                {opData && opData.sender && !isMinting && !opData.error && (
                  <div className="mint-success-data">
                    <div className="mint-success-data-title">Sender:</div>
                    <div className="mint-success-data-content">
                      {opData.sender}
                    </div>
                    <div className="mint-success-data-title">Paymaster</div>
                    <div className="mint-success-data-content">
                      {opData?.paymaster?.substring(0, 42) ?? ""}
                    </div>
                    <div className="mint-success-data-title">Session Key</div>
                    <div className="mint-success-data-content">
                      {opData?.sessionKey}
                    </div>
                    <div className="mint-success-data-title">
                      Operation Hash
                    </div>
                    <div className="mint-success-data-content">
                      {opData.userOpHash}
                    </div>
                    <div className="mint-success-data-title">
                      Transaction Hash
                    </div>
                    <div className="mint-success-data-content">
                      {opData.txHash}
                      <br />
                      <br />
                      <a
                        href={`https://explorer-l2-op-endurance-testnet1.fusionist.io/tx/${opData.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on Etherscan
                      </a>
                    </div>
                  </div>
                )}
                {isMinting && (
                  <div className="ProcessingMessage">Minting...</div>
                )}
               
                {!isMinting && opData.error && (
                  <div className="ErrorNotification">Mint NFT failed</div>
                )}
                {!isMinting && opData.error && (
                  <div className="mint-success-data">
                    <div className="mint-success-data-title">Error message:</div>
                    <br/>
                    <div className="mint-success-data-content error-textarea" 
                    >
                      {/* {opData?.error} */}
                      <textarea
                        value={opData?.error}
                        rows="10"
                        cols="100"
                      ></textarea>
                    </div>
                  </div>
                )}
              </div>

              <be />
              <be />
            </section>
          </Connected>
        </main>
      </div>
    </div>
  );
}
