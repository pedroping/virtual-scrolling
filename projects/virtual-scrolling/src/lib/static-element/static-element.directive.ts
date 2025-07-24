import {
  Directive,
  inject,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

@Directive({
  selector: '[appStaticElement]',
  standalone: true,
})
export class StaticElementDirective implements OnInit {
  private templateRef = inject(TemplateRef);
  private vcr = inject(ViewContainerRef);

  ngOnInit(): void {
    this.vcr.createEmbeddedView(this.templateRef);
  }
}
