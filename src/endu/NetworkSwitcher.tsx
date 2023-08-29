"use client";

import { useNetwork, useSwitchNetwork } from "wagmi";
import "../app/style.css";

export function NetworkSwitcher(props) {
  const { chain } = useNetwork();
  const { chains, error, isLoading, pendingChainId, switchNetwork } =
    useSwitchNetwork();

  return (
    <div className="NetworkSwitcher">
      {chain?.id === props.opEnduChainId ? (
        <div className="ConfirmationMessage">
          Success: You are connected to the correct network.
        </div>
      ) : (
        <>
          <div className="ErrorNotification">
            Warning: You are not connected to the designated network. Please
            switch for full functionality.
          </div>

          <div>
            Currently connected to: {chain?.name ?? chain?.id}
            {chain?.unsupported && " (unsupported)"}
          </div>
          <br />
          {switchNetwork && (
            <div>
              Switch to:{" "}
              {chains.map((x) =>
                x.id === chain?.id ? null : (
                  <button
                    className="network-button"
                    key={x.id}
                    onClick={() => switchNetwork(x.id)}
                  >
                    {x.name}
                    {isLoading && x.id === pendingChainId && " (switching)"}
                  </button>
                )
              )}
            </div>
          )}
        </>
      )}

      <div>{error?.message}</div>
    </div>
  );
}
