import React from 'react';
import axios from 'axios';
import Cookies from 'universal-cookie';
import { Modal, Button } from 'react-bootstrap';

class InstallAppModal extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      dockerLink: "",
      isAppInstalling: false,
      installAppPollId: 0,
      showShare: false
    };
    this.onChange = this.onChange.bind(this);
    this.installApp = this.installApp.bind(this);
    this.installAppPoll = this.installAppPoll.bind(this);
    this.toggleShowShare = this.toggleShowShare.bind(this);
  }
  onChange(e) {
    this.setState({dockerLink: e.target.value});
  }
  installApp(event, dockerUrl) {
    event.preventDefault();

    this.setState({
      isAppInstalling: true
    });

    const data = new FormData();
    data.append('app_docker_link', dockerUrl);
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: window.location.protocol + "//api." + window.location.hostname + "/install-application/",
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({
          installAppPollId: setInterval(() => this.installAppPoll(response.data.appName), 3000)
        });
      }
    );
  }
  installAppPoll(appName) {
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'GET',
      url: window.location.protocol + "//api." + window.location.hostname + "/app-status/?app_name=" + appName,
      headers: {'Authorization': auth_header}
    });
    request.then(
        response => {
          if(response.data.appStatus === "Available") {
            clearInterval(this.state.installAppPollId);
            this.setState({
              isAppInstalling: false
            });
            this.props.toggleModal();
            this.props.getApplications();
          }
        },
        err => {
        }
    );
  }
  toggleShowShare() {
    this.setState({ showShare : !this.state.showShare});
  }
  render() {
    let installButton;
    if (this.state.isAppInstalling) {
      installButton = 
        <Button variant="primary" disabled>
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        </Button>
    } else {
      installButton = 
        <Button variant="primary" onClick={e => this.installApp(e, this.state.dockerLink)}> 
          Install
        </Button>
    }
    return(
      <Modal show={this.props.show} onHide={this.props.toggleModal}>
        <Modal.Header closeButton>
          <Modal.Title>Install Application</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ marginTop: '10px' }} className="form-group">
            <input type="text"  className="form-control" name="docker-link" value={this.state.dockerLink} 
              placeholder="Application Image Url" required onChange={this.onChange}/>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-default mr-auto columbus-text" style={{ textDecoration: 'none' }}>Permissions</button>
          <Button variant="secondary" onClick={this.props.toggleModal}>
            Close
          </Button>
          {installButton}
        </Modal.Footer>
      </Modal>
    );
  }
}

export default InstallAppModal;
