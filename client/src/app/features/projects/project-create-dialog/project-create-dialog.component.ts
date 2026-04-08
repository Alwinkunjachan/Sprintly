import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CreateProjectDto } from '../../../core/models/project.model';

@Component({
  selector: 'app-project-create-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Create Project</h2>
    <mat-dialog-content>
      <div class="form-row">
        <mat-form-field appearance="outline" class="field-name">
          <input matInput [(ngModel)]="form.name" placeholder="Project Name" autofocus>
        </mat-form-field>

        <mat-form-field appearance="outline" class="field-id">
          <input matInput [(ngModel)]="form.identifier" placeholder="Identifier (2-5 chars)" maxlength="5"
                 (input)="form.identifier = form.identifier.toUpperCase()">
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <textarea matInput [(ngModel)]="form.description" rows="3" placeholder="Description"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()"
              [disabled]="!form.name || !form.identifier || form.identifier.length < 2">
        Create Project
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      width: 100%;
      padding-top: 8px !important;
    }
    .full-width { width: 100%; }
    .field-name { flex: 2; }
    .field-id { flex: 1; }
  `]
})
export class ProjectCreateDialogComponent {
  form: CreateProjectDto = { name: '', identifier: '', description: '' };

  constructor(private dialogRef: MatDialogRef<ProjectCreateDialogComponent>) {}

  submit() {
    this.dialogRef.close(this.form);
  }
}
