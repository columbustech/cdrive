import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FaFile, FaFolder } from 'react-icons/fa';
import axios from 'axios';
import Cookies from 'universal-cookie';
import Select from 'react-select';

class ShareModal extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      name: "",
      targetType: "application",
      permission: "V",
      applications: [],
      users: [],
      services: []
    };
    this.onNameChange = this.onNameChange.bind(this);
    this.onTargetTypeChange = this.onTargetTypeChange.bind(this);
    this.onPermissionChange = this.onPermissionChange.bind(this);
    this.shareHandler = this.shareHandler.bind(this);
    this.getApplications = this.getApplications.bind(this);
    this.getUsers = this.getUsers.bind(this);
    this.getServices = this.getServices.bind(this);
  }
  componentDidMount() {
    this.getApplications();
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
  getUsers(){
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'GET',
      url: window.location.protocol + "//api." + window.location.hostname + "/users-list/",
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        const req = axios({
          method: 'GET',
          url: window.location.protocol + "//api." + window.location.hostname + "/user-details/",
          headers: {'Authorization': auth_header}
        });
        req.then(
          resp => {
            this.setState({users: response.data.filter(user => user.username !== resp.data.username)});
          },
        );
      },
    );
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
  onNameChange(e) {
    this.setState({name: e.target.value});
  }
  onTargetTypeChange(e) {
    if (e.target.value === "application") {
      this.getApplications();
    } else if (e.target.value === "user") {
      this.getUsers();
    } else if (e.target.value === "service") {
      this.getServices();
    }
    this.setState({targetType: e.target.value});
  }
  onPermissionChange(e) {
    this.setState({permission: e.target.value});
  }
  shareHandler(e) {
    e.preventDefault();
    const data = new FormData();
    data.append('path', this.props.path + '/' + this.props.shareObject.name);
    data.append('name', this.state.name);
    data.append('targetType', this.state.targetType);
    data.append('permission', this.state.permission);
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: window.location.protocol + "//api." + window.location.hostname + "/share/",
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.props.toggleModal();
      },
    );
  }
  render() {
    let objDisplay;
    var targetTypeOptions = [];
    var permissionOptions = [];
    var permission;
    var target;
    var label;
    if (this.props.shareObject) {
      if (this.props.shareObject.type === "Folder") {
        objDisplay = <FaFolder style={{marginRight: 6 }} size={25} color="#92cefe" /> ;
      } else {
        objDisplay = <FaFile style={{marginRight: 6 }} size={25} color="#9c9c9c" />;
      }
      if (this.state.targetType === "application") {
        var options = this.state.applications.map((app, j) => (
          {
            label: app.name,
            value: app.name
          }
        ));
        target = (
          <div className="form-group">
            <Select id="obj-name" options={options} value={this.state.name} placeholder="Search apps" onChange={this.onNameChange} /> 
          </div>
        );
        targetTypeOptions.push(
          <option value="application" selected>Application</option>
        );
      } else {
        targetTypeOptions.push(
          <option value="application">Application</option>
        );
      }
      if (this.state.targetType === "service") {
        var options = this.state.services.map((service, j) => (
          {
            label: service.name,
            value: service.name
          }
        ));
        target = 
          <div className="form-group">
            <Select id="obj-name" options={options} value={this.state.name} placeholder="Search hosted services" onChange={this.onNameChange} /> 
          </div>
        targetTypeOptions.push(
          <option value="service" selected>Hosted Service</option>
        );
      } else {
        targetTypeOptions.push(
          <option value="service">Hosted Service</option>
        );
      }
      if (this.props.shareObject.owner === this.props.username) {
        if (this.state.targetType === "user") {
          var options = this.state.users.map((user, j) => (
            {
              label: user.firstname + " " + user.lastname + " (" + user.username + ")",
              value: user.username
            }
          ));
          target = (
            <div className="form-group">
              <Select id="obj-name" options={options} value={this.state.name} placeholder="Search by name or username" onChange={this.onNameChange} /> 
            </div>
          );
          targetTypeOptions.push(
            <option value="user" selected>User</option>
          );
        } else {
          targetTypeOptions.push(
            <option value="user">User</option>
          );
        }
        if (this.state.targetType === "public") {
          targetTypeOptions.push(
            <option value="public" selected>Public</option>
          );
        } else {
          targetTypeOptions.push(
            <option value="public">Public</option>
          );
        }
      }
      if (this.state.permission === "V") {
        permissionOptions.push(
          <option value="V" selected>View</option>
        );
      } else {
        permissionOptions.push(
          <option value="V">View</option>
        );
      }
      if (this.props.shareObject.permission === "Edit") {
        if (this.state.permission === "E") {
          permissionOptions.push(
            <option value="E" selected>Edit</option>
          );
        } else {
          permissionOptions.push(
            <option value="E">Edit</option>
          );
        }
      }
      if (this.state.targetType !== "public") {
        permission = (
          <div className="form-group">
            <label htmlFor="permission-type">Permission:</label>
            <select className="form-control" id="permission-type" onChange={this.onPermissionChange}>
              {permissionOptions}
            </select>
          </div>
        );
      }
    }
    return(
      <Modal show={this.props.show} onHide={this.props.toggleModal}>
        <Modal.Header closeButton>
          <Modal.Title>Share</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{paddingBottom: '10px'}}>
            {objDisplay}
            {!this.props.shareObject ? "" : this.props.shareObject.name}
          </div>
          <div className="form-group">
            <label htmlFor="share-target-type">Share target:</label>
            <select className="form-control" id="share-target-type" onChange={this.onTargetTypeChange} >
              {targetTypeOptions}
            </select>
          </div>
          {target}
          {permission}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.props.toggleModal}>
            Close
          </Button>
          <Button variant="primary" onClick={e => this.shareHandler(e)}>
            Share
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default ShareModal;
