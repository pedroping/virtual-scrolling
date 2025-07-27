import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DynamicVirtualScrollingDirective } from '@virtual-scrolling';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [DynamicVirtualScrollingDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'project';

  data = signal(
    Array.from({ length: 50 }).map((_, i) => ({
      data: 'Test ' + (i + 1),
      id: i,
    }))
  );

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
      const lastId = data[data.length - 1].id + 1;

      return [
        ...data,
        {
          data: 'Test 51',
          id: lastId,
        },
      ];
    });
  }
}


/* 
  Things to do next: 
  1 - handle elemnts with reference instead of id to avoid the necessity of sequencial ids  
  2 - maybe replicate ngFor funcionality 
*/