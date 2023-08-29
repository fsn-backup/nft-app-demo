"use client";

export function SignAAMessage(props) {
  return (
    <div className="sign-message-section">
      {!props.privKey && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const message = "Create a Abstract Account";
            props.signMessage({ message });
          }}
        >
          <button
            className="sign-button"
            disabled={props.sigIsloading}
            type="submit"
          >
            {props.sigIsloading ? "Check Wallet" : "Sign Message"}
          </button>
        </form>
      )}

      {props.privKey && (
        <div className="ConfirmationMessage">
          Success: An Abstract Account has been created with this wallet.
        </div>
      )}
    </div>
  );
}
