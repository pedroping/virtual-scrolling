import { Component } from '@angular/core';
import {
  StaticElementDirective,
  StaticVirtualScrollingDirective,
} from '@virtual-scrolling';
import { TestComponentComponent } from '../test-component/test-component.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [
    StaticElementDirective,
    StaticVirtualScrollingDirective,
    TestComponentComponent,
  ],
})
export class AppComponent {
  title = 'project';

  data = Array.from({ length: 200 }).map((_, i) => ({ data: 'Test ' + i }));
}

/*
  1 - create an array with a lot of messages and with diferent sizes 
  
  2.1 - render all the list on the start and hide all elements outside the viewport 
  2.2 - render just the list on the viewport and create an imaginary number to the height like the twitter

  3 - create the directive the remove the component reference and add an generic one 
*/
