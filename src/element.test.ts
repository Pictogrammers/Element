import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';

import {
  Component, Prop, Part,
  getProps, selectComponent
} from "./element";

describe("createElement", () => {

  const HELLO_WORLD = 'hello-world';

  @Component({
    selector: HELLO_WORLD,
    template: '<span part="count"></span>'
  })
  class HelloWorld extends HTMLElement {
    @Prop() count: number = 0;
    @Part() $count: HTMLSpanElement;

    render() {
      this.$count.textContent = `${this.count}`;
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
    expect(customElements.get(HELLO_WORLD)).toBeDefined();
  });

  test('should only expose known props', () => {
    const props = getProps(HELLO_WORLD);
    expect(props.length).toBe(1);
    expect(props).toContain('count');
  });

  test('should only expose known parts', () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $count } = component;
    expect($count).toBeDefined();
  });

  test("initial render", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $count } = component;
    expect(component.count).toBe(0);
    expect($count.textContent).toBe('0');
  });

  test("second render", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $count } = component;
    component.count = 1;
    expect(component.count).toBe(1);
    expect($count.textContent).toBe('1');
  });

});
