import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { Topbar } from '../topbar/topbar';

@Component({
  selector: 'yko-app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Sidebar, Breadcrumb, Topbar],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {}
