'use client';

import React from 'react';
import { useAccount, useEnsName } from 'wagmi';

export function AAAccount() {
  // EOA Account Info
  const { address: eoaAddress } = useAccount();
  const { data: ensName } = useEnsName({ address: eoaAddress });

  // Abstract Account Info
  let aaAddress = localStorage.getItem('aa_address');

  return (
    <div className="CombinedAccount">
      <div className="account-info-section">
        <h3>Wallet Information</h3>
  
        <div className="account-info eoa-account">
          <h4><i className="fas fa-user-circle"></i> EOA Account (Connected via MetaMask)</h4>
          <div className="Account">
            {ensName ?? eoaAddress}
            {ensName ? ` (${eoaAddress})` : null}
          </div>
        </div>
  
        <div className="account-info aa-account">
          <h4><i className="fas fa-robot"></i> Abstract Account</h4>
          {aaAddress ? (
            <div className="Account">
              <p>Address: {aaAddress}</p>
              <p>
                Check it on blockchain explorer:{" "}
                <a href={`https://explorer-l2-op-endurance-testnet1.fusionist.io/address/${aaAddress}`}>
                  View on Explorer
                </a>
              </p>
            </div>
          ) : (
            <div className="ErrorMessage">
              Please create an Abstract Account first.
            </div>
          )}
        </div>
      </div>
      <hr />
    </div>
  );
  
  
  
}
