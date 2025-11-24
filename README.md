# Dynamic Virtual Scrolling for Angular

A highly-optimized, directive-based Dynamic Virtual Scrolling implementation for Angular.  
It renders only visible items in the viewport while maintaining correct positioning, dynamic height tracking, and smooth scrolling — ideal for large datasets with variable-height elements.

This implementation supports:

- Variable-height elements  
- Top/bottom data insertion  
- Automatic height recalculation  
- Smooth scroll handling  
- Extremely efficient DOM usage  
- Full template customization  
- Drop-in directive usage  

---

## 🚀 Features

- **Dynamic height measurement** with `ResizeObserver`
- **Minimal DOM footprint**: only visible items are rendered
- **Insertion/removal support** at both top and bottom
- **Accurate scroll compensation** on dynamic operations
- **Template-driven rendering**
- **Ideal for infinite lists, galleries, media feeds, and dashboards**

---

## 📦 Installation

Just import the directive into your Angular component/module:

```ts
import { DynamicVirtualScrollingDirective } from './dynamic-virtual-scrolling.directive';
````

If using standalone components:

```ts
@component({
  standalone: true,
  imports: [DynamicVirtualScrollingDirective]
})
export class MyComponent {}
````

## 🧩 Usage

Template Example

```ts
<div class="virtual-scrolling" [dynamicVirtualScrolling]="data()">
  <ng-template #tmp let-item="item">
    <app-img-component [item]="item" />
  </ng-template>
</div>

<button (click)="changeData2()">Remove data Top</button>
<button (click)="changeData()">Remove data Bottom</button>
<button (click)="addData()">Add data Top</button>
<button (click)="addData2()">Add data Bottom</button>
````

Required Data Format

Each item must include a unique numeric id:

```ts
{
  id: 1,
  url: '...',
  description: '...'
}
```

## 🛠️ How It Works

- The directive calculates and maintains for each item:
- Its index
- Its height
- Its cumulative vertical offset

When items enter the viewport area, they are inserted into the DOM.
When they leave the viewport, they are detached, not destroyed, for performance.

Key Techniques
- ResizeObserver to handle dynamic height changes
- auditTime(20ms) for scroll event throttling
- NgZone onStable to batch DOM operations
- transform: translateY(...) for pixel-perfect positioning without reflow

## 🧪 Demo Actions

| Button            | Behavior                                         |
| ----------------- | ------------------------------------------------ |
| **Add Top**       | Prepends new items smoothly                      |
| **Add Bottom**    | Appends new items (infinite scroll style)        |
| **Remove Top**    | Removes the first items and recalculates offsets |
| **Remove Bottom** | Removes from the bottom and updates height       |

## ⚙️ Internal Configuration

| Property                 | What it controls              | Default |
| ------------------------ | ----------------------------- | ------- |
| `estimatedInitialHeight` | Height guess for unseen items | `300`   |
| `biggestElement`         | Pre-render buffer             | `150`   |
| Scroll audit time        | Event throttling              | `20ms`  |

## 📈 Performance Tips

- Always provide unique id values
- Prefer ChangeDetectionStrategy.OnPush in item components
- Avoid heavy logic inside the scroll template
- Fix element widths when possible for more stable height measurement
