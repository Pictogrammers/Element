import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';

import {
  Component, Prop, Part, forEach,
  getProps, selectComponent,
} from "./element";

describe("forEach", () => {

  const HELLO_ITEM = 'hello-item';

  @Component({
    selector: HELLO_ITEM,
    template: '<span part="count"></span>'
  })
  class HelloItem extends HTMLElement {
    @Prop() count: number = 0;
    @Part() $count: HTMLSpanElement;

    render() {
      this.$count.textContent = `${this.count}`;
    }
  }

  const HELLO_WORLD = 'hello-world';

  @Component({
    selector: HELLO_WORLD,
    template: '<div part="list"></div>'
  })
  class HelloWorld extends HTMLElement {
    @Prop() items: any[] = [];
    @Part() $list: HTMLDivElement;

    connectedCallback() {
      forEach({
        container: this.$list,
        items: this.items,
        type() {
          return HelloItem;
        }
      })
    }
  }

  beforeEach(() => {
    var c = document.createElement(HELLO_WORLD);
    document.body.appendChild(c);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('should be registered', () => {
    expect(customElements.get(HELLO_ITEM)).toBeDefined();
    expect(customElements.get(HELLO_WORLD)).toBeDefined();
  });

  test("initial render", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    expect($list.children.length).toBe(0);
  });

  test("items.push", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items.push({ count: 1 });
    expect($list.children.length).toBe(1);
  });

  test("items.push item reactivity", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    component.items.push({ count: 0 });
    const { $list } = component;
    component.items[0].count = 2;
    const firstItem = $list.children[0] as HelloItem;
    expect(firstItem.count).toBe(2);
    const { $count } = firstItem;
    expect($count.textContent).toBe('2');
  });

});

describe("forEach nested", () => {

  const HELLO_RECURSIVE = 'hello-recursive';

  @Component({
    selector: HELLO_RECURSIVE,
    template: '<div part="label"></div><div part="list"></div>'
  })
  class HelloRecursive extends HTMLElement {
    @Prop() label: string = '';
    @Prop() items: any[] = [];

    @Part() $label: HTMLDivElement;
    @Part() $list: HTMLDivElement;

    connectedCallback() {
      forEach({
        container: this.$list,
        items: this.items,
        type() {
          return HelloRecursive;
        }
      })
    }

    render() {
      this.$label.textContent = this.label;
    }
  }

  beforeEach(() => {
    var c = document.createElement(HELLO_RECURSIVE);
    document.body.appendChild(c);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('should be registered', () => {
    expect(customElements.get(HELLO_RECURSIVE)).toBeDefined();
  });

  test("items.push", () => {
    const component = selectComponent<HelloRecursive>(HELLO_RECURSIVE);
    const { $list } = component;
    component.items.push({
      label: 'Item 1',
      items: [{ label: 'Sub Item' }]
    });
    expect($list.children.length).toBe(1);
    const { $list: $subList } = $list.children[0] as HelloRecursive;
    expect($subList.children.length).toBe(1);
  });

});