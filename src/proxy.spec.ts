import { describe, expect, test, jest } from '@jest/globals';

import { createProxy, addObserver, removeObserver } from "./proxy"

const ele = document.createElement('div');

describe("createProxy", () => {
  test("addObserver array fill", () => {
    const items = [{
      label: 'Item 1',
      value: 'item1'
    }];
    const proxy = createProxy(items);
    const observer = jest.fn();
    proxy[addObserver](ele, observer);
    proxy.fill(
      { label: 'Item 2', value: 'item2' }
    );
    expect(observer).toBeCalledTimes(1);
    expect(observer).toBeCalledWith();
  });

  test("addObserver array pop", () => {
    const items = [{
      label: 'Item 1',
      value: 'item1'
    }];
    const proxy = createProxy(items);
    const observer = jest.fn();
    proxy[addObserver](ele, observer);
    proxy.pop();
    expect(proxy.length).toBe(0);
    expect(observer).toBeCalledTimes(1);
    expect(observer).toBeCalledWith();
  });

  test("addObserver array push", () => {
    const items = [{
      label: 'Item 1',
      value: 'item1'
    }];
    const proxy = createProxy(items);
    const observer = jest.fn();
    proxy[addObserver](ele, observer);
    proxy.push(
      { label: 'Item 2', value: 'item2' },
      { label: 'Item 3', value: 'item3' }
    );
    expect(observer).toBeCalledTimes(1);
    expect(observer).toBeCalledWith();
  });

  test("addObserver array reverse", () => {
    const items = [{
      label: 'Item 1',
      value: 'item1'
    }, {
      label: 'Item 2',
      value: 'item2'
    }];
    const proxy = createProxy(items);
    const observer = jest.fn();
    proxy[addObserver](ele, observer);
    proxy.reverse();
    expect(proxy.length).toBe(2);
    expect(observer).toBeCalledTimes(1);
    expect(observer).toBeCalledWith();
  });

  test("addObserver array shift", () => {
    const items = [{
      label: 'Item 1',
      value: 'item1'
    }, {
      label: 'Item 2',
      value: 'item2'
    }];
    const proxy = createProxy(items);
    const observer = jest.fn();
    proxy[addObserver](ele, observer);
    proxy.shift();
    expect(proxy.length).toBe(1);
    expect(observer).toBeCalledTimes(1);
    expect(observer).toBeCalledWith();
  });

  test("removeObserver array push", () => {
    const items = [{
      label: 'Item 1',
      value: 'item1'
    }];
    const proxy = createProxy(items);
    const observer = jest.fn();
    proxy[addObserver](ele, observer);
    proxy[removeObserver](ele);
    proxy.push({ label: 'Item 2', value: 'item2' });
    expect(observer).not.toBeCalled();
  });

  test("removeObserver array push", () => {
    const items = [{
      label: 'Item 1',
      value: 'item1'
    }];
    const proxy = createProxy(items);
    const observer = jest.fn();
    proxy[addObserver](ele, observer);
    proxy[removeObserver](ele);
    proxy.push({ label: 'Item 2', value: 'item2' });
    expect(observer).not.toBeCalled();
  });

  test("addObserver object", () => {
    const items = [{
      label: 'Item 1',
      value: 'item1'
    }];
    const proxy = createProxy(items);
    const observer = jest.fn();
    proxy[0][addObserver](ele, observer);
    proxy[0].label = 'new';
    expect(observer).toBeCalledTimes(1);
    expect(observer).toBeCalledWith('label', 'new');
  });

  test("removeObserver object", () => {
    const items = [{
      label: 'Item 1',
      value: 'item1'
    }];
    const proxy = createProxy(items);
    const observer = jest.fn();
    proxy[0][addObserver](ele, observer);
    proxy[0][removeObserver](ele);
    proxy[0].label = 'new';
    expect(observer).not.toBeCalled();
  });
});

describe("createProxy nested object", () => {

  test("addObserver nested object updates", () => {
    const items = {
      nestedObj: {
        value: 'bar'
      }
    };
    const proxy = createProxy(items);
    const observer = jest.fn();
    proxy[addObserver](ele, observer);
    proxy.nestedObj = { value: 'new' };
  });

});
