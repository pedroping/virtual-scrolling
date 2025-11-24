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
import { fromEvent, timer } from 'rxjs';
import { auditTime, take } from 'rxjs/operators';

type IElement<T> = T & { id: number };

@Directive({
  selector: '[dynamicVirtualScrolling]',
  standalone: true,
})
export class DynamicVirtualScrollingDirective<T> implements OnInit, OnChanges {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly ngZone = inject(NgZone);
  templateRef = contentChild.required(TemplateRef);
  vcr = contentChild.required(TemplateRef, { read: ViewContainerRef });

  contentData = input.required<IElement<T>[]>({
    alias: 'dynamicVirtualScrolling',
  });

  estimatedInitialHeight = 300;
  biggestElement = 150;
  lastHeight = 0;
  lastElementEnd = 0;
  scrollBlock = false;

  private renderedViews = new Map<number, EmbeddedViewRef<any>>();
  private itemOffsets: {
    [key: number]: {
      index: number;
      offset: number;
      hasToUpdate?: boolean;
      canRemove?: boolean;
    };
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
      const newContentData = this.contentData();
      const oldItemOffsets = this.itemOffsets;
      this.itemOffsets = {};

      let hasNewItems = false;

      newContentData.forEach((data, i) => {
        const existingOffset = oldItemOffsets[data.id]?.offset;

        const offset = existingOffset || this.estimatedInitialHeight;

        this.itemOffsets[data.id] = {
          index: i,
          offset: offset,
          hasToUpdate: existingOffset === undefined,
          canRemove: true,
        };

        if (existingOffset === undefined) {
          hasNewItems = true;
        }
      });

      if (changes['contentData'].firstChange) return;

      Object.keys(oldItemOffsets).forEach((key) => {
        const id = +key;
        if (!this.itemOffsets[id]) {
          const view = this.renderedViews.get(id);
          if (view) view.destroy();
          this.renderedViews.delete(id);
        }
      });

      if (
        hasNewItems ||
        newContentData.length < changes['contentData'].previousValue.length
      ) {
        this.lastElementEnd = 0;

        this.handleScroll();

        this.ngZone.onStable.pipe(take(1)).subscribe(() => {
          this.handleScroll();
        });
      } else {
        this.handleScroll();
      }
    }
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
        if (this.itemOffsets[id]) this.itemOffsets[id].canRemove = true;
      });
      return;
    }

    view = this.vcr().createEmbeddedView(this.templateRef(), {
      item: dataEl,
    });
    this.renderedViews.set(id, view);

    let initialHeight = this.estimatedInitialHeight;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!entry.contentRect.height) continue;

        if (initialHeight != entry.contentRect.height) {
          initialHeight = entry.contentRect.height;
          this.changeElementProperties(view, id, i, isLast);
          return;
        }
      }
    });

    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      const el = view.rootNodes.find(
        (el) => el instanceof HTMLElement
      ) as HTMLElement;

      initialHeight = el.offsetHeight;
      this.setItemProperties(view!, id, i, isLast);

      observer.observe(el);

      this.itemOffsets[id].canRemove = true;
    });
  }

  changeElementProperties(
    view: EmbeddedViewRef<any>,
    id: number,
    i: number,
    isLast: boolean
  ) {
    this.setItemProperties(view!, id, i, isLast);

    Object.keys(this.itemOffsets).forEach((key) => {
      if (!this.renderedViews.get(+key)) return;

      this.setItemProperties(
        this.renderedViews.get(+key)!,
        +key,
        this.itemOffsets[+key].index,
        false
      );
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
    const itemOffset = this.itemOffsets[id];

    if (!view || !itemOffset) return;

    if (!itemOffset?.canRemove) return;

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

    const diffHeight = Math.min(this.contentData().length / 5, 15);

    if (isFirst) {
      this.lastHeight = totalHeight + diffHeight * this.estimatedInitialHeight;
      this.host.style.minHeight = `${this.lastHeight}px`;
      this.host.style.maxHeight = `${this.lastHeight}px`;
      return;
    }

    if (
      Math.ceil(parent.offsetHeight + parent.scrollTop) >= parent.scrollHeight
    ) {
      if (this.scrollBlock) return;

      this.scrollBlock = true;

      timer(100).subscribe(() => {
        if (
          Math.ceil(parent.offsetHeight + parent.scrollTop) <
          parent.scrollHeight
        )
          return;

        const moreSize = Math.min(
          diffHeight * this.estimatedInitialHeight,
          Math.ceil(totalHeight * 0.15)
        );
        this.lastHeight = totalHeight + moreSize;

        this.host.style.minHeight = `${this.lastHeight}px`;
        this.host.style.maxHeight = `${this.lastHeight}px`;
        this.scrollBlock = false;
      });
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
