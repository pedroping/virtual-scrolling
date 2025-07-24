import {
  AfterViewInit,
  contentChildren,
  Directive,
  ElementRef,
  inject,
  OnInit
} from '@angular/core';
import { StaticElementDirective } from '@virtual-scrolling';
import { Subject } from 'rxjs';

@Directive({
  selector: '[appStaticVirtualScrolling]',
  standalone: true,
})
export class StaticVirtualScrollingDirective implements OnInit, AfterViewInit {
  private element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  staticElements = contentChildren(StaticElementDirective);

  validatePosition$ = new Subject<{
    endPosition: number;
    startPostion: number;
  }>();
  startElements$ = new Subject<void>();

  ngOnInit(): void {
    this.element.parentElement!.addEventListener('scroll', (e) => {
      this.validatedElements();
    });
  }

  ngAfterViewInit(): void {
    const totalHeight = this.element.offsetHeight;
    this.element.style.minHeight = totalHeight + 'px';
    this.element.style.height = totalHeight + 'px';

    this.validatedElements();
    this.startElements$.next();
  }

  validatedElements() {
    const scrollTop = this.element.parentElement!.scrollTop;
    const height = this.element.parentElement!.offsetHeight;

    const startPostion = Math.floor(scrollTop);
    const endPosition = Math.floor(height + scrollTop);

    this.validatePosition$.next({ startPostion, endPosition });
  }
}
