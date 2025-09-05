import { Component, input } from '@angular/core';
import { DynamicVirtualScrollingDirective } from '@virtual-scrolling';

@Component({
  selector: 'app-img-component',
  templateUrl: './img-component.component.html',
  styleUrls: ['./img-component.component.scss'],
  standalone: true,
})
export class ImgComponentComponent {
  item = input.required<{ id: number; data: string }>();
  dynamicVirtualScrollingDirective =
    input.required<DynamicVirtualScrollingDirective<any>>();

  loadEvent(id: number) {
    this.dynamicVirtualScrollingDirective().updateElement(id);
  }
}
