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
    this.uploadFile = this.uploadFile.bind(this);
    this.presignedUpload = this.presignedUpload.bind(this);
    this.completeUpload = this.completeUpload.bind(this);
    this.fileInput = React.createRef();
    this.onUploadButtonClick = this.onUploadButtonClick.bind(this);
    this.handleUploadFromButton = this.handleUploadFromButton.bind(this);
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
        response.data.driveObjects.sort((dobj1, dobj2) => {
          if(dobj1.type === "Folder" && dobj2.type === "File") {
            return -1;
          } else if (dobj2.type === "Folder" && dobj1.type === "File") {
            return 1;
          } else if (dobj2.name > dobj1.name) {
            return -1;
          } else {
            return 1;
          }
        });
        this.setState({
          driveObjects: response.data.driveObjects,
          permission: response.data.permission,
          path: path
        });
      },
    );
  }
  completeUpload(uploadId) {
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const data = new FormData();
    data.append('uploadId', uploadId);
    const request = axios({
      method: 'POST',
      url: window.location.protocol + "//api." + window.location.hostname + "/complete-upload-alt/",
      data: data,
      headers: {'Authorization': auth_header}
    });
    return request.then(
      response => {
        this.getDriveObjects(this.state.path);
      },
    );
  }
  presignedUpload(file, url, fields) {
    const data = new FormData();
    Object.keys(fields).forEach(key => {
      data.append(key, fields[key]);
    });
    data.append('file', file);
    const request = axios({
      method: 'POST',
      url: url,
      data: data,
      onUploadProgress: function (progressEvent) {
      }
    });
     return request.then(
      response => {
      },
    );
  }
  uploadFile(file, path) {
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const data = new FormData();
    if(!file.path) {
      data.append('path', path + '/' + file.name);
    } else if(file.path.charAt(0) === '/') {
      data.append('path', path + file.path);
    } else {
      data.append('path', path + '/' + file.path);
    }
    const request = axios({
      method: 'POST',
      url: window.location.protocol + "//api." + window.location.hostname + "/initiate-upload-alt/",
      data: data,
      headers: {'Authorization': auth_header}
    });
    let uploadId;
    return request.then(
      response => {
        uploadId = response.data.uploadId;
        return this.presignedUpload(file, response.data.url, response.data.fields);
      },
    ).then(result => this.completeUpload(uploadId));
  }
  handleUpload(acceptedFiles) {
    let uploadPromise;
    var path = this.state.path;
    for (const file of acceptedFiles) {
      if (uploadPromise) {
        uploadPromise = uploadPromise.then(() => this.uploadFile(file, path));
      } else {
        uploadPromise = this.uploadFile(file, path);
      }
    }
  }
  onUploadButtonClick() {
    this.fileInput.current.click();
  }
  handleUploadFromButton(e) {
    e.preventDefault();
    console.log(this.fileInput.current.files);
    this.handleUpload(this.fileInput.current.files);
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
          if (dobj.permission === "Edit") {
            var editUrl = window.location.protocol + "//" + window.location.hostname + "/editor/?path=" + this.state.path + "/" + dobj.name;
            ddItems.push(
              <Dropdown.Item href={editUrl} >
                Edit
              </Dropdown.Item>
            );
          }
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
            <input type="file" ref={this.fileInput} style={{display: "none"}} onChange={this.handleUploadFromButton} multiple/>
            <button style={{marginLeft: 10, width: 150}} type="button" className="btn btn-primary" onClick={this.onUploadButtonClick} >
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
      <Dropzone onDrop={acceptedFiles => this.handleUpload(acceptedFiles, 0)} noClick noKeyboard>
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
