# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { upsertUserProfile, createOrder, addVideo, toggleLike, listProducts, getProductById, getUserProfile, getUserOrders, getUserVideos, getUserCart } from '@firebasegen/spresso-connector';


// Operation UpsertUserProfile:  For variables, look at type UpsertUserProfileVars in ../index.d.ts
const { data } = await UpsertUserProfile(dataConnect, upsertUserProfileVars);

// Operation CreateOrder:  For variables, look at type CreateOrderVars in ../index.d.ts
const { data } = await CreateOrder(dataConnect, createOrderVars);

// Operation AddVideo:  For variables, look at type AddVideoVars in ../index.d.ts
const { data } = await AddVideo(dataConnect, addVideoVars);

// Operation ToggleLike:  For variables, look at type ToggleLikeVars in ../index.d.ts
const { data } = await ToggleLike(dataConnect, toggleLikeVars);

// Operation ListProducts: 
const { data } = await ListProducts(dataConnect);

// Operation GetProductById:  For variables, look at type GetProductByIdVars in ../index.d.ts
const { data } = await GetProductById(dataConnect, getProductByIdVars);

// Operation GetUserProfile: 
const { data } = await GetUserProfile(dataConnect);

// Operation GetUserOrders: 
const { data } = await GetUserOrders(dataConnect);

// Operation GetUserVideos: 
const { data } = await GetUserVideos(dataConnect);

// Operation GetUserCart: 
const { data } = await GetUserCart(dataConnect);


```