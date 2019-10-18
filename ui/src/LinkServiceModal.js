import React from 'react';
import axios from 'axios';
import Cookies from 'universal-cookie';
import { Modal, Button } from 'react-bootstrap';

class LinkServiceModal extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      serviceUrl: "",
      serviceName: "",
    };
    this.onChange = this.onChange.bind(this);
    this.linkService = this.linkService.bind(this);
  }
  onChange(e, name) {
    this.setState({[e.target.name]: e.target.value});
  }
  linkService(event) {
    event.preventDefault();

    const data = new FormData();
    data.append('serviceUrl', this.state.serviceUrl);
    data.append('serviceName', this.state.serviceName);
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    const request = axios({
      method: 'POST',
      url: window.location.protocol + "//api." + window.location.hostname + "/create-service/",
      data: data,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.props.toggleModal();
        this.props.getServices();
      }
    );
  }
  render() {
    return(
      <Modal show={this.props.show} onHide={this.props.toggleModal}>
        <Modal.Header closeButton>
          <Modal.Title>Link Hosted Service</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{paddingBottom: '10px'}}>
            <div className="form-group ">
              <input type="text"  className="form-control" name="serviceName" value={this.state.serviceName} 
                placeholder="Hosted Service Name" required onChange={this.onChange}/>
            </div>
            <div className="form-group ">
              <input type="text"  className="form-control" name="serviceUrl" value={this.state.serviceUrl} 
                placeholder="Hosted Service Url" required onChange={this.onChange}/>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.props.toggleModal}>
            Close
          </Button>
          <Button variant="primary" onClick={e => this.linkService(e)}> 
            Link
          </Button>
        </Modal.Footer>
      </Modal>
    );

  }
}

export default LinkServiceModal;
