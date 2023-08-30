"use client";

import React from "react";

export function Mint(props) {
  return (
    <div className="mint-section">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          props.mintNFT();
        }}
      >
        <button
          className="mint-button"
          type="submit"
          disabled={props.isMinting || !props.privKey}
        >
          Mint NFT
        </button>
      </form>
      {props.isMinting && (
        <div className="ProcessingMessage">
          Processing: Your NFT is being minted...
        </div>
      )}
      {props.opData && !props.isMinting && (
        <div className="mint-success">
          <div className="ConfirmationMessage">
            Success: Your NFT has been successfully minted!
          </div>

          <div className="mint-success-data">
            <div className="mint-success-data-title">Sender:</div>
            <div className="mint-success-data-content">
              {props.opData.sender}
            </div>
            <div className="mint-success-data-title">Paymaster</div>
            <div className="mint-success-data-content">
              {props.opData.paymaster}
            </div>
            <div className="mint-success-data-title">User Operation Hash</div>
            <div className="mint-success-data-content">
              {props.opData.userOpHash}
            </div>
            <div className="mint-success-data-title">Transaction Hash</div>
            <div className="mint-success-data-content">
              {props.opData.txHash}
              <br />
              <br />
              <a
                href={`https://explorer-l2-op-endurance-testnet1.fusionist.io/tx/${props.opData.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Etherscan
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
