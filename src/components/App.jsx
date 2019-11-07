import React, {Component} from 'react';

import Main from './Main.jsx';
import Signin from './Signin.jsx';
import Arweave from 'arweave/web';

const arweave = Arweave.init();

export default class App extends Component {

  constructor(props) {
    super(props);
    let key = localStorage.getItem('key' ) || '';
    if(key !== ''){
      key = JSON.parse(key);
    }
    let address = localStorage.getItem( 'address' ) || '';
    this.state = {
      key: key,
      address: address
    }
  }

  handleSignIn(key) {
      arweave.wallets.jwkToAddress(key).then((address) => {
        localStorage.setItem('key', JSON.stringify(key));
        localStorage.setItem('address', address);
        this.setState({address: address, key: key})
      });
  }

  handleSignOut() {
    localStorage.removeItem('key' );
    localStorage.removeItem('address' );
    localStorage.removeItem('bookmarks' );
    localStorage.removeItem('tags' );
    this.setState({key: '', address: ''})
  }


  render() {
    return (
      <div className="site-wrapper">
        {this.state.address === '' ?
          <Signin handleSignIn={this.handleSignIn.bind(this)}/>
          : <Main handleSignOut={this.handleSignOut.bind(this)} keys={this.state.key} address={this.state.address}/>
        }
      </div>
    );
  }

}
