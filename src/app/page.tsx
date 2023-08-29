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
import { Client, Presets } from "userop";
import EnduNFTData from "../endu/artifacts/EnduNFT.json";

export default function Page() {
  const bundlerUrl = "https://test-bundler-gamewallet.fusionist.io/1337";
  const entryPoint = "0xba0917DF35Cf6c7aE1CABf5e7bED9a904F725318";
  const accountFactory = "0x6218d8C39208C408d096Ac5F3BaC3472e6381526";
  const paymaster = "0x1a256A0221b030A8A50Cb18966Ebdc4325a92D7F";
  const nftAddress = "0xf578642ff303398103930832B779cD35891eBa35";
  const opEnduChainId = 6480001000;

  const { storage } = useConfig();
  const [privKey, setPrivkey] = useState("");
  const [aaAddress, setAAAddress] = useState("");
  const [isIniting, setIsIniting] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [opData, setOpData] = useState(null);

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
    storage.setItem("aa_privkey", "");
    storage.setItem("aa_address", "");
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
        const provider = new ethers.providers.JsonRpcProvider(bundlerUrl);
        const wallet = new ethers.Wallet(privKey, provider);
        let simpleAccount = await Presets.Builder.SimpleAccount.init(
          wallet,
          bundlerUrl,
          {
            entryPoint: entryPoint,
            factory: accountFactory,
            salt: "0",
          }
        );
        const address = simpleAccount.getSender();
        setAAAddress(address);
        storage.setItem("aa_address", address);
        resolve(simpleAccount);
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
        const simpleAccount = await initAAAccount(
          privKey,
          bundlerUrl,
          entryPoint,
          accountFactory,
          setAAAddress,
          storage,
          false
        );

        const client = await Client.init(bundlerUrl, {
          entryPoint: entryPoint,
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

        let builder = simpleAccount
          .execute(call.to, call.value, call.data)
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

            <section className="mint-section">
              <h2>Mint a NFT</h2>
              <div className="mint-content">
                <Mint
                  mintNFT={mintNFT}
                  isMinting={isMinting}
                  opData={opData}
                  privKey={privKey}
                />
              </div>
            </section>
          </Connected>
        </main>
      </div>
    </div>
  );
}
