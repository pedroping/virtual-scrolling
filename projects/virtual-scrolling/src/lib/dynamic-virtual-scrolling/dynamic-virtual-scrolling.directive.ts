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

@Directive({
  selector: '[appDynamicVirtualScrolling]',
  standalone: true,
})
export class DynamicVirtualScrollingDirective<T> implements OnInit, OnChanges {
  element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  template = contentChild(TemplateRef);
  vcr = contentChild.required(TemplateRef, { read: ViewContainerRef });
  totalHeight: number = 0;

  startPostion: number = 0;
  endPosition: number = 0;

  contentData = input.required<(T & { id: number })[]>();
  templateRefs = new Map<
    number,
    {
      element: T & { id: number };
      height: number;
      start: number;
      ref: EmbeddedViewRef<unknown>;
      onScreen?: boolean;
    }
  >();

  ngOnInit(): void {
    const initialScrollTop = this.element.parentElement!.scrollTop;
    const initalHeight = this.element.parentElement!.offsetHeight;

    this.startPostion = Math.floor(initialScrollTop);
    this.endPosition = Math.floor(initalHeight + initialScrollTop);

    this.startElements();

    this.element.parentElement!.addEventListener('scroll', (e) => {
      const scrollTop = this.element.parentElement!.scrollTop;
      const height = this.element.parentElement!.offsetHeight;

      this.startPostion = Math.floor(scrollTop);
      this.endPosition = Math.floor(height + scrollTop);

      this.onScroll();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contentData'] && !changes['contentData'].firstChange) {
      let removeChange = false;

      this.templateRefs.forEach((el) => {
        const hasElement = !!this.contentData().find(
          (dataEl) => dataEl.id === el.element.id
        );

        if (!hasElement) {
          const oldRef = this.templateRefs.get(el.element.id);

          this.templateRefs.delete(el.element.id);

          this.templateRefs.forEach((elRef) => {
            if (el.element.id >= elRef.element.id) return;

            oldRef?.start ? (elRef.start -= oldRef.height + 10) : 0;

            elRef.start = Math.max(elRef.start, 10);
          });

          this.element.parentElement!.scrollTop -= oldRef?.height
            ? oldRef.height + 10
            : 0;
          removeChange = true;
        }
      });

      this.setHeight();

      if (removeChange) return this.onScroll();
    }
  }

  setHeight() {
    const first = Array.from(this.templateRefs)[0];

    if (!first?.[1]) return;

    const elemenstsLenght = this.contentData().length;

    this.element.style.minHeight =
      first[1].height * elemenstsLenght + 10 * elemenstsLenght + 10 + 'px';
  }

  startElements() {
    this.clearData();

    const data = this.contentData();

    for (let i = 0; i < data.length; i++) {
      const ref = this.vcr().createEmbeddedView(this.template()!, {
        item: data[i],
      });
      const element = ref.rootNodes[0] as HTMLElement;

      if (i == 0) {
        element.style.top = '10px';

        this.element.style.minHeight =
          element.offsetHeight * data.length + 10 * data.length + 10 + 'px';

        this.templateRefs.set(data[i].id, {
          element: data[i],
          height: element.offsetHeight,
          start: 20,
          onScreen: true,
          ref,
        });

        continue;
      }

      const prevHeight = this.getPrevElmsHeights(Math.max(data[i].id - 1, 0));

      element.style.top = prevHeight + 10 + 'px';

      this.templateRefs.set(data[i].id, {
        element: data[i],
        height: element.offsetHeight,
        start: prevHeight + 10,
        onScreen: true,
        ref,
      });

      const rect = element.getBoundingClientRect();

      if (rect.top > this.endPosition) return;
    }
  }

  onScroll() {
    const data = this.contentData();

    const startIndex = Array.from(this.templateRefs).find(
      ([_, el]) => el.start + el.height >= this.startPostion
    );

    const id = data.findIndex((el) => el.id == startIndex?.[0]);

    const key = id > -1 ? id : Math.max(this.templateRefs.size - 1, 0);

    this.clearData();

    for (let i = key; i < data.length; i++) {
      if (!data[i]) return;
      const el = this.templateRefs.get(data[i].id);

      if (el) {
        if (el.start > this.endPosition) break;

        const ref = this.vcr().createEmbeddedView(this.template()!, {
          item: data[i],
        });
        const element = ref.rootNodes[0] as HTMLElement;
        element.style.top = el.start + 'px';

        if (i === 0) {
          element.style.top = '10px';

          this.templateRefs.set(data[i].id, {
            element: data[i],
            height: element.offsetHeight,
            start: 20,
            onScreen: true,
            ref,
          });
        }

        el.onScreen = true;

        continue;
      }

      const ref = this.vcr().createEmbeddedView(this.template()!, {
        item: data[i],
      });
      const element = ref.rootNodes[0] as HTMLElement;

      const prevHeight = this.getPrevElmsHeights(Math.max(data[i].id - 1, 0));

      element.style.top = prevHeight + 10 + 'px';

      const rect = element.getBoundingClientRect();

      this.templateRefs.set(data[i].id, {
        element: data[i],
        height: element.offsetHeight,
        start: prevHeight + 10,
        onScreen: true,
        ref,
      });

      if (rect.top > this.endPosition) break;
    }
  }

  clearData(remove = true) {
    this.templateRefs.forEach((el) => (el.onScreen = false));
    if (remove) this.vcr().clear();
  }

  getPrevElmsHeights(key: number) {
    let height = 0;

    for (let i = 0; i <= key; i++) {
      const el = this.templateRefs.get(i);
      height += el?.height ? el.height + 10 : 0;
    }

    return height;
  }
}
