"use client";

import { useNetwork, useSwitchNetwork } from "wagmi";
import "../app/style.css";

export function NetworkSwitcher(props) {
  const { chain } = useNetwork();
  const { chains, error, isLoading, pendingChainId, switchNetwork } =
    useSwitchNetwork();

  return (
    <div className="NetworkSwitcher">
      {chain?.id === props.opEnduChainId && (
        <div className="ConfirmationMessage">
          Success: You are connected to the correct network.
        </div>
      )}

      {chain?.id != props.opEnduChainId && (
        <div className="ErrorNotification">
          Warning: You are not connected to the designated network. Please
          switch for full functionality.
        </div>
      )}
      {
        <>
          {switchNetwork && (
            <div>
              Currently:{" "}
              <span className="cname">{chain?.name ?? chain?.id}</span>
              {chain?.unsupported && " (unsupported)"}
              &nbsp; &nbsp; Switch to:{" "}
              {chains.map((x) =>
                x.id === chain?.id ? null : (
                  <button
                    className="network-button"
                    key={x.id}
                    onClick={() => switchNetwork(x.id)}
                    disabled={chain?.id == props.opEnduChainId}
                  >
                    {x.name}
                    {isLoading && x.id === pendingChainId && " (switching)"}
                  </button>
                )
              )}
            </div>
          )}
          <br />
          {/* <div>
            Currently connected to: {chain?.name ?? chain?.id}
            {chain?.unsupported && " (unsupported)"}
          </div> */}
        </>
      }

      <div>{error?.message}</div>
    </div>
  );
}
