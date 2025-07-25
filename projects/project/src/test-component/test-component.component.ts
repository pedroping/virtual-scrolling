import { Component, input, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-test-component',
  templateUrl: './test-component.component.html',
  styleUrls: ['./test-component.component.scss'],
  standalone: true,
})
export class TestComponentComponent implements OnInit, OnDestroy {
  data = input<string>('');

  ngOnInit(): void {
    console.log('Init', this.data());
  }

  ngOnDestroy(): void {
    console.log('Destroy', this.data());
  }
}
