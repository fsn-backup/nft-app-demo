import { Account } from '../components/Account'
import { AAAccount } from '../components/AAAccount'
import { Connect } from '../components/Connect'
import { Connected } from '../components/Connected'
import { NetworkSwitcher } from '../components/NetworkSwitcher'
import { SignAAMessage } from '../components/SignAAMessage'
import { Mint } from '../components/Mint'
import './style.css';

export default function Page() {
  return (
    <div className="main-wrapper">
      <section className="wallet-section">
        <h1>Connect Your Wallet</h1>
        <Connect />
      </section>
  
      <Connected>
        <section className="account-info">
          <h2>Account Information</h2>
          <AAAccount />
        </section>
    
        <section className="message-sign">
          <h2>Sign a message</h2>
          <SignAAMessage />
        </section>
    
        <section className="mint-section">
        <h2 className="mint-title">Mint a NFT</h2>  {/* 应用 mint-title 类 */}
        <div className="mint-content">  {/* 应用 mint-content 类 */}
          <Mint />
        </div>
      </section>
      
      </Connected>
    </div>
  );
}
