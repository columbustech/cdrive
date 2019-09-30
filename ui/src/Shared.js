import React from 'react';
import axios from 'axios';
import Cookies from 'universal-cookie';
import Table from 'react-bootstrap/Table';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { cdriveApiUrl } from './GlobalVariables';
import './FileTable.css';

class Shared extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sharedFiles: []
    };
    this.downloadFile = this.downloadFile.bind(this);
  }
  getSharedFiles() {
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'GET',
      url: `${cdriveApiUrl}shared-files-list/`,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({sharedFiles: response.data});
      },
      err => {
      }
    );
  }
  componentDidMount() {
    this.getSharedFiles();
  }
  downloadFile(fileName, fileOwner) {
    const cookies = new Cookies();
    let auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'GET',
      url: `${cdriveApiUrl}download-shared-file/?file_name=${fileName}&file_owner=${fileOwner}`,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        const link = document.createElement('a');
        link.href = response.data.download_url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      err => {
      }
    );
  }
  render() {
    if(this.state.sharedFiles.length === 0) {
      return(null);
    }
    let rows;
    rows = this.state.sharedFiles.map((fileItem, i) => (
      <tr key={i}>
        <td><div className="file-table-text">{fileItem.file_name}</div></td>
        <td><div className="file-table-text">{fileItem.file_size}</div></td>
        <td><div className="file-table-text">{fileItem.file_owner}</div></td>
        <td>
          <DropdownButton variant="transparent" 
            title="" alignRight >
            <Dropdown.Item 
              onClick={() => this.downloadFile(fileItem.file_name, fileItem.file_owner)}>
              Download
            </Dropdown.Item>
          </DropdownButton>
        </td>
      </tr>
    ));

    return(
      <div className="my-files-container right-panel-item">
        <Table>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Size</th>
              <th>Owner</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </Table>
      </div>
    );
  }
}

export default Shared;
