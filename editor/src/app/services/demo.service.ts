import {Injectable} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';


@Injectable()
export class DemoService {

  auth_header: string = '';
  baseUrl = 'https://api.cdrive.columbusecosystem.com/';

  constructor(private http: HttpClient) {}

  updateAuthHeader(authToken) {
    this.auth_header = 'Bearer ' + authToken;
  }

  /** return observable of file contents from api endpoint */
  getFileContents(authToken, pathValue) {
    this.updateAuthHeader(authToken);

    let restEndpoint = 'content/';
    let pathFile = pathValue;
    let url = this.baseUrl + restEndpoint + '?path=' + pathFile;

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Authorization': this.auth_header
      }), responseType: 'text' as 'text'
    };

    return this.http.get(url, httpOptions);
  }

  /** delete the already existing file */
  deleteFile(authToken, pathValue) {
    this.updateAuthHeader(authToken);

    let restEndpoint = 'delete/';
    let pathFile = pathValue;
    let url = this.baseUrl + restEndpoint + '?path=' + pathFile;

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Authorization': this.auth_header
      }), responseType: 'text' as 'text'
    };

    return this.http.delete(url, httpOptions);
  }

  /** create a new file */
  createFile(authToken, pathValue, contents) {
    this.updateAuthHeader(authToken);

    let restEndpoint = 'upload/';
    let url = this.baseUrl + restEndpoint;

    const data = new FormData();
    let folderPath = pathValue.substr(0, pathValue.lastIndexOf('/'));
    let fileName = pathValue.substr(pathValue.lastIndexOf('/') + 1);

    let path = folderPath;
    let file = new File([contents], fileName);

    data.append('path', folderPath);
    data.append('file', file, file.name);

    const postHttpOptions = {
      headers: new HttpHeaders({
        'Authorization': this.auth_header
      })
    };

    return this.http.post(url, data, postHttpOptions);
  }

}
