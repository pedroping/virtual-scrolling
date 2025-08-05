import {
  contentChild,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  inject,
  input,
  NgZone,
  OnChanges,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { auditTime, take } from 'rxjs/operators';

type IElement<T> = T & { id: number };

@Directive({
  selector: '[appDynamicVirtualScrolling]',
  standalone: true,
})
export class DynamicVirtualScrollingDirective<T> implements OnInit, OnChanges {
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly ngZone = inject(NgZone);
  templateRef = contentChild.required(TemplateRef);
  vcr = contentChild.required(TemplateRef, { read: ViewContainerRef });

  contentData = input.required<IElement<T>[]>();

  estimatedInitialHeight = 300;
  biggestElement = 300;
  lastHeight = 0;
  lastElementEnd = 0;

  private renderedViews = new Map<number, EmbeddedViewRef<any>>();
  private itemOffsets: {
    [key: number]: { index: number; offset: number; hasToUpdate?: boolean };
  } = {};

  ngOnInit(): void {
    this.setupInitialLoad();
    this.updateContainerHeight(true);

    fromEvent(this.getScrollParent(), 'scroll')
      .pipe(auditTime(20))
      .subscribe(() => this.handleScroll());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contentData']) {
      const change = changes['contentData'];
      if (change.firstChange) return;

      if (change.previousValue.length < change.currentValue.length) {
        this.vcr().clear();
        this.renderedViews.clear();

        this.contentData().forEach((data, i) => {
          if (this.itemOffsets[data.id])
            this.itemOffsets[data.id] = {
              index: i,
              offset:
                this.itemOffsets[data.id]?.offset ||
                this.estimatedInitialHeight,
            };
          else
            this.itemOffsets[data.id] = {
              index: i,
              offset: this.estimatedInitialHeight,
              hasToUpdate: true,
            };
        });

        this.lastElementEnd = 0;

        this.handleScroll();
        this.getScrollParent().scrollTop +=
          (change.currentValue.length - change.previousValue.length) *
          this.estimatedInitialHeight;
      }

      let heightToReduce = 0;

      Object.keys(this.itemOffsets).forEach((key) => {
        if (!this.contentData().find((data) => data.id == +key)) {
          const elHeight = this.itemOffsets[+key].offset;

          const elToRemove = this.itemOffsets[+key];

          heightToReduce += elHeight;

          Object.keys(this.itemOffsets).forEach((key2) => {
            if (this.itemOffsets[+key2].index > elToRemove.index)
              this.itemOffsets[+key2].index -= 1;
          });

          delete this.itemOffsets[+key];
        }
      });

      if (heightToReduce == 0) return;

      this.vcr().clear();
      this.renderedViews.clear();

      this.handleScroll();
      this.getScrollParent().scrollTop -= heightToReduce;
    }
  }

  updateElement(id: number, content: HTMLElement) {
    const offset = this.itemOffsets[id];

    if (!offset) return;

    const elHeight = content.offsetHeight;

    if (elHeight == offset.offset) return;
    
    offset.offset = elHeight;

    this.handleScroll();
  }

  private setupInitialLoad(onReset = false): void {
    const parent = this.getScrollParent();
    const viewportHeight = parent.offsetHeight;
    const initialCount = Math.ceil(
      viewportHeight / this.estimatedInitialHeight
    );

    if (!onReset) {
      this.host.style.position = 'relative';
      this.host.style.minHeight =
        initialCount * this.estimatedInitialHeight + 'px';
      this.host.style.maxHeight =
        initialCount * this.estimatedInitialHeight + 'px';
    }

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

      if (this.itemOffsets[this.contentData()[i].id]?.hasToUpdate) {
        this.renderItem(this.contentData()[i].id, i);
        Object.keys(this.itemOffsets).forEach((key) => {
          this.itemOffsets[+key].hasToUpdate = false;
        });
        this.handleScroll();
        break;
      }

      const itemBottom =
        currentOffset + this.getItemHeight(this.contentData()[i].id);

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

    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
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

    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      const el = view.rootNodes.find((el) => el instanceof HTMLElement);

      if (!el) return;

      this.renderedViews.set(id, view);
      this.itemOffsets[id] = {
        index: i,
        offset: el.offsetHeight || this.estimatedInitialHeight,
      };

      el.style.transform = `translateY(${this.calculateItemTop(i)}px)`;
      el.setAttribute('lazy-scroll-element', 'true');

      this.biggestElement = Math.max(
        this.biggestElement,
        this.itemOffsets[id].offset
      );

      if (islast)
        this.lastElementEnd =
          this.calculateItemTop(i) + this.itemOffsets[id].offset;

      this.calcAvarageHeight();
    });
  }

  private calcAvarageHeight() {
    this.estimatedInitialHeight = Math.ceil(
      Object.keys(this.itemOffsets).reduce(
        (sum, h) => sum + this.itemOffsets[+h].offset,
        0
      ) / Object.keys(this.itemOffsets).length
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

  private calculateItemTop(i: number): number {
    let top = 0;

    Object.keys(this.itemOffsets).forEach((key) => {
      if (i > this.itemOffsets[+key].index) top += this.getItemHeight(+key);
    });

    return top;
  }

  private getItemHeight(id: number): number {
    return this.itemOffsets[id]?.offset || this.estimatedInitialHeight;
  }

  private updateContainerHeight(isFirst = false): void {
    const totalHeight = Object.keys(this.itemOffsets).reduce(
      (sum, h) => sum + this.itemOffsets[+h].offset,
      0
    );
    if (
      Object.keys(this.itemOffsets).length == this.contentData().length &&
      this.lastElementEnd > 0
    ) {
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
