import { Component, OnInit } from '@angular/core';
import { DemoService } from './services/demo.service';
import { FormControl, FormGroup } from '@angular/forms';
import { CookieService } from 'ngx-cookie-service';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import 'rxjs/add/operator/filter';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import { TextEditorDialogComponent } from './text-editor-dialog/text-editor-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  authTokenColumbus = 'UNKNOWN';
  pathParameter: string;
  fileName: string;
  locationPage: Location;

  fileForm = new FormGroup({
    downloadFileContent: new FormControl(`Change something \n here`)
  });
  templateFileContents = 'here \n here';

  constructor(private _demoService: DemoService, private cookieService: CookieService,
    private route: ActivatedRoute, private location: Location, public dialog: MatDialog) {
      this.locationPage = location;
    }

  ngOnInit() {
    /** get token */
    this.authTokenColumbus = this.cookieService.get('columbus_token');
    /** get path parameter to get file location and fetch contents */
    this.route.queryParams
      .filter(params => params.path)
      .subscribe(params => {
        console.log(params);
        this.pathParameter = params.path;
        this.fileName = this.pathParameter.substr(this.pathParameter.lastIndexOf('/') + 1);
        /** get file contents */
        this.getFileContents(this.pathParameter);
      });
  }

  /**
   * Fetch file contents given the path to it.
   */
  getFileContents(pathValue) {
    this._demoService.getFileContents(this.authTokenColumbus, pathValue).subscribe(fileContents => {
      /** recognize \n \r as new line characters */
      console.log('Let us see file contents');
      console.log(fileContents);
      let contentsWithNewLines = fileContents.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '\"').replace(/(^")|("$)/g, '');
      this.fileForm.setValue({
        downloadFileContent: contentsWithNewLines
      });
    });
  }

  /**
   * On Press of Submit button, update the file contents on cdrive
   */
  onSubmit() {
    console.log(this.fileForm.get('downloadFileContent').value);
    /** delete and create the file so as to effectively update it */
    this.updateFileContents(this.pathParameter, this.fileForm.get('downloadFileContent').value);
    /** change the path back */
    // this.location.replaceState('');  navigates to the base site
    /** navigate to last opened page */
    this.openDialog();
    // this.location.back();

  }

  updateFileContents(pathValue, contents) {
    this.deleteFile(pathValue);
    this.addFile(pathValue, contents);
  }

  /** delete existing file */
  deleteFile(pathValue) {
    this._demoService.deleteFile(this.authTokenColumbus, pathValue).subscribe();
  }

  /** create a new file */
  addFile(pathValue, contents) {
    this._demoService.createFile(this.authTokenColumbus, pathValue, contents).subscribe((val) => {
      console.log(val);
    });
  }

  openDialog(): void {
    // let dialogRef = this.dialog.open(TextEditorDialogComponent, {
    //   width: '250px',
    //   data: ''
    // });
    const dialogRef = this.dialog.open(TextEditorDialogComponent, {
      data: ''
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }
}
