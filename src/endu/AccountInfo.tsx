"use client";

import React from "react";
import { useAccount, useEnsName } from "wagmi";
import EnduNFTData from "./artifacts/EnduNFT.json";
import { useContractRead } from "wagmi";

export function AccountInfo(props) {
  // EOA Account Info
  const { address: eoaAddress } = useAccount();

  let abi = EnduNFTData.abi;
  const {
    data: nftBalance,
    isError,
    isSuccess,
  } = useContractRead({
    address: props.nftAddress,
    chainId: props.opEnduChainId,
    abi: abi,
    functionName: "balanceOf",
    args: [props.aaAddress],
    watch: true,
  });

  return (
    <div className="AccountInfo">
      <div className="account-info-section">
        {/* <div className="account-info eoa-account">
          <h4>EOA Account (Connected via MetaMask)</h4>
          <div className="Account">{eoaAddress}</div>
        </div> */}

        <div className="account-info aa-account">
          {/* <h4>Abstract Account</h4> */}
          {props.aaAddress && (
            <div className="Account">
              <p className="aa-address">Address: {props.aaAddress}</p>
              <p className="aa-balance">
                {isSuccess && (
                  <div>
                    You have{" "}
                    <span className="nft"> {nftBalance.toString()}</span> NFT
                    now
                  </div>
                )}
              </p>
              <p className="aa-explorer-link">
                <a
                  href={`https://explorer-l2-op-endurance-testnet1.fusionist.io/address/${props.aaAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Explorer
                </a>
              </p>
            </div>
          )}
          {!props.aaAddress && !props.isIniting && (
            <div className="PromptMessage">
              You have no Abstract Account yet.
            </div>
          )}
          {props.isIniting && (
            <div className="ProcessingMessage">
              Initializing... Your Abstract Account is being created.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
