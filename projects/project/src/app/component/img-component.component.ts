import { Component, input } from '@angular/core';

@Component({
  selector: 'app-img-component',
  templateUrl: './img-component.component.html',
  styleUrls: ['./img-component.component.scss'],
  standalone: true,
})
export class ImgComponentComponent {
  item = input.required<{ id: number; data: string }>();
}
