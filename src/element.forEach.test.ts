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
    @Prop() index: number;
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

  test("items.fill", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 1, bar: 'hmm' }];
    expect($list.children.length).toBe(1);
    const item = $list.children[0] as HelloItem;
    expect(item.$count.textContent).toBe('1');
    component.items.fill({ count: 2, foo: 'hmm' });
    expect($list.children.length).toBe(1);
    expect(item.$count.textContent).toBe('2');
    expect(($list.children[0] as HelloItem).index).toBe(0);
  });

  test("items.pop", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 1 }, { count: 2 }];
    expect($list.children.length).toBe(2);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    expect(($list.children[1] as HelloItem).index).toBe(1);
    component.items.pop();
    expect($list.children.length).toBe(1);
    expect(($list.children[0] as HelloItem).count).toBe(1);
    expect(($list.children[0] as HelloItem).index).toBe(0);
  });

  test("items.push", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 9 }];
    expect($list.children.length).toBe(1);
    expect(($list.children[0] as HelloItem).count).toBe(9);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    component.items.push({ count: 1 });
    expect($list.children.length).toBe(2);
    expect(($list.children[0] as HelloItem).count).toBe(9);
    expect(($list.children[1] as HelloItem).count).toBe(1);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    expect(($list.children[1] as HelloItem).index).toBe(1);
  });

  test("items.shift", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 1 }, { count: 2 }];
    expect($list.children.length).toBe(2);
    component.items.shift();
    expect($list.children.length).toBe(1);
    expect(($list.children[0] as HelloItem).count).toBe(2);
    expect(($list.children[0] as HelloItem).index).toBe(0);
  });

  test("items.unshift", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 9 }];
    expect($list.children.length).toBe(1);
    component.items.unshift({ count: 1 });
    expect($list.children.length).toBe(2);
    expect(($list.children[0] as HelloItem).count).toBe(1);
    expect(($list.children[1] as HelloItem).count).toBe(9);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    expect(($list.children[1] as HelloItem).index).toBe(1);
  });

  test("items.splice", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 6 }, { count: 7 }, { count: 9 }];
    expect($list.children.length).toBe(3);
    component.items.splice(1, 1, { count: 77 }, { count: 88 });
    expect($list.children.length).toBe(4);
    expect(($list.children[0] as HelloItem).count).toBe(6);
    expect(($list.children[1] as HelloItem).count).toBe(77);
    expect(($list.children[2] as HelloItem).count).toBe(88);
    expect(($list.children[3] as HelloItem).count).toBe(9);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    expect(($list.children[1] as HelloItem).index).toBe(1);
    expect(($list.children[2] as HelloItem).index).toBe(2);
    expect(($list.children[3] as HelloItem).index).toBe(3);
  });

  test("items.push item reactivity", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    component.items.push({ count: 0 });
    const { $list } = component;
    component.items[0].count = 2;
    const firstItem = $list.children[0] as HelloItem;
    expect(firstItem.count).toBe(2);
    expect(firstItem.index).toBe(0);
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

    render(changes: any) {
      if (changes.label) {
        this.$label.textContent = this.label;
      }
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

  test("items with nested items", () => {
    const component = selectComponent<HelloRecursive>(HELLO_RECURSIVE);
    const { $list } = component;
    component.items = [{
      label: 'Item 1',
      items: [{ label: 'Sub Item' }]
    }];
    expect($list.children.length).toBe(1);
    const { $list: $subList } = $list.children[0] as HelloRecursive;
    expect($subList.children.length).toBe(1);
    component.items[0].items[0].label = 'updated sub item';
    const { $label: $subLabel } = $subList.children[0] as HelloRecursive;
    expect($subLabel.textContent).toBe('updated sub item');
  });

});

describe("forEach double binding", () => {

  const HELLO_MULTI_ITEM = 'hello-multi-item';

  @Component({
    selector: HELLO_MULTI_ITEM,
    template: '<div part="label"></div>'
  })
  class HelloMultiItem extends HTMLElement {
    @Prop() label: string = '';

    @Part() $label: HTMLDivElement;

    render(changes: any) {
      if (changes.label) {
        this.$label.textContent = this.label;
      }
    }
  }

  const HELLO_MULTI = 'hello-multi';

  @Component({
    selector: HELLO_MULTI,
    template: '<div part="list"></div>'
  })
  class HelloMulti extends HTMLElement {
    @Prop() items: any[] = [];

    @Part() $list: HTMLDivElement;

    connectedCallback() {
      forEach({
        container: this.$list,
        items: this.items,
        type() {
          return HelloMultiItem;
        }
      })
    }
  }

  beforeEach(() => {
    var c1 = document.createElement(HELLO_MULTI);
    document.body.appendChild(c1);
    var c2 = document.createElement(HELLO_MULTI);
    document.body.appendChild(c2);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('should be registered', () => {
    expect(customElements.get(HELLO_MULTI)).toBeDefined();
    expect(customElements.get(HELLO_MULTI_ITEM)).toBeDefined();
  });

  test("bind the same data to 2 components", () => {
    const singleton = [{
      label: 'Hello World 1!'
    }];
    const components = Array.from(document.querySelectorAll(HELLO_MULTI)) as HelloMulti[];
    const c1 = components[0];
    const c2 = components[1];
    c1.$list.dataset.test = 'first';
    c2.$list.dataset.test = 'second';
    components.forEach((component) => {
      component.items = singleton;
    });
    // Verify item rendered
    const c1_1 = c1.$list.children[0] as HelloMultiItem;
    expect(c1_1.$label.textContent).toBe('Hello World 1!');
    const c2_1 = c2.$list.children[0] as HelloMultiItem;
    expect(c2_1.$label.textContent).toBe('Hello World 1!');
    // Push 1 more item
    c1.items.push({
      label: 'Hello World 2!'
    });
    // Verify rendered new item
    const c1_2 = c1.$list.children[1] as HelloMultiItem;
    expect(c1_2.$label.textContent).toBe('Hello World 2!');
    const c2_2 = c2.$list.children[1] as HelloMultiItem;
    expect(c2_2.$label.textContent).toBe('Hello World 2!');
  });

});
