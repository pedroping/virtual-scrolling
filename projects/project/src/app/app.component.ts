import { Component } from '@angular/core';
import {
  DynamicVirtualScrollingDirective,
  StaticElementDirective,
  StaticVirtualScrollingDirective,
} from '@virtual-scrolling';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [
    // StaticElementDirective,
    // StaticVirtualScrollingDirective,
    
    DynamicVirtualScrollingDirective,
  ],
})
export class AppComponent {
  title = 'project';

  data = Array.from({ length: 200 }).map((_, i) => ({ data: 'Test ' + i }));
}

/*
  1 - pegar a posição do ultimo element e começar a criar os proximos 
  2 - salvar index do primeiro e do ultimo pra facilitar criar os parceiros
*/
