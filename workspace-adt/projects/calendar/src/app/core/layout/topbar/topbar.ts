import { Component } from '@angular/core';

import { UserMenu } from '../user-menu/user-menu';

@Component({
  selector: 'yko-topbar',
  standalone: true,
  imports: [UserMenu],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {}
