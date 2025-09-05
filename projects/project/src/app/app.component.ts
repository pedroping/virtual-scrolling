import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { DynamicVirtualScrollingDirective } from '@virtual-scrolling';
import { ImgComponentComponent } from './component/img-component.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [DynamicVirtualScrollingDirective, ImgComponentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'project';

  dynamicVirtualScrollingDirective = viewChild.required(
    DynamicVirtualScrollingDirective
  );

  data = signal(
    Array.from({ length: 60 }).map((_, i) => ({
      data: 'Test ' + i,
      id: i,
    }))
  );

  constructor() {
    self.addEventListener('fetch', (event) => {
      // event.respondWith(fetch(event))
      console.log(event);
    });
  }

  changeData() {
    this.data.update((data) => {
      data.pop();
      return [...data];
    });
  }

  changeData2() {
    this.data.update((data) => {
      data.shift();
      return [...data];
    });
  }

  addData() {
    this.data.update((data) => {
      const lastId = Math.max(...data.map((d) => d.id)) + 1;

      const newData = [
        {
          data: 'Test ' + lastId,
          id: lastId,
        },
        ...data,
      ];
      return newData;
    });
  }

  addData2() {
    this.data.update((data) => {
      const lastId = Math.max(...data.map((d) => d.id)) + 1;

      return [
        ...data,
        {
          data: 'Test ' + lastId,
          id: lastId,
        },
      ];
    });
  }
}
