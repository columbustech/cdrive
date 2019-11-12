import { Component, OnInit, Inject } from '@angular/core';
import { Location } from '@angular/common';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

@Component({
  selector: 'app-text-editor-dialog',
  templateUrl: './text-editor-dialog.component.html',
  styleUrls: ['./text-editor-dialog.component.css']
})
export class TextEditorDialogComponent {
  locationPage: Location;
  constructor(
    private location: Location,
    public dialogRef: MatDialogRef<TextEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
      this.locationPage = location;
    }

  onNoClick(): void {
    this.dialogRef.close();
  }

  goBack(): void {
    this.locationPage.back();
    this.dialogRef.close();
  }

}
