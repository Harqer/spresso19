# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { toggleLike, createOrder, listProducts } from '@firebasegen/spresso-connector';


// Operation ToggleLike:  For variables, look at type ToggleLikeVars in ../index.d.ts
const { data } = await ToggleLike(dataConnect, toggleLikeVars);

// Operation CreateOrder:  For variables, look at type CreateOrderVars in ../index.d.ts
const { data } = await CreateOrder(dataConnect, createOrderVars);

// Operation ListProducts: 
const { data } = await ListProducts(dataConnect);


```