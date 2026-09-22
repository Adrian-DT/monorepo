import { Component } from '@angular/core';

export type UserRole = 'USER' | 'SUPERVISOR' | 'ADMIN';

export type Permission =
  | 'VACATION_REQUEST'
  | 'VACATION_APPROVE'
  | 'ON_CALL_ASSIGN'
  | 'INTERVENTION_EDIT'
  | 'STATISTICS_VIEW'
  | 'USER_MANAGE';

@Component({
  selector: 'yko-user-form',
  imports: [],
  template: `<p>user-form works!</p>`,
  styleUrl: './user-form.css',
})
export class UserForm {}
