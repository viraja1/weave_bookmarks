import React, {Component} from 'react';

import {Route, HashRouter} from 'react-router-dom';
import SideNav, {NavItem, NavIcon, NavText} from '@trendmicro/react-sidenav';
import '@trendmicro/react-sidenav/dist/react-sidenav.css';
import {FaHome, FaPlusCircle} from 'react-icons/fa';
import {Navbar} from 'react-bootstrap';

import AddBookmark from './AddBookmark.jsx';
import ListBookmarks from './ListBookmarks.jsx';
import Arweave from 'arweave/web';

const arweave = Arweave.init();
let appName = 'weave-bookmarks';
let appVersion = '0.0.1';

export default class Main extends Component {

  constructor(props) {
    super(props);
    this.state = {
      newBookmark: {
        title: '',
        description: '',
        url: '',
        tags: []
      },
      bookmarks: [],
      tags: [],
      isLoading: false,
      expanded: false,
      error: '',
      inProgress: false
    };
  }

  async encrypt_data(data, pub_key) {
    let content_encoder = new TextEncoder();
    let newFormat = JSON.stringify(data);
    let content_buf = content_encoder.encode(newFormat);
    let key_buf = await this.generate_random_bytes(256);

    // Encrypt data segments
    let encrypted_data = await arweave.crypto.encrypt(content_buf, key_buf);
    let encrypted_key = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      pub_key,
      key_buf
    );

    // Concatenate and return them
    return arweave.utils.concatBuffers([encrypted_key, encrypted_data])
  }

  async decrypt_data(enc_data, key) {
    let enc_key = new Uint8Array(enc_data.slice(0, 512));
    let enc_contents = new Uint8Array(enc_data.slice(512));
    let symmetric_key = await window.crypto.subtle.decrypt({name: 'RSA-OAEP'}, key, enc_key);
    return arweave.crypto.decrypt(enc_contents, symmetric_key);
  }

  async wallet_to_key(wallet) {
    let w = Object.create(wallet);
    w.alg = 'RSA-OAEP-256';
    w.ext = true;
    let algo = {name: 'RSA-OAEP', hash: {name: 'SHA-256'}};
    return await crypto.subtle.importKey('jwk', w, algo, false, ['decrypt'])
  }

  async get_public_key(key) {
    let keyData = {
      kty: 'RSA',
      e: 'AQAB',
      n: key.n,
      alg: 'RSA-OAEP-256',
      ext: true
    };
    let algo = {name: 'RSA-OAEP', hash: {name: 'SHA-256'}};
    return await crypto.subtle.importKey('jwk', keyData, algo, false, ['encrypt'])
  }

  async generate_random_bytes(length) {
    let array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return array
  }

  updateBookmark(key, value) {
    const bookmark = this.state.newBookmark;
    if (key === "tags") {
      value = [value];
    }
    bookmark[key] = value;
    this.setState({
      newBookmark: bookmark
    })
  }

  async deleteBookmark(event, id) {
    const {keys} = this.props;
    const updatedBookmarks = this.state.bookmarks.filter(bookmark => {
      return bookmark.id !== id;
    });
    let tags = updatedBookmarks.map(b => b.tags[0]);
    tags = Array.from(new Set(tags));
    this.setState({
      bookmarks: updatedBookmarks,
      tags: tags
    });
    let pub_key = await this.get_public_key(keys);
    let content = await this.encrypt_data({id: id, isDeleted: true}, pub_key);
    let tx = await arweave.createTransaction(
      {
        data: arweave.utils.concatBuffers([content])
      },
      keys
    );
    let tagUnixTime = Math.round((new Date()).getTime() / 1000);
    tx.addTag('App-Name', appName);
    tx.addTag('App-Version', appVersion);
    tx.addTag('Unix-Time', tagUnixTime);
    let anchor_id = await arweave.api.get('/tx_anchor').then(x => x.data);
    tx.last_tx = anchor_id;
    await arweave.transactions.sign(tx, keys);
    arweave.transactions.post(tx)
      .then(() => {
        localStorage.setItem('bookmarks', JSON.stringify(updatedBookmarks));
        localStorage.setItem('tags', JSON.stringify(tags));
      });

  }

  async handleNewBookmarkSubmit(event, history) {
    let newBookmark = this.state.newBookmark;
    let url_regex = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,24}(:[0-9]{1,5})?(\/.*)?$/g;
    if (typeof newBookmark.title === "undefined" || newBookmark.title.trim() === "") {
      this.setState({error: "Valid title is required"});
      return;
    }
    if (typeof newBookmark.description === "undefined" || newBookmark.description.trim() === "") {
      newBookmark.description = '';
    }
    if (typeof newBookmark.url === "undefined" || newBookmark.url.trim() === "" || !newBookmark.url.match(url_regex)) {
      this.setState({error: "Valid url is required"});
      return;
    }
    if (typeof newBookmark.tags[0] === "undefined" || newBookmark.tags[0].trim() === "") {
      newBookmark.tags = [];
    }
    if (newBookmark.tags.length > 0 && newBookmark.tags[0].trim().length > 100) {
      this.setState({error: "Tag length should not exceed more than 100 characters"});
      return;
    }
    this.setState({error: '', inProgress: true});
    await this.saveNewBookmark(newBookmark);
    this.setState({
      newBookmark: {
        title: '',
        description: '',
        url: '',
        tags: []
      },
      inProgress: false
    });
    history.push('/home');
  }

  async saveNewBookmark(newBookmark) {
    const {keys} = this.props;
    let bookmarks = this.state.bookmarks;
    let tags = this.state.tags;

    newBookmark.id = Math.round(new Date().getTime() / 1000);
    newBookmark.created_at = Date.now();

    bookmarks.unshift(newBookmark);
    if (!tags.includes(newBookmark.tags[0])) {
      tags.push(newBookmark.tags[0]);
    }
    let pub_key = await this.get_public_key(keys);
    let content = await this.encrypt_data(newBookmark, pub_key);
    let tx = await arweave.createTransaction(
      {
        data: arweave.utils.concatBuffers([content])
      },
      keys
    );
    let tagUnixTime = Math.round((new Date()).getTime() / 1000);
    tx.addTag('App-Name', appName);
    tx.addTag('App-Version', appVersion);
    tx.addTag('Unix-Time', tagUnixTime);
    let anchor_id = await arweave.api.get('/tx_anchor').then(x => x.data);
    tx.last_tx = anchor_id;
    await arweave.transactions.sign(tx, keys);
    arweave.transactions.post(tx)
      .then(() => {
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        localStorage.setItem('tags', JSON.stringify(tags));
        this.setState({
          bookmarks: bookmarks,
          tags: tags
        })
      });
  }

  async fetchData() {
    this.setState({isLoading: true});
    let savedBookmarks = localStorage.getItem('bookmarks') || '';
    let savedTags = localStorage.getItem('tags') || '';
    if (savedBookmarks !== '' && savedTags !== '') {
      savedBookmarks = JSON.parse(savedBookmarks);
      savedTags = JSON.parse(savedTags);
      this.setState({
        bookmarks: savedBookmarks,
        tags: savedTags,
        isLoading: false
      });
      return
    }
    const txids = await arweave.arql({
      op: "and",
      expr1: {
        op: "equals",
        expr1: "from",
        expr2: this.props.address
      },
      expr2: {
        op: "equals",
        expr1: "App-Name",
        expr2: appName
      }
    });
    let key = await this.wallet_to_key(this.props.keys);
    let decrypt_data = this.decrypt_data;
    let bookmarks = await Promise.all(txids.map(async function (id, i) {
      let tx = await arweave.transactions.get(id);
      return JSON.parse(arweave.utils.bufferToString(
        await decrypt_data(arweave.utils.b64UrlToBuffer(tx.data), key)))
    }));
    //console.log(bookmarks);
    const deletedBookmarks = bookmarks.filter(bookmark => {
      return bookmark.isDeleted === true
    });
    const deletedBookmarkIds = deletedBookmarks.map(b => b.id);
    bookmarks = bookmarks.filter(bookmark => {
      return deletedBookmarkIds.indexOf(bookmark.id) === -1
    });
    let tags = bookmarks.map(b => b.tags[0]);
    tags = Array.from(new Set(tags));
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('tags', JSON.stringify(tags));
    this.setState({
      bookmarks: bookmarks,
      tags: tags,
      isLoading: false
    })
  }

  onToggle(expanded) {
    this.setState({expanded: expanded});
  }

  truncate(s, max) {
    if (s.length > max) {
      s = s.slice(0, max) + "...";
    }
    return s;
  }

  render() {
    const {handleSignOut, address} = this.props;
    const {expanded, bookmarks, tags, isLoading, error, inProgress} = this.state;
    return (
      address !== '' ?
        <HashRouter>
          <Route render={({location, history}) => (
            <React.Fragment>
              <div className="site-sub-wrapper">
                <SideNav className="side-nav"
                         onSelect={(selected) => {
                           const to = '/' + selected;
                           if (location.pathname !== to) {
                             history.push(to);
                           }
                         }}
                         onToggle={this.onToggle.bind(this)}
                >
                  <SideNav.Toggle/>
                  <SideNav.Nav selected={location.pathname.replace('/', '')} className="side-nav-sub">
                    <NavItem eventKey="home">
                      <NavIcon>
                        <FaHome/>
                      </NavIcon>
                      <NavText>
                        Home
                      </NavText>
                    </NavItem>
                    <NavItem eventKey="add_bookmark">
                      <NavIcon>
                        <FaPlusCircle/>
                      </NavIcon>
                      <NavText>
                        New Bookmark
                      </NavText>
                    </NavItem>
                    {tags.filter(tag => typeof tag !== "undefined" && tag.trim() !== "").map((tag) => (
                        <NavItem eventKey={tag} key={'nav_' + tag}>
                          <NavIcon>

                          </NavIcon>
                          <NavText>
                            {this.truncate(tag, 20)}
                          </NavText>
                        </NavItem>

                      )
                    )}
                  </SideNav.Nav>
                </SideNav>
                <Navbar bg="nav" variant="dark" style={{
                  marginLeft: expanded ? 240 : 64
                }}>
                  <Navbar.Brand style={{marginLeft: '20px'}}>Weave Bookmarks</Navbar.Brand>
                  <div className="collapse navbar-collapse justify-content-end" id="navbarCollapse">
                    <ul className="navbar-nav">
                      <li className="nav-item">
                        <div>
                          <button className="btn btn-light btn-sm"
                                  onClick={e => handleSignOut(e)}>Sign Out
                          </button>
                        </div>
                      </li>
                    </ul>
                  </div>
                </Navbar>
                <main style={{
                  marginLeft: expanded ? 240 : 64,
                  padding: '10px 20px 0 20px'
                }}>
                  <Route path="/home" exact render={props => <ListBookmarks
                    bookmarks={bookmarks} isLoading={isLoading} tag="all"
                    deleteBookmark={this.deleteBookmark.bind(this)}/>}/>
                  <Route path="/" exact render={props => <ListBookmarks
                    bookmarks={bookmarks} isLoading={isLoading} tag="all"
                    deleteBookmark={this.deleteBookmark.bind(this)}/>}/>
                  <Route path="/add_bookmark" render={props => <AddBookmark
                    updateBookmark={this.updateBookmark.bind(this)}
                    inProgress={inProgress}
                    handleNewBookmarkSubmit={this.handleNewBookmarkSubmit.bind(this)}
                    newBookmark={this.state.newBookmark} history={history} error={error}/>}/>

                  {tags.filter(tag => typeof tag !== "undefined" && tag.trim() !== "").map((tag) => (
                      <Route path={"/" + tag} render={props => <ListBookmarks
                        bookmarks={bookmarks} isLoading={isLoading} tag={tag}
                        deleteBookmark={this.deleteBookmark.bind(this)}/>} key={'route' + tag}/>

                    )
                  )}
                </main>
              </div>
            </React.Fragment>
          )}
          />
        </HashRouter>

        : null
    );
  }

  componentDidMount() {
    this.fetchData()
  }

  componentDidUpdate(prevProps, prevState) {
    //console.log(prevState, this.state);
  }

}
