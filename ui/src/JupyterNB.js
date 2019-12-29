import React from 'react';
import Cookies from 'universal-cookie';

class JupyterNB extends React.Component {
  constructor(props) {
    super(props);
    this.copyToken = this.copyToken.bind(this);
    this.tokenDivRef = React.createRef();
  }
  copyToken() {
    this.tokenDivRef.current.select();
    document.execCommand('copy');
  }
  render() {
    let token;
    const cookies = new Cookies();
    token = cookies.get('columbus_token');
    return (
      <div className="jnb-container">
        <input type="text" readOnly ref={this.tokenDivRef} value={token}></input>
        <button className="btn btn-secondary" onClick={this.copyToken} >Copy to Clipboard</button>
        <a className="btn btn-primary" 
          href="https://notebook.columbusecosystem.com/?token=c5eb8d123e538e0ae1cd773ce3680dd539abd36ba79897b8">
          Open Jupyter Notebook
        </a>
      </div>
    );
  }
}

export default JupyterNB;
