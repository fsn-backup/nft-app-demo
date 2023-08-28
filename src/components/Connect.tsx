'use client'

import { BaseError } from 'viem'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function Connect() {
  const { connector, isConnected } = useAccount()
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect()
  const { disconnect } = useDisconnect()

  return (
    <div>
      <div className="button-group">
        {isConnected && (
          <button className="disconnect-button" onClick={() => disconnect()}>
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
              {isLoading && x.id === pendingConnector?.id && ' (connecting)'}
            </button>
          ))}
      </div>
  
      {error && <div className="ErrorMessage">{(error as BaseError).shortMessage}</div>}
    </div>
  );
}
