import React from 'react';
import axios from 'axios';
import Cookies from 'universal-cookie';
import { CsvToHtmlTable } from 'react-csv-to-table';
import { cdriveApiUrl } from './GlobalVariables';

class CsvBrowser extends React.Component {
  constructor(props) {
      super(props);
      this.state = {
          jsondata: [],
      }
  }
  componentDidMount() {
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('columbus_token');
    var path;
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        if (key === "path") {
          path = value;
        }
    });
    const request = axios({
      method: 'GET',
      url: `${cdriveApiUrl}json-content/?path=${path}`,
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({jsondata: response.data})
      },
    );
  }
  render() {
    if (this.state.jsondata.length === 0) {
      return (null);
    } else {
      var keys = Object.keys(this.state.jsondata[0]);

      let headers;

      headers = keys.map((key, index) => {
        return (<th>{key}</th>);
      });

      var rows = [];
      
      this.state.jsondata.map((jsonrow, i) => {
        let rowdata;
        rowdata = Object.keys(jsonrow).map((key, index) => {
          return (<td>{jsonrow[key]}</td>);
        });
        rows.push(<tr>{rowdata}</tr>);
      });
      return (
        <div>
          <table className="table table-bordered">
            <thead>
              <tr>
                {headers}
              </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
          </table>
        </div>
      );
    }
  }
}

export default CsvBrowser;
