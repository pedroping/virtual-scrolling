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
import { fromEvent, Subject } from 'rxjs';
import { auditTime, take } from 'rxjs/operators';

type IElement<T> = T & { id: number };

@Directive({
  selector: '[appDynamicVirtualScrolling]',
  standalone: true,
})
export class DynamicVirtualScrollingDirective<T> implements OnInit, OnChanges {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly ngZone = inject(NgZone);
  templateRef = contentChild.required(TemplateRef);
  vcr = contentChild.required(TemplateRef, { read: ViewContainerRef });

  contentData = input.required<IElement<T>[]>();

  estimatedInitialHeight = 300;
  biggestElement = 350;
  lastHeight = 0;
  lastElementEnd = 0;

  private loadEvent$ = new Subject<number>();
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
        this.ngZone.onStable.pipe(take(1)).subscribe(() => this.handleScroll());

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

          const view = this.renderedViews.get(+key);
          if (view) view.destroy();
          this.renderedViews.delete(+key);
          delete this.itemOffsets[+key];
        }
      });

      if (heightToReduce > 0) {
        this.ngZone.onStable.pipe(take(1)).subscribe(() => {
          this.handleScroll();
          this.getScrollParent().scrollTop -= heightToReduce;
        });
      }
    }
  }

  updateElement(id: number) {
    this.loadEvent$.next(id);
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

  private handleScroll(startIndex = 0) {
    const parent = this.getScrollParent();
    const scrollTop = parent.scrollTop;
    const viewportHeight = parent.offsetHeight;

    const start = scrollTop;
    const end = scrollTop + viewportHeight;

    let currentOffset = 0;

    for (let i = startIndex; i < this.contentData().length; i++) {
      const id = this.contentData()[i].id;
      const itemTop = currentOffset;

      if (this.itemOffsets[id]?.hasToUpdate) {
        this.renderItem(id, i);
        Object.keys(this.itemOffsets).forEach((key) => {
          this.itemOffsets[+key].hasToUpdate = false;
        });

        this.ngZone.onStable.pipe(take(1)).subscribe(() => this.handleScroll());
        break;
      }

      const itemBottom = currentOffset + this.getItemHeight(id);
      const isVisible =
        itemBottom >= start - this.biggestElement &&
        itemTop <= end + this.biggestElement;

      if (isVisible) {
        this.renderItem(id, i);
      } else {
        this.detachItem(id);
      }

      currentOffset = itemBottom;
    }

    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      this.updateContainerHeight();
    });
  }

  private renderItem(id: number, i: number) {
    const dataEl = this.contentData().find((el) => el.id === id);
    const isLast = dataEl === this.contentData()[this.contentData().length - 1];
    if (!dataEl) return;

    let view = this.renderedViews.get(id);

    if (view) {
      if (this.vcr().indexOf(view) === -1) {
        this.vcr().insert(view);
      }
      view.context.item = dataEl;
      view.detectChanges();

      this.ngZone.onStable.pipe(take(1)).subscribe(() => {
        this.setItemProperties(view!, id, i, isLast);
      });
      return;
    }

    view = this.vcr().createEmbeddedView(this.templateRef(), {
      item: dataEl,
    });
    this.renderedViews.set(id, view);

    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      this.setItemProperties(view!, id, i, isLast);
    });

    const subscription = this.loadEvent$.subscribe((evId) => {
      if (evId === id) {
        subscription.unsubscribe();
        this.setItemProperties(view!, id, i, isLast);

        Object.keys(this.itemOffsets).forEach((key) => {
          if (
            this.itemOffsets[+key].index <= i ||
            !this.renderedViews.get(+key)
          )
            return;

          this.setItemProperties(
            this.renderedViews.get(+key)!,
            +key,
            this.itemOffsets[+key].index,
            false
          );
        });
      }
    });
  }

  setItemProperties(
    view: EmbeddedViewRef<any>,
    id: number,
    i: number,
    isLast: boolean
  ) {
    const el = view.rootNodes.find(
      (el) => el instanceof HTMLElement
    ) as HTMLElement;
    if (!el) return;

    const height = el.offsetHeight;
    if (!height || height <= 0) {
      this.ngZone.onStable.pipe(take(1)).subscribe(() => {
        this.setItemProperties(view, id, i, isLast);
      });
      return;
    }

    this.itemOffsets[id] = {
      index: i,
      offset: height,
    };

    el.style.transform = `translateY(${this.calculateItemTop(i)}px)`;
    el.setAttribute('lazy-scroll-element', 'true');

    this.biggestElement = Math.max(
      this.biggestElement,
      this.itemOffsets[id].offset
    );

    if (isLast) {
      this.lastElementEnd =
        this.calculateItemTop(i) + this.itemOffsets[id].offset;
    }

    this.calcAvarageHeight();
  }

  private detachItem(id: number) {
    const view = this.renderedViews.get(id);
    if (!view) return;

    const el = view.rootNodes.find(
      (el) => el instanceof HTMLElement
    ) as HTMLElement;
    if (el) el.style.transform = '';

    const index = this.vcr().indexOf(view);
    if (index > -1) {
      this.vcr().detach(index);
    }
  }

  private calcAvarageHeight() {
    const values = Object.values(this.itemOffsets);
    this.estimatedInitialHeight = Math.ceil(
      values.reduce((sum, h) => sum + h.offset, 0) / values.length
    );
  }

  private calculateItemTop(i: number): number {
    let top = 0;
    const sorted = Object.values(this.itemOffsets).sort(
      (a, b) => a.index - b.index
    );
    for (const item of sorted) {
      if (i > item.index) {
        top += item.offset;
      }
    }
    return top;
  }

  private getItemHeight(id: number): number {
    return this.itemOffsets[id]?.offset || this.estimatedInitialHeight;
  }

  private updateContainerHeight(isFirst = false): void {
    const parent = this.getScrollParent();
    const totalHeight = Math.max(
      Object.values(this.itemOffsets).reduce((sum, h) => sum + h.offset, 0),
      parent.scrollHeight
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
        Math.ceil(totalHeight * 0.2)
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
