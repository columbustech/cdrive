import React from 'react';
import axios from 'axios';
import Cookies from 'universal-cookie';
import Table from 'react-bootstrap/Table';
import { Button, Dropdown, DropdownButton } from 'react-bootstrap';
import { cdriveApiUrl, applicationsUrl } from './GlobalVariables';
import InstallAppModal from './InstallAppModal';
import './Drive.css';
import './Applications.css';

class AppItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpening: false,
      openAppPollId: 0,
    }
    this.openApp = this.openApp.bind(this);
    this.openAppPoll = this.openAppPoll.bind(this);
  }
  openApp(event) {
    event.preventDefault();
    this.setState({
      isOpening:true,
    });

    const data = new FormData();
    data.append('app_name', this.props.appName);
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: `${cdriveApiUrl}start-application/`,
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({
          openAppPollId: setInterval(() => this.openAppPoll(), 1000)
        });
      }
    );
  }
  openAppPoll() {
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'GET',
      url: `${cdriveApiUrl}app-status/?app_name=${this.props.appName}/`,
      headers: {'Authorization': auth_header}
    });
    request.then(
        response => {
          if (response.data.appStatus === "Running") {
            clearInterval(this.state.openAppPollId);
            this.setState({
              isOpening: false
            });
            window.location.href = `${applicationsUrl}${this.props.username}/${this.props.appName}/`
          }
        },
        err => {
        }
    );

  }
  render() {
    let appItem;
    if (this.state.isOpening) {
      appItem =
        <div>
          <Button variant="link" onClick={this.openApp} >{this.props.appName}</Button>
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="sr-only"></span>
          </div>
        </div>
    } else {
      appItem = 
        <div>
          <Button variant="link" onClick={this.openApp} >{this.props.appName}</Button>
        </div>
    }
    return appItem;
 }
}

class Applications extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      applications: [],
      showInstallAppDialog: false,
    }
    this.handleInstallAppClick = this.handleInstallAppClick.bind(this);
    this.toggleInstallAppDialog = this.toggleInstallAppDialog.bind(this);
    this.getApplications = this.getApplications.bind(this);
    this.deleteApp = this.deleteApp.bind(this);
  }
  componentDidMount() {
    this.getApplications();
  }
  handleInstallAppClick(event) {
    this.toggleInstallAppDialog();
  }
  toggleInstallAppDialog() {
    this.setState({ showInstallAppDialog: !this.state.showInstallAppDialog });
  }
  getApplications(){
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'GET',
      url: `${cdriveApiUrl}applications-list/`,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({applications: response.data});
      },
    );
  }
  deleteApp(appName) {
    const data = new FormData();
    data.append('app_name', appName);
    const cookies = new Cookies();
    let auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: `${cdriveApiUrl}delete-application/`,
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.getApplications();
      },
      err => {
      }
    );
  }
  render() {
    let driveMenu;
    driveMenu = 
      (
        <div className="drive-menu" >
          <ul className="menu-list">
            <li className="menu-list-item">
              <button style={{marginLeft: 10, width: 150}} type="button" className="btn btn-primary" onClick={this.handleInstallAppClick} >
                Install
              </button>
            </li>
          </ul>
        </div>
      );
    let installApp = 
      <InstallAppModal show={this.state.showInstallAppDialog} toggleModal={this.toggleInstallAppDialog} getApplications={this.getApplications} username={this.props.username} />;
    if(this.state.applications.length === 0) {
      return(
        <div className="drive-container app-container" >
          {driveMenu}
          {installApp}
        </div>
      );
    }
    let rows
    rows = this.state.applications.map((app, i) => (
      <tr key={i}>
        <td><AppItem appName={app.name} appUrl={app.url} username={this.props.username}/></td>
        <td>
          <DropdownButton variant="transparent" 
            title="" alignRight >
            <Dropdown.Item onClick={() => this.deleteApp(app.name)}>
              Delete
            </Dropdown.Item>
          </DropdownButton>
        </td>
      </tr>
    ));
    return(
      <div className="drive-container app-container" >
        <div className="drive-table">
          <Table>
            <thead>
              <tr>
                <th>Application</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows}
            </tbody>
          </Table>
        </div>
        {driveMenu}
        {installApp}
      </div>
    );
  }
}

export default Applications;
