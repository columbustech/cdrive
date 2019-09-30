import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import axios from 'axios';
import Cookies from 'universal-cookie';
import { cdriveApiUrl } from './GlobalVariables';

class NewFolderModal extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      name: ""
    };
    this.onChange = this.onChange.bind(this);
    this.createFolder = this.createFolder.bind(this);
  }
  onChange(e) {
    this.setState({name: e.target.value});
  }
  createFolder(folderName) {
    const data = new FormData();
    data.append('path', this.props.path);
    data.append('name', folderName);
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: `${cdriveApiUrl}create/`,
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.props.getDriveObjects(this.props.path);
      },
    );
    this.props.toggleModal();
  }
  render() {
    return(
      <Modal show={this.props.show} onHide={this.props.toggleModal}>
        <Modal.Header closeButton>
          <Modal.Title>Create Folder</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <div className="form-group ">
              <input type="text"  className="form-control" name="name" value={this.state.name} 
                placeholder="Folder name" title="name" required onChange={this.onChange}/>
            </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.props.toggleModal}>
            Close
          </Button>
          <Button variant="primary" onClick={() => this.createFolder(this.state.name)}>
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default NewFolderModal;
