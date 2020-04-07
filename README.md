# Element

Simple TypeScript wrapper for creating a Web Component.

```bash
npm install @mdi/element
```

## Basics

To make things easier setup the project assuming the custom element `<hello-world message="Hello World!"></hello-world>`.

```
📂 src/
  📂 hello/
    📂 world/
      📃 world.ts
      📃 world.html
      📃 world.css
📃 rollup.config.js
📃 tsconfig.json
📃 package.json
```

### Class (`world.ts`)

```typescript
import { Component, Prop, Part } from '@mdi/element';

import template from "./world.html";
import style from './world.css';

@Component({
  selector: 'hello-world',
  style,
  template
})
export default class HelloWorld extends HTMLElement {
  @Prop() message = 'Hello World';
  
  @Part() $div: HTMLDivElement;
  
  render() {
    this.$div.innerText = `this.message;
  }
}
```

### Template (`world.html`)

```html
<div part="div">Default!</div>
```

### CSS Styles (`world.css`)

```css
:host {
  display: block;
}
```

## Advanced

Starting with a simple component can allow one to extend it with more features later on. This can be done by extending components.

```
📂 src/
  📂 hello/
    📂 world/
      📃 world.ts
      📃 world.html
      📃 world.css
    📂 worldButton/
      📃 worldButton.ts
      📃 worldButton.html
      📃 worldButton.css
```

```typescript
import { Component, Prop, Part } from '@mdi/element';
import HelloWorld from '../world/world';

import style from './button.css';
import template from './button.html';

@Component({
  selector: 'hello-world-button',
  style,
  template
})
export default class MdiIconTooltip extends MdiIcon {
  @Part() $button: HTMLButtonElement;

  // Example: Custom rendering
  renderCallback() {
    this.$button.addEventListener('click', () => {
      alert(this.message);
    });
  }
}
```

```html
<button part="button">
  <parent/> <!-- <div>Default!</div> -->
</button>
```

```css
[part~=button] {
  border-radius: 0.25rem;
  border: #ddd;
  color: #222;
}
```
