import {
  contentChild,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  inject,
  input,
  OnChanges,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { fromEvent, timer } from 'rxjs';
import { auditTime } from 'rxjs/operators';

type IElement<T> = T & { id: number };

@Directive({
  selector: '[appDynamicVirtualScrolling]',
  standalone: true,
})
export class DynamicVirtualScrollingDirective<T> implements OnInit, OnChanges {
  host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  templateRef = contentChild.required(TemplateRef);
  vcr = contentChild.required(TemplateRef, { read: ViewContainerRef });

  contentData = input.required<IElement<T>[]>();
  estimatedInitialHeight = 300;
  biggestElement = 300;
  lastHeight = 0;
  lastElementEnd = 0;

  private renderedViews = new Map<number, EmbeddedViewRef<any>>();
  private itemOffsets: { id: number; offset: number }[] = [];

  ngOnInit(): void {
    this.setupInitialLoad();
    this.updateContainerHeight(true);

    fromEvent(this.getScrollParent(), 'scroll')
      .pipe(auditTime(16))
      .subscribe(() => this.handleScroll());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contentData']) {
      const change = changes['contentData'];
      if (change.firstChange) return;

      if (change.previousValue.length < change.currentValue.length) {
        this.vcr().clear();
        this.renderedViews.clear();

        this.handleScroll();

        return;
      }

      this.vcr().clear();
      this.renderedViews.clear();
      this.itemOffsets.forEach((el, i) => {
        if (!this.contentData().find((data) => data.id == el.id)) {
          const elHeight = this.itemOffsets[i].offset;

          this.getScrollParent().scrollTop -= elHeight;

          this.itemOffsets.splice(i, 1);
        }
      });

      this.handleScroll();
    }
  }

  private setupInitialLoad(): void {
    const parent = this.getScrollParent();
    const viewportHeight = parent.offsetHeight;
    const initialCount = Math.ceil(
      viewportHeight / this.estimatedInitialHeight
    );

    this.host.style.position = 'relative';
    this.host.style.minHeight =
      initialCount * this.estimatedInitialHeight + 'px';
    this.host.style.maxHeight =
      initialCount * this.estimatedInitialHeight + 'px';

    this.appendItems(0, initialCount);
  }

  private handleScroll() {
    const parent = this.getScrollParent();
    const scrollTop = parent.scrollTop;
    const viewportHeight = parent.offsetHeight;

    const start = scrollTop;
    const end = scrollTop + viewportHeight;

    let currentOffset = 0;

    for (let i = 0; i < this.contentData().length; i++) {
      const itemTop = currentOffset;
      const elIndex = this.itemOffsets.findIndex(
        (el) => el.id === this.contentData()[i].id
      );

      const itemBottom = currentOffset + this.getItemHeight(elIndex);

      const isVisible =
        itemBottom >= start - this.biggestElement &&
        itemTop <= end + this.biggestElement;

      const alreadyRendered = this.renderedViews.has(this.contentData()[i].id);

      if (isVisible && !alreadyRendered) {
        this.renderItem(this.contentData()[i].id, i);
      } else if (!isVisible) {
        this.removeItem(this.contentData()[i].id);
      }

      currentOffset = itemBottom;
    }

    timer(1).subscribe(() => {
      this.updateContainerHeight();
    });
  }

  private renderItem(id: number, i: number) {
    const data = this.contentData();
    const dataEl = data.find((el) => el.id === id);
    const islast = dataEl == data[data.length - 1];

    if (!dataEl) return;

    const view = this.vcr().createEmbeddedView(this.templateRef(), {
      item: dataEl,
    });

    timer(1).subscribe(() => {
      const el = view.rootNodes.find((el) => el instanceof HTMLElement);

      if (!el) return;

      el.style.transform = `translateY(${this.calculateItemTop(i)}px)`;

      el.setAttribute('lazy-scroll-element', 'true');

      this.renderedViews.set(id, view);
      this.itemOffsets[i] = {
        id,
        offset: el.offsetHeight || this.estimatedInitialHeight,
      };

      this.biggestElement = Math.max(
        this.biggestElement,
        this.itemOffsets[i].offset
      );

      if (islast)
        this.lastElementEnd =
          this.calculateItemTop(i) + this.itemOffsets[i].offset;

      this.calcAvarageHeight();
    });
  }

  private calcAvarageHeight() {
    this.estimatedInitialHeight = Math.ceil(
      this.itemOffsets.reduce((sum, h) => sum + h.offset, 0) /
        this.itemOffsets.length
    );
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

  private calculateItemTop(id: number): number {
    let top = 0;
    for (let i = 0; i < id; i++) {
      top += this.getItemHeight(i);
    }
    return top;
  }

  private getItemHeight(id: number): number {
    return this.itemOffsets[id]?.offset || this.estimatedInitialHeight;
  }

  private updateContainerHeight(isFirst = false): void {
    const totalHeight = this.itemOffsets.reduce((sum, h) => sum + h.offset, 0);
    if (this.itemOffsets.length == this.contentData().length) {
      if (this.lastElementEnd == 0) return;
      this.host.style.minHeight = `${this.lastElementEnd + 10}px`;
      this.host.style.maxHeight = `${this.lastElementEnd + 10}px`;
      return;
    }
    const diffHeight = Math.min(this.contentData().length / 4, 50);
    const parent = this.getScrollParent();
    if (isFirst) {
      this.lastHeight = totalHeight + diffHeight * this.estimatedInitialHeight;
      this.host.style.minHeight = `${this.lastHeight}px`;
      this.host.style.maxHeight = `${this.lastHeight}px`;
      return;
    }
    if (
      Math.ceil(parent.offsetHeight + parent.scrollTop) >= parent.scrollHeight
    ) {
      const moreSize = Math.min(
        diffHeight * this.estimatedInitialHeight,
        Math.ceil(totalHeight * 0.1)
      );
      this.lastHeight = totalHeight + moreSize;
      this.host.style.minHeight = `${this.lastHeight}px`;
      this.host.style.maxHeight = `${this.lastHeight}px`;
    }
  }

  private appendItems(start: number, count: number): void {
    for (
      let i = start;
      i < start + count && i < this.contentData().length;
      i++
    ) {
      this.renderItem(this.contentData()[i].id, i);
    }
  }

  private getScrollParent(): HTMLElement {
    return this.host.parentElement!;
  }
}
