import { Component, OnInit, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ProjectsService } from '../../projects/services/projects.service';
import { Project } from '../../../core/models/project.model';
import { CreateCycleDto } from '../../../core/models/cycle.model';

@Component({
  selector: 'app-cycle-create-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>Create Cycle</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Cycle Name</mat-label>
        <input matInput [(ngModel)]="form.name" placeholder="Enter cycle name" autofocus>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Project</mat-label>
        <mat-select [(ngModel)]="form.projectId" [disabled]="!!data?.projectId">
          @for (project of projects(); track project.id) {
            <mat-option [value]="project.id">{{ project.identifier }} - {{ project.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Start Date</mat-label>
          <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate">
          <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>End Date</mat-label>
          <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate">
          <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
          <mat-datepicker #endPicker></mat-datepicker>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Description</mat-label>
        <textarea matInput [(ngModel)]="form.description" rows="2" placeholder="Add a description"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()"
              [disabled]="!form.name || !form.projectId || !startDate || !endDate">
        Create Cycle
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      width: 100%;
      max-width: 90vw;
      padding-top: 8px !important;
    }
    .full-width { width: 100%; }
  `]
})
export class CycleCreateDialogComponent implements OnInit {
  projects = signal<Project[]>([]);
  startDate: Date | null = null;
  endDate: Date | null = null;
  form: Partial<CreateCycleDto> = { name: '', description: '', projectId: '' };

  constructor(
    private dialogRef: MatDialogRef<CycleCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { projectId?: string } | null,
    private projectsService: ProjectsService,
  ) {}

  ngOnInit() {
    this.projectsService.getAll().subscribe((p) => this.projects.set(p));
    if (this.data?.projectId) {
      this.form.projectId = this.data.projectId;
    }
  }

  submit() {
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    this.dialogRef.close({
      ...this.form,
      startDate: this.startDate ? formatDate(this.startDate) : '',
      endDate: this.endDate ? formatDate(this.endDate) : '',
    });
  }
}
