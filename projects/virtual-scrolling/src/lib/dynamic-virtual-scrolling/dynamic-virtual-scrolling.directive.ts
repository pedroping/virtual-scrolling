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

@Directive({
  selector: '[appDynamicVirtualScrolling]',
  standalone: true,
})
export class DynamicVirtualScrollingDirective<T> implements OnInit {
  element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  contentData = input.required<{ [key: string]: T[] }>();

  template = contentChild(TemplateRef);
  vcr = contentChild.required(TemplateRef, { read: ViewContainerRef });
  totalHeight: number = 0;

  startPostion: number = 0;
  endPosition: number = 0;
  templateHeights = new Map<number, { height: number; start: number }>();

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

  startElements() {
    const data = this.contentData()['data'];

    for (let i = 0; i < data.length; i++) {
      const ref = this.vcr().createEmbeddedView(this.template()!, {
        item: data[i],
      });
      const element = ref.rootNodes[0] as HTMLElement;

      if (i == 0) {
        element.style.top = '10px';
        this.element.style.minHeight =
          element.offsetHeight * data.length + 10 * data.length + 10 + 'px';
        this.templateHeights.set(i, {
          height: element.offsetHeight,
          start: 10,
        });

        continue;
      }

      const prevHeight = this.getPrevElmsHeights(i - 1);
      element.style.top = prevHeight + 10 + 'px';

      this.templateHeights.set(i, {
        height: element.offsetHeight,
        start: prevHeight + 10,
      });

      const rect = element.getBoundingClientRect();

      if (rect.top > this.endPosition) return;
    }
  }

  onScroll() {
    const data = this.contentData()['data'];

    const startIndex = Array.from(this.templateHeights).find(
      ([_, el]) => el.start + el.height >= this.startPostion
    );

    const key = startIndex?.[0] ?? this.templateHeights.size - 1;

    this.vcr().clear();

    for (let i = key; i < data.length; i++) {
      const el = this.templateHeights.get(i);

      if (el) {
        if (el.start > this.endPosition) break;

        const ref = this.vcr().createEmbeddedView(this.template()!, {
          item: data[i],
        });
        const element = ref.rootNodes[0] as HTMLElement;
        element.style.top = el.start + 'px';

        continue;
      }

      const ref = this.vcr().createEmbeddedView(this.template()!, {
        item: data[i],
      });
      const element = ref.rootNodes[0] as HTMLElement;

      const prevHeight = this.getPrevElmsHeights(i - 1);
      element.style.top = prevHeight + 10 + 'px';

      const rect = element.getBoundingClientRect();

      if (rect.top > this.endPosition) break;

      this.templateHeights.set(i, {
        height: element.offsetHeight,
        start: prevHeight + 10,
      });
    }
  }

  getPrevElmsHeights(key: number) {
    let height = 0;

    for (let i = 0; i <= key; i++)
      height += (this.templateHeights.get(i)?.height ?? 0) + 10;

    return height;
  }
}
