import {
  AfterViewInit,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  inject,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { StaticVirtualScrollingDirective } from '@virtual-scrolling';
import { take, throttleTime } from 'rxjs';

@Directive({
  selector: '[appStaticElement]',
  standalone: true,
})
export class StaticElementDirective implements AfterViewInit {
  private templateRef = inject(TemplateRef);
  private vcr = inject(ViewContainerRef);
  private staticVirtualScrollingDirective = inject(
    StaticVirtualScrollingDirective
  );
  element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  end?: number;
  start?: number;
  ref?: EmbeddedViewRef<any>;

  ngAfterViewInit(): void {
    this.createElement();
    this.staticVirtualScrollingDirective.startElements$
      .pipe(take(1))
      .subscribe(() => this.setPostion());

    this.staticVirtualScrollingDirective.validatePosition$
      .pipe(throttleTime(5))
      .subscribe(({ endPosition, startPostion }) => {
        if (!this.start || !this.end) return;

        if (this.start > endPosition || this.end < startPostion) {
          this.clearElement();
          return;
        }

        this.createElement();
        this.setPostion();
      });
  }

  clearElement() {
    this.vcr.clear();
    this.ref = undefined;
  }

  setPostion() {
    if (!this.ref) return;

    const rootElement = this.ref.rootNodes[0] as HTMLElement;
    rootElement.id = 'basic-element';
    rootElement.style.position = 'absolute';
    rootElement.style.top = this.start + 'px';
  }

  createElement() {
    if (this.ref) return;

    this.ref = this.vcr.createEmbeddedView(this.templateRef);
    const rootElement = this.ref.rootNodes[0] as HTMLElement;
    rootElement.id = 'basic-element';

    if (!this.start && !this.end) {
      const rect = rootElement.getBoundingClientRect();
      this.start = Math.floor(rect.y);
      this.end = Math.floor(rect.y + rect.height);
    }
  }
}
