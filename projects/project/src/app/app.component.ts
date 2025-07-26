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
      return [...data, { data: 'Test 51', id: data.length }];
    });
  }
}
