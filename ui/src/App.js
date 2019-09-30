import React from 'react';
import axios from 'axios';
import Cookies from 'universal-cookie';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { authenticationUrl, cdriveApiUrl, cdriveUrl } from './GlobalVariables';
import Drive from './Drive';
import Applications from './Applications';
import Hosted from './Hosted';
import './App.css';

const tabs = [
  {
    name: 'drive',
    displayName: 'Drive',
    component: Drive,
  },
  {
    name: 'applications',
    displayName: 'Applications',
    component: Applications,
  },
  {
    name: 'hosted',
    displayName: 'Hosted Services',
    component: Hosted,
  },
]

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      fullname: '',
      activeTabIndex: 0,
    };
    
    this.handleTabClick = this.handleTabClick.bind(this);
    this.handleLogoutClick = this.handleLogoutClick.bind(this);
  }
  authenticateUser() {
    const cookies = new Cookies();
    var columbus_token = cookies.get('columbus_token');
    if (columbus_token !== undefined) {
      this.fetchUserDetails();
      return(null);
    }
    var url_string = window.location.href;
    var url = new URL(url_string);
    var code = url.searchParams.get("code");
    if (code == null) {
      const request = axios({
        method: 'GET',
        url: `${cdriveApiUrl}client-id/`
      });
      request.then(
        response => {
          var client_id = response.data.client_id;
          var redirect_uri = `${cdriveUrl}`;
          const link = document.createElement('a');
          link.href = `${authenticationUrl}o/authorize/?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&state=1234xyz`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        },
      );
    } else {
      const request = axios({
        method: 'POST',
        url: `${cdriveApiUrl}authentication-token/`,
        data: {
          code: code,
          redirect_uri: `${cdriveUrl}`
        }
      });
      request.then(
        response => {
          cookies.set('columbus_token', response.data.access_token);
          this.fetchUserDetails();
        },
        err => {
        }
      );
    }
  }
  fetchUserDetails() {
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'GET',
      url: `${cdriveApiUrl}user-details/`,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({
          username: response.data.username,
          fullname: response.data.firstname + ' ' + response.data.lastname
        });
      },
      err => {
        const cookies = new Cookies();
        cookies.remove('columbus_token'); 
        this.authenticateUser();
      }
    );
  }
  handleTabClick(index) {
    this.setState({activeTabIndex: index});
  }
  handleLogoutClick(event) {
    const cookies = new Cookies();
    let auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: `${cdriveApiUrl}stop-applications/`,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        axios({
          method: 'POST',
          url: `${cdriveApiUrl}logout/`,
          headers: {'Authorization': auth_header}
        });
        cookies.remove('columbus_token');
        var logoutUrl = `${authenticationUrl}accounts/logout/`;
        window.location.href = logoutUrl;
      },
      err => {
      }
    );
  }
  render() {
    if (this.state.username === '') {
      this.authenticateUser();
      return (null);
    } else {
      let items;
      items = tabs.map((tab, i) => {
        
        if(i === this.state.activeTabIndex){
          return (<li className="active-side-bar-list-item">{tab.displayName}</li>);
        } else {
          return (<li className="side-bar-list-item" onClick={() => this.handleTabClick(i)} >{tab.displayName}</li>);
        }
        
      });

      var ComponentName = tabs[this.state.activeTabIndex].component;

      return(
        <div className="cdrive-container" >
          <div className="left-panel">
            <nav className="navbar navbar-expand navbar-light">
              <span className="navbar-brand">Columbus</span>
            </nav>
            <div className="side-bar">
              <ul className="side-bar-list">
                {items}
              </ul>
            </div>
          </div>
          <div className="right-panel">
            <nav className="navbar navbar-expand navbar-light">
              <span className="navbar-brand">{tabs[this.state.activeTabIndex].displayName}</span>
              <div className="justify-content-end navbar-collapse collapse">
                <DropdownButton id="dropdown-basic-button" variant="transparent" 
                  title={this.state.fullname} alignRight >
                  <Dropdown.Item onClick={this.handleLogoutClick}>Logout</Dropdown.Item>
                </DropdownButton>
              </div>
            </nav>
            <ComponentName username={this.state.username} />
          </div>
        </div>
      );
    }
  }
}

export default App;
