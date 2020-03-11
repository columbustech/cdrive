import React from 'react';
import axios from 'axios';
import Cookies from 'universal-cookie';
import Table from 'react-bootstrap/Table';
import { Button, Dropdown, DropdownButton } from 'react-bootstrap';
import InstallAppModal from './InstallAppModal';
import './Drive.css';
import './Applications.css';

class AppItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isProcessing: false,
      processingPollId: 0,
    }
    this.openApp = this.openApp.bind(this);
    this.appStatusPoll = this.appStatusPoll.bind(this);
    this.deleteApp = this.deleteApp.bind(this);
  }
  openApp(e) {
    e.preventDefault();
    this.setState({
      isProcessing:true
    });

    const data = new FormData();
    data.append('app_name', this.props.appName);
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: window.location.protocol + "//api." + window.location.hostname + "/start-application/",
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({
          processingPollId: setInterval(() => this.appStatusPoll("open"), 1000)
        });
      }
    );
  }
  deleteApp() {
    this.setState({
      isProcessing:true
    });
    const data = new FormData();
    data.append('app_name', this.props.appName);
    const cookies = new Cookies();
    let auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: window.location.protocol + "//api." + window.location.hostname + "/delete-application/",
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({
          processingPollId: setInterval(() => this.appStatusPoll("delete"), 1000)
        });
      },
      err => {
      }
    );
  }
  appStatusPoll(action) {
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'GET',
      url: window.location.protocol + "//api." + window.location.hostname + "/app-status/?app_name=" + this.props.appName,
      headers: {'Authorization': auth_header}
    });
    request.then(
        response => {
          if (action === "open" && response.data.appStatus === "Available") {
            clearInterval(this.state.processingPollId);
            this.setState({
              isProcessing: false
            });
            window.location.href = window.location.protocol + "//" + window.location.hostname + "/app/" + this.props.username + "/" + this.props.appName + "/";
          } else if(action === "delete" && response.data.appStatus === "Missing") {
            clearInterval(this.state.processingPollId);
            this.setState({
              isProcessing: false
            });
            this.props.refreshApps();
          }
        },
        err => {
        }
    );

  }
  render() {
    let appItem;
    if (this.state.isProcessing) {
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
    return(
      <tr key={this.props.key} >
        <td>
          {appItem}
        </td>
        <td>
          <DropdownButton variant="transparent" 
            title="" alignRight >
            <Dropdown.Item onClick={() => this.deleteApp()}>
              Delete
            </Dropdown.Item>
          </DropdownButton>
        </td>
      </tr>
    );
 }
}

class Applications extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      applications: [],
      showInstallAppDialog: false,
    };
    this.handleInstallAppClick = this.handleInstallAppClick.bind(this);
    this.toggleInstallAppDialog = this.toggleInstallAppDialog.bind(this);
    this.getApplications = this.getApplications.bind(this);
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
      url: window.location.protocol + "//api." + window.location.hostname + "/applications-list/",
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({applications: response.data});
      },
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
      <AppItem appName={app.name} appUrl={app.url} username={this.props.username} key={i} refreshApps={this.getApplications} />
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
