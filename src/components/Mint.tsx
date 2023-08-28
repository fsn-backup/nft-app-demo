'use client'

import * as ethers from 'ethers' 
import {
  Client,
  Presets} from "userop";
import React, { useState, useEffect } from 'react';

export function Mint() {
  const [isDisable, setIsDisable] = useState(false);
  const [isWaitOp, setIsWaitOp] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [senderValue, setSenderValue] = useState('');
  const [opHashValue, setOpHashValue] = useState('');

  let bundlerUrl = "https://https://test-bundler-gamewallet.fusionist.io//1337"
  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const accountFactory = "0x6218d8C39208C408d096Ac5F3BaC3472e6381526";
  const paymaster = "0x1a256A0221b030A8A50Cb18966Ebdc4325a92D7F"
  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35"

  return (
    <div className="Mint">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          
          ;(async () => {
            try {
              let privateKeyHex = localStorage.getItem('aa_privkey');
              if (privateKeyHex == null) {
                setIsDisable(true);
                return;
              } else {
                setIsDisable(false);
              }

              setIsWaitOp(false);

              const client = await Client.init(bundlerUrl, { "entryPoint": entryPoint });
              const provider = new ethers.providers.JsonRpcProvider(bundlerUrl);
            
              const wallet = new ethers.Wallet(privateKeyHex, provider);
              let simpleAccount = await Presets.Builder.SimpleAccount.init(wallet, bundlerUrl, {
                "entryPoint": entryPoint,
                "factory": accountFactory,
                "salt": "0"
              })
              const address = simpleAccount.getSender();
              localStorage.setItem('aa_address', address);
              setSenderValue(address);

              let abi = [
                {
                  "inputs": [],
                  "stateMutability": "nonpayable",
                  "type": "constructor"
                },
                {
                  "anonymous": false,
                  "inputs": [
                    {
                      "indexed": true,
                      "internalType": "address",
                      "name": "owner",
                      "type": "address"
                    },
                    {
                      "indexed": true,
                      "internalType": "address",
                      "name": "approved",
                      "type": "address"
                    },
                    {
                      "indexed": true,
                      "internalType": "uint256",
                      "name": "tokenId",
                      "type": "uint256"
                    }
                  ],
                  "name": "Approval",
                  "type": "event"
                },
                {
                  "anonymous": false,
                  "inputs": [
                    {
                      "indexed": true,
                      "internalType": "address",
                      "name": "owner",
                      "type": "address"
                    },
                    {
                      "indexed": true,
                      "internalType": "address",
                      "name": "operator",
                      "type": "address"
                    },
                    {
                      "indexed": false,
                      "internalType": "bool",
                      "name": "approved",
                      "type": "bool"
                    }
                  ],
                  "name": "ApprovalForAll",
                  "type": "event"
                },
                {
                  "anonymous": false,
                  "inputs": [
                    {
                      "indexed": true,
                      "internalType": "address",
                      "name": "previousOwner",
                      "type": "address"
                    },
                    {
                      "indexed": true,
                      "internalType": "address",
                      "name": "newOwner",
                      "type": "address"
                    }
                  ],
                  "name": "OwnershipTransferred",
                  "type": "event"
                },
                {
                  "anonymous": false,
                  "inputs": [
                    {
                      "indexed": true,
                      "internalType": "address",
                      "name": "from",
                      "type": "address"
                    },
                    {
                      "indexed": true,
                      "internalType": "address",
                      "name": "to",
                      "type": "address"
                    },
                    {
                      "indexed": true,
                      "internalType": "uint256",
                      "name": "tokenId",
                      "type": "uint256"
                    }
                  ],
                  "name": "Transfer",
                  "type": "event"
                },
                {
                  "inputs": [
                    {
                      "internalType": "address",
                      "name": "to",
                      "type": "address"
                    },
                    {
                      "internalType": "uint256",
                      "name": "tokenId",
                      "type": "uint256"
                    }
                  ],
                  "name": "approve",
                  "outputs": [],
                  "stateMutability": "nonpayable",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "address",
                      "name": "owner",
                      "type": "address"
                    }
                  ],
                  "name": "balanceOf",
                  "outputs": [
                    {
                      "internalType": "uint256",
                      "name": "",
                      "type": "uint256"
                    }
                  ],
                  "stateMutability": "view",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "uint256",
                      "name": "tokenId",
                      "type": "uint256"
                    }
                  ],
                  "name": "getApproved",
                  "outputs": [
                    {
                      "internalType": "address",
                      "name": "",
                      "type": "address"
                    }
                  ],
                  "stateMutability": "view",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "address",
                      "name": "owner",
                      "type": "address"
                    },
                    {
                      "internalType": "address",
                      "name": "operator",
                      "type": "address"
                    }
                  ],
                  "name": "isApprovedForAll",
                  "outputs": [
                    {
                      "internalType": "bool",
                      "name": "",
                      "type": "bool"
                    }
                  ],
                  "stateMutability": "view",
                  "type": "function"
                },
                {
                  "inputs": [],
                  "name": "name",
                  "outputs": [
                    {
                      "internalType": "string",
                      "name": "",
                      "type": "string"
                    }
                  ],
                  "stateMutability": "view",
                  "type": "function"
                },
                {
                  "inputs": [],
                  "name": "owner",
                  "outputs": [
                    {
                      "internalType": "address",
                      "name": "",
                      "type": "address"
                    }
                  ],
                  "stateMutability": "view",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "uint256",
                      "name": "tokenId",
                      "type": "uint256"
                    }
                  ],
                  "name": "ownerOf",
                  "outputs": [
                    {
                      "internalType": "address",
                      "name": "",
                      "type": "address"
                    }
                  ],
                  "stateMutability": "view",
                  "type": "function"
                },
                {
                  "inputs": [],
                  "name": "renounceOwnership",
                  "outputs": [],
                  "stateMutability": "nonpayable",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "address",
                      "name": "to",
                      "type": "address"
                    }
                  ],
                  "name": "safeMint",
                  "outputs": [],
                  "stateMutability": "nonpayable",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "address",
                      "name": "from",
                      "type": "address"
                    },
                    {
                      "internalType": "address",
                      "name": "to",
                      "type": "address"
                    },
                    {
                      "internalType": "uint256",
                      "name": "tokenId",
                      "type": "uint256"
                    }
                  ],
                  "name": "safeTransferFrom",
                  "outputs": [],
                  "stateMutability": "nonpayable",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "address",
                      "name": "from",
                      "type": "address"
                    },
                    {
                      "internalType": "address",
                      "name": "to",
                      "type": "address"
                    },
                    {
                      "internalType": "uint256",
                      "name": "tokenId",
                      "type": "uint256"
                    },
                    {
                      "internalType": "bytes",
                      "name": "data",
                      "type": "bytes"
                    }
                  ],
                  "name": "safeTransferFrom",
                  "outputs": [],
                  "stateMutability": "nonpayable",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "address",
                      "name": "operator",
                      "type": "address"
                    },
                    {
                      "internalType": "bool",
                      "name": "approved",
                      "type": "bool"
                    }
                  ],
                  "name": "setApprovalForAll",
                  "outputs": [],
                  "stateMutability": "nonpayable",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "bytes4",
                      "name": "interfaceId",
                      "type": "bytes4"
                    }
                  ],
                  "name": "supportsInterface",
                  "outputs": [
                    {
                      "internalType": "bool",
                      "name": "",
                      "type": "bool"
                    }
                  ],
                  "stateMutability": "view",
                  "type": "function"
                },
                {
                  "inputs": [],
                  "name": "symbol",
                  "outputs": [
                    {
                      "internalType": "string",
                      "name": "",
                      "type": "string"
                    }
                  ],
                  "stateMutability": "view",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "uint256",
                      "name": "tokenId",
                      "type": "uint256"
                    }
                  ],
                  "name": "tokenURI",
                  "outputs": [
                    {
                      "internalType": "string",
                      "name": "",
                      "type": "string"
                    }
                  ],
                  "stateMutability": "view",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "address",
                      "name": "from",
                      "type": "address"
                    },
                    {
                      "internalType": "address",
                      "name": "to",
                      "type": "address"
                    },
                    {
                      "internalType": "uint256",
                      "name": "tokenId",
                      "type": "uint256"
                    }
                  ],
                  "name": "transferFrom",
                  "outputs": [],
                  "stateMutability": "nonpayable",
                  "type": "function"
                },
                {
                  "inputs": [
                    {
                      "internalType": "address",
                      "name": "newOwner",
                      "type": "address"
                    }
                  ],
                  "name": "transferOwnership",
                  "outputs": [],
                  "stateMutability": "nonpayable",
                  "type": "function"
                }
              ]

              const NFTContract = new ethers.Contract(
                nftAddress,
                abi,
                provider
              );
            
              const call = {
                to: nftAddress,
                value: ethers.constants.Zero,
                data: NFTContract.interface.encodeFunctionData("safeMint", [address]),
              };
            
              let builder = simpleAccount.execute(call.to, call.value, call.data)
                .setPaymasterAndData(paymaster)

              const res = await client.sendUserOperation(
                builder,
                { onBuild: (op) => console.log("Signed UserOperation:", op) }
              );
              setOpHashValue(res.userOpHash);

              setIsSuccess(true);
            } catch (error) {
              console.error(error);
            }
          })();

        }}
      >
         <button className="mint-button" type="submit">
        Mint
      </button>

      {isDisable && <div className="ErrorMessage">Please sign the message first.</div>}
    </form>

    <div className={isWaitOp ? "LoadingMessage" : isSuccess ? "SuccessMessage" : "ErrorMessage"}>
      {!isWaitOp && !isSuccess && 'Transaction pending...'}
      {isSuccess && 'Transaction successful!'}
    </div>

    {isSuccess && (
      <div className="transaction-details">
        <div>Abstract Account Sender: {senderValue}</div>
        <div>UserOpHash: {opHashValue}</div>
        <div>
          Check NFT on blockchain explorer:
          <a href={`https://explorer-l2-op-endurance-testnet1.fusionist.io/address/${senderValue}`}>
            View on Explorer
          </a>
        </div>
      </div>
    )}
  </div>
  )
}
