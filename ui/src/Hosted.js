import React from 'react';
import axios from 'axios';
import Cookies from 'universal-cookie';
import Table from 'react-bootstrap/Table';
import { Dropdown, DropdownButton } from 'react-bootstrap';
import LinkServiceModal from './LinkServiceModal';
import './Drive.css';

class Hosted extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      services: [],
      showLinkServiceDialog: false,
    }
    this.handleLinkServiceClick = this.handleLinkServiceClick.bind(this);
    this.toggleLinkServiceDialog = this.toggleLinkServiceDialog.bind(this);
    this.getServices = this.getServices.bind(this);
    this.deleteService = this.deleteService.bind(this);
  }
  componentDidMount() {
    this.getServices();
  }
  handleLinkServiceClick(event) {
    this.toggleLinkServiceDialog();
  }
  toggleLinkServiceDialog() {
    this.setState({
      showLinkServiceDialog: !this.state.showLinkServiceDialog
    });
  }
  getServices(){
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      methods: 'GET',
      url: window.location.protocol + "//api." + window.location.hostname + "/services-list/",
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({services: response.data});
      },
    );
  }
  deleteService(serviceUrl) {
    const data = new FormData();
    data.append('service_url', serviceUrl);
    const cookies = new Cookies();
    let auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: window.location.protocol + "//api." + window.location.hostname + "/delete-service/",
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.getServices();
      },
      err => {
      }
    );
  }
  render() {
    let driveMenu;
    driveMenu = 
      (
       <div className="drive-menu">
        <ul className="menu-list">
          <li className="menu-list-item">
            <button style={{marginLeft: 10, width: 150 }} type="button" className="btn btn-primary" onClick={this.handleLinkServiceClick} >
              Link
            </button>
          </li>
        </ul>
       </div>
      );
    let linkService = 
      <LinkServiceModal show={this.state.showLinkServiceDialog} toggleModal={this.toggleLinkServiceDialog} getServices={this.getServices} username={this.props.username} />;
    if(this.state.services.length === 0) {
      return(
        <div className="drive-container" style={{ marginTop:30 }} >
          {driveMenu}
          {linkService}
        </div>
      );
    }
    let rows;
    rows = this.state.services.map((service, i) => {
      let url;
      if (service.is_active) {
        url = service.url;
      } else {
        url = service.url + "?code=" + service.code;
      }
      return (
        <tr key={i}>
          <td>
            <a className="btn btn-link" href={url}>{service.name}</a>
          </td>
          <td>
            <DropdownButton variant="transparent" title="" alignRight >
              <Dropdown.Item onClick={() => this.deleteService(service.url)} >
                Delete
              </Dropdown.Item>
            </DropdownButton>
          </td>
        </tr>
      );
    });
    return (
      <div className="drive-container" style={{ marginTop: 30 }} >
        <div className="drive-table">
          <Table>
            <thead>
              <tr>
                <th>Hosted Service</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows}
            </tbody>
          </Table>
        </div>
        {driveMenu}
        {linkService}
      </div>
    );
  }
}

export default Hosted;
