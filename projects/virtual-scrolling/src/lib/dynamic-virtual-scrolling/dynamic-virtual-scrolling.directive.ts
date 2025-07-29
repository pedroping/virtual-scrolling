import {
  contentChild,
  Directive,
  ElementRef,
  inject,
  input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { fromEvent, timer } from 'rxjs';
import { auditTime, take } from 'rxjs/operators';

@Directive({
  selector: '[appDynamicVirtualScrolling]',
  standalone: true,
})
export class DynamicVirtualScrollingDirective<T> implements OnInit {
  element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  template = contentChild.required(TemplateRef);
  vcr = contentChild.required(TemplateRef, { read: ViewContainerRef });

  contentData = input.required<(T & { id: number })[]>();
  itemHeight = 300;
  buffer = 1;

  ngOnInit(): void {
    this.setContainerHeight();

    fromEvent(this.element.parentElement!, 'scroll')
      .pipe(auditTime(16))
      .subscribe(() => this.renderVisibleItems());

    this.renderVisibleItems();
  }

  private setContainerHeight() {
    const totalHeight = this.contentData().length * this.itemHeight;
    this.element.style.position = 'relative';
    this.element.style.minHeight = `${totalHeight}px`;
  }

  private renderVisibleItems() {
    this.vcr().clear();

    const parent = this.element.parentElement!;
    const scrollTop = parent.scrollTop;
    const viewportHeight = parent.offsetHeight;

    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / this.itemHeight) - this.buffer
    );
    const endIndex = Math.min(
      this.contentData().length,
      Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.buffer
    );

    for (let i = startIndex; i < endIndex; i++) {
      const context = { item: this.contentData()[i] };
      const view = this.vcr().createEmbeddedView(this.template(), context);
      const el = view.rootNodes[0] as HTMLElement;

      el.style.top = `${i * this.itemHeight}px`;
      el.style.position = 'absolute';
      el.style.width = '100%';

      el.setAttribute('scrollabe-element', 'true');

      // if (i == this.contentData().length - 1) {
      //   console.log('here');
      // }
    }

    timer(1)
      .pipe(take(1))
      .subscribe(() => {
        const els = Array.from(
          this.element.querySelectorAll('[scrollabe-element="true"]')
        ).map((el) => (el as HTMLElement).offsetHeight);

        if (els.length == 0) return;

        const minHeight = Math.min(...els);

        if (minHeight > this.itemHeight) {
          this.itemHeight = minHeight;
          console.log(this.itemHeight);

          this.renderVisibleItems();
        }
      });
  }
}
