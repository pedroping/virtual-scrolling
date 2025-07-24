import { Directive, ElementRef, inject, OnInit } from '@angular/core';

@Directive({
  selector: '[appStaticVirtualScrolling]',
  standalone: true,
})
export class StaticVirtualScrollingDirective implements OnInit {
  private element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  ngOnInit(): void {
    console.log(this.element);

    this.element.addEventListener('scroll', (e) => {
      console.log(e);
    });
  }
}
