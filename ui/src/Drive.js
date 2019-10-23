import React from 'react';
import axios from 'axios';
import Cookies from 'universal-cookie';
import Table from 'react-bootstrap/Table';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropzone from 'react-dropzone';
import { FaFile, FaFolder, FaFolderPlus } from 'react-icons/fa';
import ShareModal from './ShareModal';
import NewFolderModal from './NewFolderModal';
import './Drive.css';

class Drive extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      path: 'users/' + this.props.username,
      permission: 'View',
      driveObjects: [],
      shareObject: null,
      showNewFolderModal: false,
      showShareModal: false,
    };
    this.getDriveObjects = this.getDriveObjects.bind(this);
    this.handleUpload = this.handleUpload.bind(this);
    this.directUpload = this.directUpload.bind(this);
    this.chunkedUpload = this.chunkedUpload.bind(this);
    this.deleteHandler = this.deleteHandler.bind(this);
    this.downloadHandler = this.downloadHandler.bind(this);
    this.shareHandler = this.shareHandler.bind(this);
    this.breadcrumbClick = this.breadcrumbClick.bind(this);
    this.tableRowClick = this.tableRowClick.bind(this);
    this.toggleNewFolderModal = this.toggleNewFolderModal.bind(this);
    this.toggleShareModal = this.toggleShareModal.bind(this);
  }
  componentDidMount() {
    this.getDriveObjects(this.state.path);
  }
  getDriveObjects(path) {
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'GET',
      url: window.location.protocol + "//api." + window.location.hostname + "/list/?path=" + path,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({
          driveObjects: response.data.driveObjects,
          permission: response.data.permission,
          path: path
        });
      },
    );
  }
  handleUpload(acceptedFiles) {
    var file;
    for(file of acceptedFiles) {
      if (file.size < (15 * 1024 * 1024)) {
        this.directUpload(file);
      } else {
        this.chunkedUpload(file);
      }
    }
  }
  directUpload(file) {
    const data = new FormData();
    var path = this.state.path;
    data.append('path', path);
    data.append('file', file);
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: window.location.protocol + "//api." + window.location.hostname + "/upload/",
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.getDriveObjects(this.state.path);
      },
    );
  }
  chunkedUpload(file) {
    var data = new FormData();
    var path = this.state.path;
    var onCompleteHandler = this.getDriveObjects;
    data.append('path', path);
    data.append('file_name', file.name);
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    var request = axios({
      method: 'POST',
      url: window.location.protocol + "//api." + window.location.hostname + "/initiate-chunked-upload/",
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        var uploadId = response.data.uploadId;
        var chunkSize = 10 * 1024 * 1024;
        var offset = 0;
        var partNumber = 0;
        var chunkReaderBlock = null;
        var mpu = [];

        var readEventHandler = function(evt) {
          if (evt.target.error == null) {
            offset += evt.target.result.length;
            partNumber += 1;

            data = new FormData();
            data.append('partNumber', partNumber);
            data.append('path', path);
            data.append('file_name', file.name);
            data.append('uploadId', uploadId);
            data.append('chunk', evt.target.result);

            axios({
              method: 'POST',
              url: window.location.protocol + "//api." + window.location.hostname + "/upload-chunk/",
              data: data,
              headers: {'Authorization': auth_header}
            }).then(
              resp2 => {
                mpu.push(resp2.data.ETag);
                if (offset >= file.size) {
                  data = new FormData();
                  data.append('path', path);
                  data.append('file_name', file.name);
                  data.append('uploadId', uploadId);
                  data.append('partInfo', mpu);
                  data.append('size', file.size);

                  axios({
                    method: 'POST',
                    url: window.location.protocol + "//api." + window.location.hostname + "/complete-chunked-upload/",
                    data: data,
                    headers: {'Authorization': auth_header}
                  }).then(
                    resp3 => {
                      onCompleteHandler(path);
                    },
                  );
                  return;
                } else {
                  chunkReaderBlock(offset, chunkSize, file);
                }
              },
            );
          } else {
            console.log("Read error: " + evt.target.error);
            return;
          }
        }

        chunkReaderBlock = function(_offset, length, _file) {
          var r = new FileReader();
          var blob = _file.slice(_offset, length + _offset);
          r.onload = readEventHandler;
          r.readAsText(blob);
        }

        chunkReaderBlock(offset, chunkSize, file);
      },
    );
  }
  deleteHandler(e, index) {
    e.preventDefault();
    e.stopPropagation();
    var newPath = this.state.path + '/' + this.state.driveObjects[index].name;
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'DELETE',
      url: window.location.protocol + "//api." + window.location.hostname + "/delete/?path=" + newPath,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.getDriveObjects(this.state.path);
      },
    );
  }
  downloadHandler(e, index) {
    e.preventDefault();
    e.stopPropagation();
    var filePath = this.state.path + '/' + this.state.driveObjects[index].name;
    const cookies = new Cookies();
    let auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'GET',
      url: window.location.protocol + "//api." + window.location.hostname + "/download/?path=" + filePath,
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
    );
  }
  breadcrumbClick(index) {
    var tokens = this.state.path.split("/");
    var newPath = tokens.slice(0,index+1).join("/");
    this.getDriveObjects(newPath);
  }
  tableRowClick(e, index) {
    if (!e.target.classList.contains("btn")) {  
      var newPath;
      if (this.state.driveObjects[index].type === "Folder") {
        newPath = this.state.path + "/" + this.state.driveObjects[index].name;
        this.getDriveObjects(newPath);
      } else if (this.state.driveObjects[index].type === "File") {
        newPath = this.state.path + "/" + this.state.driveObjects[index].name;
        window.location.href = "csvbrowser/?path=" + newPath;
      }
    }
  }
  shareHandler(e, index) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({shareObject: this.state.driveObjects[index]});
    this.toggleShareModal();
  }
  toggleNewFolderModal() {
    this.setState({ showNewFolderModal: !this.state.showNewFolderModal });
  }
  toggleShareModal() {
    this.setState({ showShareModal: !this.state.showShareModal });
  }
  render() {
    var tokens = this.state.path.split("/");
    let items;

    items = tokens.map((token, i) => {
      if(i === tokens.length - 1){
        return (<li className="breadcrumb-item active" aria-current="page"><button className="btn" disabled>{token}</button></li>);
      } else {
        return (<li className="breadcrumb-item"><button onClick={() => this.breadcrumbClick(i)} className="btn btn-link">{token}</button></li>);
      }
    });

    let table;
    if(this.state.driveObjects.length !== 0) {
      let rows;
      rows = this.state.driveObjects.map((dobj, i) => {
        let size, name, rowClass;
        var ddItems = [];
        if (dobj.type === "Folder") {
          rowClass = "folder-row";
          name = 
            <td>
              <div className="file-table-text">
                <FaFolder style={{marginRight: 6 }} size={25} color="#92cefe" />
                {dobj.name}
              </div>
            </td> ;
          size = <td><div className="file-table-text"></div></td> ;
        } else {
          rowClass = "file-row";
          name = 
            <td>
              <div className="file-table-text">
                <FaFile style={{marginRight: 6 }} size={25} color="#9c9c9c" />
                {dobj.name}
              </div>
            </td> ;
          var sizeVal;
          var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
          if (dobj.size === 0) {
            sizeVal = '0 B';
          } else {
            var logval = parseInt(Math.floor(Math.log(dobj.size) / Math.log(1024)));
            sizeVal = Math.round(dobj.size / Math.pow(1024, logval), 2) + ' ' + sizes[logval];
          }
          size = <td><div className="file-table-text">{sizeVal}</div></td> ;
          ddItems.push(
            <Dropdown.Item onClick={e => this.downloadHandler(e, i)}>
              Download
            </Dropdown.Item>
          );
        }
        if (dobj.permission === "Edit") {
          ddItems.push(
            <Dropdown.Item onClick={e => this.deleteHandler(e, i)}>
              Delete
            </Dropdown.Item>
          );
        }
        ddItems.push(
          <Dropdown.Item onClick={e => this.shareHandler(e, i)}>
            Share
          </Dropdown.Item>
        );
        return (
          <tr key={i} className={rowClass} onClick={e => this.tableRowClick(e, i)} >
            {name}
            {size}
            <td><div className="file-table-text">{dobj.owner}</div></td>
            <td>
              <DropdownButton variant="transparent" title="" alignRight >
                {ddItems}
              </DropdownButton>
            </td>
          </tr>
        );
      });
      table = (
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Owner</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </Table>
      );
    }

    let menuItems;
    if (this.state.permission === 'Edit') {
      menuItems = (
        <ul className="menu-list">
          <li className="menu-list-item">
            <button style={{marginLeft: 10, width: 150}} type="button" className="btn btn-primary" >
              Upload
            </button>
          </li>
          <li className="menu-list-item">
            <button type="button" className="btn btn-link" onClick={this.toggleNewFolderModal} >
              <FaFolderPlus style={{marginRight: 6 }} size={25} color="#92cefe" />
              New Folder
            </button>
          </li>
        </ul>
      );
    }

    return(
      <Dropzone onDrop={acceptedFiles => this.handleUpload(acceptedFiles)} noClick noKeyboard>
        {({getRootProps, getInputProps}) => (
          <div {...getRootProps()} className="drive-container" >
            <input {...getInputProps()} />
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb bg-transparent">
                {items}
              </ol>
            </nav>
            <div className="drive-table">
              {table}
            </div>
            <div className="drive-menu" >
              {menuItems}
            </div>
            <NewFolderModal show={this.state.showNewFolderModal} toggleModal={this.toggleNewFolderModal} getDriveObjects={this.getDriveObjects} path={this.state.path} >
            </NewFolderModal>
            <ShareModal show={this.state.showShareModal} toggleModal={this.toggleShareModal} shareObject={this.state.shareObject} username={this.props.username} path={this.state.path} />
          </div>
        )}
      </Dropzone>
    );
  }
}

export default Drive;
