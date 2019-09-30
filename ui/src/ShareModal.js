import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FaFile, FaFolder } from 'react-icons/fa';
import axios from 'axios';
import Cookies from 'universal-cookie';
import { cdriveApiUrl } from './GlobalVariables';

class ShareModal extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      name: "",
      targetType: "application",
      permission: "V"
    };
    this.onNameChange = this.onNameChange.bind(this);
    this.onTargetTypeChange = this.onTargetTypeChange.bind(this);
    this.onPermissionChange = this.onPermissionChange.bind(this);
    this.shareHandler = this.shareHandler.bind(this);
  }
  onNameChange(e) {
    this.setState({name: e.target.value});
  }
  onTargetTypeChange(e) {
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
      url: `${cdriveApiUrl}share/`,
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
    if (this.props.shareObject) {
      if (this.props.shareObject.type === "Folder") {
        objDisplay = <FaFolder style={{marginRight: 6 }} size={25} color="#92cefe" /> ;
      } else {
        objDisplay = <FaFile style={{marginRight: 6 }} size={25} color="#9c9c9c" />;
      }
      if (this.state.targetType === "application") {
        targetTypeOptions.push(
          <option value="application" selected>Application</option>
        );
      } else {
        targetTypeOptions.push(
          <option value="application">Application</option>
        );
      }
      if (this.props.shareObject.owner === this.props.username) {
        if (this.state.targetType === "user") {
          targetTypeOptions.push(
            <option value="user" selected>User</option>
          );
        } else {
          targetTypeOptions.push(
            <option value="user">User</option>
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
          <div className="form-group">
            <label htmlFor="obj-name">{this.state.targetType === "user" ? "Username:" : "Application Name:"}</label>
            <input type="text" className="form-control" id="obj-name" value={this.state.name} required onChange={this.onNameChange}/>
          </div>
          <div className="form-group">
            <label htmlFor="permission-type">Permission:</label>
            <select className="form-control" id="permission-type" onChange={this.onPermissionChange}>
              {permissionOptions}
            </select>
          </div>
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
