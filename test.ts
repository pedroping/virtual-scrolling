import {
  contentChild,
  Directive,
  effect,
  ElementRef,
  EmbeddedViewRef,
  inject,
  input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

@Directive({
  selector: '[appDynamicVirtualScrolling]',
  standalone: true,
})
export class DynamicVirtualScrollingDirective<T> implements OnInit {
  element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  contentData = input.required<{ [key: string]: T[] }>();

  template = contentChild(TemplateRef);
  vcr = contentChild.required(TemplateRef, { read: ViewContainerRef });

  totalHeight = 0;
  itemHeight = 0;
  spacing = 10;

  startPosition = 0;
  endPosition = 0;

  templateRefs = new Map<number, EmbeddedViewRef<any>>();

  private scrollContainer!: HTMLElement;

  constructor() {
    effect(() => {
      const data = this.contentData()['data'];
      if (data?.length) {
      }
    });
  }

  ngOnInit(): void {
    this.scrollContainer = this.element.parentElement!;
    this.scrollContainer.addEventListener(
      'scroll',
      this.onScrollEvent.bind(this)
    );

    this.initialize(this.contentData()['data']);
  }

  initialize(data: T[]) {
    if (!data.length || !this.template()) return;

    const sampleView = this.vcr().createEmbeddedView(this.template()!, {
      item: data[0],
    });
    const sampleElement = sampleView.rootNodes[0] as HTMLElement;

    this.itemHeight = sampleElement.offsetHeight + this.spacing;
    this.vcr().clear();

    this.totalHeight = this.itemHeight * data.length;
    this.element.style.height = `${this.totalHeight}px`;
    this.element.style.minHeight = `${this.totalHeight}px`;

    this.startPosition = Math.floor(this.scrollContainer.scrollTop);
    this.endPosition = Math.floor(
      this.scrollContainer.offsetHeight + this.startPosition
    );

    this.renderVisibleItems(data);
  }

  onScrollEvent() {
    const data = this.contentData()['data'];
    this.startPosition = Math.floor(this.scrollContainer.scrollTop);
    this.endPosition = Math.floor(
      this.scrollContainer.offsetHeight + this.startPosition
    );

    this.renderVisibleItems(data);
  }

  renderVisibleItems(data: T[]) {
    const startIndex = Math.floor(this.startPosition / this.itemHeight);
    const endIndex = Math.min(
      data.length,
      Math.ceil(this.endPosition / this.itemHeight)
    );

    this.vcr().clear();
    this.templateRefs.clear();

    for (let i = startIndex; i < endIndex; i++) {
      const view = this.vcr().createEmbeddedView(this.template()!, {
        item: data[i],
      });
      const node = view.rootNodes[0] as HTMLElement;

      node.style.position = 'absolute';
      node.style.top = `${i * this.itemHeight}px`;

      this.templateRefs.set(i, view);
    }
  }
}
