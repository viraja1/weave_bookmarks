import React, {Component} from 'react';
import Dropzone from 'react-dropzone';

export default class Signin extends Component {
  constructor(props) {
    super(props);
  }

  handleUpload(files) {
    let handleSignIn = this.props.handleSignIn.bind(this);
    files.forEach((file) => {
      let fileReader = new FileReader();
      fileReader.onload = function () {
        let key = JSON.parse(fileReader.result);
        handleSignIn(key);
      };
      fileReader.readAsText(file);
    });
  };

  render() {
    return (
      <div className="panel-landing  h-100 d-flex" id="section-1">
        <div className="jumbotron" style={{margin: "auto", textAlign: "center", padding: "5%"}}>
          <div>
            <p className="h1">Weave Bookmarks</p>
          </div>
          <div>
            <br/>
            <p>Secure Bookmark Manager for permaweb</p>
          </div>
          <br/>
          <div id="login-container">
            <Dropzone onDropAccepted={this.handleUpload.bind(this)}>
              {({getRootProps, getInputProps}) => (
                <div className="upload" {...getRootProps()}>
                  <input {...getInputProps()} />
                  <p>Select or drag arweave wallet keyfile to login</p>
                </div>
              )}
            </Dropzone>
          </div>
        </div>
      </div>
    )
  }
}
