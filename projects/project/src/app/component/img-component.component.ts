import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-img-component',
  templateUrl: './img-component.component.html',
  styleUrls: ['./img-component.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImgComponentComponent {
  imageSizes = ['100', '200', '300', '400', '500', '600', '700', '900', '1000'];

  randomSize = signal(this.imageSizes[Math.floor(Math.random() * 9)]);
  item = input.required<{ id: number; data: string }>();
}
