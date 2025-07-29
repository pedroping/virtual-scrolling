import {
  contentChild,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  inject,
  input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { auditTime } from 'rxjs/operators';

@Directive({
  selector: '[appDynamicVirtualScrolling]',
  standalone: true,
})
export class DynamicVirtualScrollingDirective<T> implements OnInit {
  host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  templateRef = contentChild.required(TemplateRef);
  vcr = contentChild.required(TemplateRef, { read: ViewContainerRef });

  contentData = input.required<(T & { id: number })[]>();
  buffer = 2;
  estimatedInitialHeight = 300;
  maxDomItems = 100;

  private renderedViews = new Map<number, EmbeddedViewRef<any>>();
  private itemOffsets: number[] = [];

  ngOnInit(): void {
    this.setupInitialLoad();

    fromEvent(this.getScrollParent(), 'scroll')
      .pipe(auditTime(16))
      .subscribe(() => this.handleScroll());
  }

  private setupInitialLoad(): void {
    const parent = this.getScrollParent();
    const viewportHeight = parent.offsetHeight;
    const initialCount =
      Math.ceil(viewportHeight / this.estimatedInitialHeight) * 2;

    this.appendItems(0, initialCount);
  }

  private handleScroll(): void {
    const parent = this.getScrollParent();
    const scrollTop = parent.scrollTop;
    const viewportHeight = parent.offsetHeight;

    const start = scrollTop;
    const end = scrollTop + viewportHeight;

    let currentOffset = 0;
    for (let i = 0; i < this.contentData().length; i++) {
      const itemTop = currentOffset;
      const itemBottom = currentOffset + this.getItemHeight(i);

      const isVisible =
        itemBottom >= start - this.buffer * this.estimatedInitialHeight &&
        itemTop <= end + this.buffer * this.estimatedInitialHeight;

      const alreadyRendered = this.renderedViews.has(i);

      if (isVisible && !alreadyRendered) {
        this.renderItem(i);
      } else if (!isVisible && alreadyRendered) {
        this.removeItem(i);
      }

      currentOffset = itemBottom;
    }

    this.updateContainerHeight();
  }

  private renderItem(index: number): void {
    const data = this.contentData();
    if (index >= data.length) return;

    const view = this.vcr().createEmbeddedView(this.templateRef(), {
      item: data[index],
    });

    const el = view.rootNodes[0] as HTMLElement;
    el.style.position = 'absolute';
    el.style.top = `${this.calculateItemTop(index)}px`;
    el.style.width = '100%';
    el.setAttribute('lazy-scroll-element', 'true');

    this.renderedViews.set(index, view);

    this.itemOffsets[index] = el.offsetHeight || this.estimatedInitialHeight;

    this.cleanupExcessDom();
  }

  private removeItem(index: number): void {
    const view = this.renderedViews.get(index);
    if (view) {
      const idx = this.vcr().indexOf(view);
      if (idx > -1) {
        this.vcr().remove(idx);
      }
      this.renderedViews.delete(index);
    }
  }

  private cleanupExcessDom(): void {
    if (this.renderedViews.size <= this.maxDomItems) return;

    const sorted = Array.from(this.renderedViews.keys()).sort((a, b) => a - b);
    while (this.renderedViews.size > this.maxDomItems) {
      this.removeItem(sorted.shift()!);
    }
  }

  private calculateItemTop(index: number): number {
    let top = 0;
    for (let i = 0; i < index; i++) {
      top += this.getItemHeight(i);
    }
    return top;
  }

  private getItemHeight(index: number): number {
    return this.itemOffsets[index] || this.estimatedInitialHeight;
  }

  private updateContainerHeight(): void {
    const totalHeight = this.itemOffsets.reduce((sum, h) => sum + h, 0);
    this.host.style.position = 'relative';
    this.host.style.minHeight = `${totalHeight}px`;
  }

  private appendItems(start: number, count: number): void {
    for (
      let i = start;
      i < start + count && i < this.contentData().length;
      i++
    ) {
      this.renderItem(i);
    }
  }

  private getScrollParent(): HTMLElement {
    return this.host.parentElement!;
  }
}
