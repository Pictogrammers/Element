# Element

Simple TypeScript wrapper for creating a Web Component.

```bash
npm install @mdi/element
```

## Basics

To make things easier setup the project assuming the custom element `<hello-world>`.

```
src/
  hello/
    world/
      world.ts
      world.html
      world.css
```

### Class (`world.ts`)

```typescript
import { Component, Prop, Part, Bind } from '@mdi/element';

import template from "./world.html";
import style from './world.css';

@Component({
  selector: 'mdi-icon',
  style,
  template
})
export default class HelloWorld extends HTMLElement {
  // Code
}
```

### Template (`world.html`)

```html
<div>Hello World!</div>
```

### CSS Styles (`world.css`)

```css
:host {
  display: block;
}
```

## Advanced

Extending components can let you create building blocks that can be extended.

...
