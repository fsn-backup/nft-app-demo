"use client";

import { BaseError } from "viem";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function Connect(props) {
  const { connector, isConnected } = useAccount();
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect();
  const { disconnect } = useDisconnect();

  function disconnectWithClear() {
    props.clearSig();
    disconnect();
  }

  return (
    <div>
      <div className="button-group">
        {isConnected && (
          <button
            className="disconnect-button"
            onClick={() => disconnectWithClear()}
          >
            Disconnect from {connector?.name}
          </button>
        )}

        {connectors
          .filter((x) => x.ready && x.id !== connector?.id)
          .map((x) => (
            <button
              className="connect-button"
              key={x.id}
              onClick={() => connect({ connector: x })}
            >
              {x.name}
              {isLoading && x.id === pendingConnector?.id && " (connecting)"}
            </button>
          ))}
      </div>

      {error && (
        <div className="ErrorNotification">
          Error: {(error as BaseError).shortMessage}. Please try again.
        </div>
      )}
    </div>
  );
}
