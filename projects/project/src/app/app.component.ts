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
    Array.from({ length: 60 }).map((_, i) => ({
      data: 'Test ' + i,
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
      const lastId = Math.max(...data.map((d) => d.id)) + 1;

      const newData = [...data];

      newData.splice(10, 0, {
        data: 'Test ' + lastId,
        id: lastId,
      });
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

/* 
  Things to do:
    Refactor all scroll system, create an new wrapper that will contain the actual position, and calc based on the scroll and on the smallest 
    the element that will be rendered and always recalc the avarege size to calca the total height
  
    New conclustion this will not be possible with elements from diferent sizes, the way to do this will be create
    an lazy scroll and start to remove the old elements from the page. With this aproach will be possible to control
    the max scroll and handle elements with custom sizes 


    Will be something like: 
      - load doble if the initial elements that fit on screen to make some scroll available
      - this elements will has a custom position (or we can work with an wrapper)
      - on scroll we remove the elements that not o screen anymore and create other
      - after reach the final of the page we create more and increase the page make some validation on max page size
      - end this may ill work i guess 

  https://github.com/angular/components/blob/main/src/cdk-experimental/scrolling/auto-size-virtual-scroll.ts#L339
  https://github.com/angular/components/blob/main/src/cdk/scrolling/virtual-for-of.ts
  https://stackblitz.com/edit/xtyef8ek-u1p1ufrk?file=src%2Fexample%2Fcdk-virtual-scroll-data-source-example.ts,src%2Fexample%2Fcdk-virtual-scroll-data-source-example.css
  https://stackblitz.com/edit/u8d8capn-k6s3gbfz?file=src%2Fexample%2Fcdk-virtual-scroll-append-only-example.ts,src%2Fexample%2Fcdk-virtual-scroll-append-only-example.css,src%2Fexample%2Fcdk-virtual-scroll-append-only-example.html
*/
