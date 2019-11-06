import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';


import { AppComponent } from './app.component';
import { DemoService } from './services/demo.service';
import {NgxWigModule} from 'ngx-wig';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CookieService } from 'ngx-cookie-service';
import { Router, ActivatedRoute, Params, RouterModule } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TextEditorDialogComponent } from './text-editor-dialog/text-editor-dialog.component';
import { MatButtonModule } from '@angular/material';

@NgModule({
  declarations: [
    AppComponent,
    TextEditorDialogComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    NgxWigModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot([]),
    BrowserAnimationsModule,
    MatDialogModule,
    MatButtonModule
  ],
  entryComponents: [TextEditorDialogComponent],
  providers: [DemoService, CookieService],
  bootstrap: [AppComponent]
})
export class AppModule { }
