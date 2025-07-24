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
  totalHeight: number = 0;

  startPostion: number = 0;
  endPosition: number = 0;
  templateRefs = new Map<number, EmbeddedViewRef<unknown>>();

  constructor() {
    effect(() => {
      this.createData(this.contentData()['data']);
    });
  }

  ngOnInit(): void {
    const initialScrollTop = this.element.parentElement!.scrollTop;
    const initalHeight = this.element.parentElement!.offsetHeight;

    this.startPostion = Math.floor(initialScrollTop);
    this.endPosition = Math.floor(initalHeight + initialScrollTop);

    this.element.parentElement!.addEventListener('scroll', (e) => {
      const scrollTop = this.element.parentElement!.scrollTop;
      const height = this.element.parentElement!.offsetHeight;

      this.startPostion = Math.floor(scrollTop);
      this.endPosition = Math.floor(height + scrollTop);

      this.onScrolEvent();
    });
  }

  onScrolEvent() {
    const data = this.contentData()['data'];

    this.vcr().clear();


    const defaultRef = this.vcr().createEmbeddedView(this.template()!, {
      item: data[0],
    });
    (defaultRef.rootNodes[0] as HTMLElement).style.position = 'absolute';
    (defaultRef.rootNodes[0] as HTMLElement).style.top = '0px';

    this.templateRefs.set(0, defaultRef);

    

    for (let i = 0; i < data.length; i++) {
      const prevElementRef = this.templateRefs.get(i - 1);

      if (!prevElementRef) {
        continue;
      }

      const element = prevElementRef.rootNodes[0] as HTMLElement;

      const elementTop =
        element.offsetHeight +
        10 +
        Number(element.style.top?.replace('px', '') || '');
      const elementEnd = elementTop + element.offsetHeight;

      if (elementTop < this.endPosition) {
        if (elementEnd < this.startPostion) {
          console.log(
            elementTop,
            elementEnd,
            this.startPostion,
            this.endPosition,
            data[i]
          );
          this.templateRefs.delete(i);
          continue;
        }

        const ref = this.vcr().createEmbeddedView(this.template()!, {
          item: data[i],
        });
        (ref.rootNodes[0] as HTMLElement).style.position = 'absolute';
        (ref.rootNodes[0] as HTMLElement).style.top = elementTop + 'px';

        this.templateRefs.set(i, ref);
        continue;
      }

      break;
    }
  }

  createData(data: T[]) {
    if (data.length == 0) return;

    const first = data[0];

    const defaultRef = this.vcr().createEmbeddedView(this.template()!, {
      item: first,
    });

    const rootElement = defaultRef.rootNodes[0] as HTMLElement;
    rootElement.id = 'basic-element';
    const rect = rootElement.getBoundingClientRect();

    const height = Math.floor(rect.height * data.length + 10 * data.length);

    this.element.style.height = height + 'px';
    this.element.style.minHeight = height + 'px';

    (defaultRef.rootNodes[0] as HTMLElement).style.position = 'absolute';
    (defaultRef.rootNodes[0] as HTMLElement).style.top = '0px';

    this.templateRefs.set(0, defaultRef);

    for (let i = 1; i < data.length; i++) {
      console.log(this.templateRefs, i);

      const prevElementRef = this.templateRefs.get(i - 1);

      if (!prevElementRef) {
        continue;
      }

      const ref = this.vcr().createEmbeddedView(this.template()!, {
        item: data[i],
      });
      const element = prevElementRef.rootNodes[0] as HTMLElement;

      (ref.rootNodes[0] as HTMLElement).style.position = 'absolute';

      const elementTop =
        element.offsetHeight +
        10 +
        Number(element.style.top?.replace('px', '') || '');
      const elementEnd = elementTop + element.offsetHeight;

      console.log(elementTop, elementEnd, this.startPostion, this.endPosition);

      (ref.rootNodes[0] as HTMLElement).style.top = elementTop + 'px';

      if (elementTop < this.endPosition) {
        this.templateRefs.set(i, ref);
        continue;
      }

      this.vcr().remove(this.vcr().indexOf(ref));
      break;
    }
  }
}
