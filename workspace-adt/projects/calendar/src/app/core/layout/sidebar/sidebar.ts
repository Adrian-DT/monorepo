import { Component, inject } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../auth/auth';

@Component({
  selector: 'yko-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly isAdmin = inject(AuthService).isAdmin;
}
