# Proxy

The `createProxy` is a utility used to track changes for top level array and object properties. Nested objects in arrays are also tracked.

Objects nested in a object do not support observers.

`ele` must be within a `shadowRoot` as binded items are tracked by host instance.

```typescript
const foo = {
    objLevel1: { objLevel2: 'old value' },
    arrLevel1: [{ objLevel2: 'old value' }],
};
const proxyFoo = createProxy(foo);
// will not trigger
proxyFoo.objLevel1[addObserver](ele, (prop, value) => {
    
});
proxyFoo.objLevel1.objLevel2 = 'new value';
// will trigger
proxyFoo.arrLevel1[0].objLevel2[addObserver](ele, (prop, value) => {
    
});
proxyFoo.arrLevel1[0].objLevel2 = 'new value';
```

## Arrays

Array observers will trigger when items are inserted, removed, or position changes in the array.

> For performance reasons `sort` and `reverse` are handled as a single change.

```typescript
import { Mutation } from './proxy';

const foo = [{
    name: 'init'
}];
const proxyFoo = createProxy(foo);
proxyFoo[addObserver](ele, (target, prop, args) => {
    switch(prop) {
        case Mutation.fill:
            
            break;
        case Mutation.pop:

            break;
        case Mutation.push:
            
            break;
        case Mutation.reverse:

            break;
        case Mutation.shift:

            break;
        case Mutation.sort:

            break;
        case Mutation.splice:

            break;
        case Mutation.unshift:

            break;
    }
});
foo.push({ name: 'new item' });
// 'insert', 1, { name: 'new item' }
const item = foo.pop();
// 'delete', 1, { name: 'new item' }
```

## Objects

Object observers will trigger anytime the prop is updated. This will not trigger if the value is the same.

```typescript
const foo = {
    name: 'init'
};
const proxyFoo = createProxy(foo);
proxyFoo[addObserver](ele, (prop, value) => {
    console.log(prop, value);
});
foo.name = 'new value';
// 'name', 'new value'
```

## `getProxyValue`

Every proxy is unique when evaluated. The `getProxyValue()` will unwrap the proxy returning the underlying target. This value will be unique and is safe to use in equality checks or `Map` / `Set` lists.

```typescript
import { getProxyValue } from '@pictogrammers/element';

const unproxyItem = getProxyValue(this.selectedItem);
const selectedItems = new Set();

selectedItems.add(unproxyItem);
selectedItems.has(unproxyItem); // true
```