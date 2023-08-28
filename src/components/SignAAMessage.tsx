'use client'

import { useEffect, useState } from 'react'
import { useSignMessage } from 'wagmi'

export function SignAAMessage() {
  const {
    data: signature,
    variables,
    isLoading,
    signMessage,
  } = useSignMessage()

  const [signValue, seSignValue] = useState(false);

  useEffect(() => {
    let address = localStorage.getItem('aa_address');
    if (address != null) {
      seSignValue(true);
    }
  }, []);

  useEffect(() => {
    ;(async () => {
      if (variables?.message && signature) {
        const privateKeyHex = signature.slice(0, 66);
        localStorage.setItem('aa_privkey', privateKeyHex);
        seSignValue(true)
      }
    })()
  }, [signature, variables?.message])

  return (
    <div className="sign-message-section">
      {!signValue &&
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const message = "Create a Abstract Account"
            signMessage({ message })
          }}
        >
          <button className="sign-button" disabled={isLoading} type="submit">
            {isLoading ? 'Check Wallet' : 'Sign Message'}
          </button>
        </form>
      }

      {signValue && (
        <div className="already-signed-message">
          You have already created an Abstract Account.
        </div>
      )}
    </div>
  )
}
