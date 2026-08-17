# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `spresso-connector`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListProducts*](#listproducts)
  - [*GetProductById*](#getproductbyid)
  - [*GetUserProfile*](#getuserprofile)
  - [*GetUserOrders*](#getuserorders)
  - [*GetUserVideos*](#getuservideos)
  - [*GetUserCart*](#getusercart)
  - [*GetTrips*](#gettrips)
  - [*GetUserPreferences*](#getuserpreferences)
  - [*GetItineraryEvents*](#getitineraryevents)
  - [*GetTravelExpenses*](#gettravelexpenses)
  - [*GetVoiceNotes*](#getvoicenotes)
  - [*GetPaymentMethods*](#getpaymentmethods)
  - [*GetUserSubscription*](#getusersubscription)
  - [*GetUserPreference*](#getuserpreference)
- [**Mutations**](#mutations)
  - [*UpsertUserProfile*](#upsertuserprofile)
  - [*CreateOrder*](#createorder)
  - [*AddVideo*](#addvideo)
  - [*ToggleLike*](#togglelike)
  - [*CreateExpense*](#createexpense)
  - [*CreateTravelExpense*](#createtravelexpense)
  - [*CreateVoiceNote*](#createvoicenote)
  - [*CreatePaymentMethod*](#createpaymentmethod)
  - [*DeletePaymentMethod*](#deletepaymentmethod)
  - [*UpdateUserSubscription*](#updateusersubscription)
  - [*UpsertUserPreference*](#upsertuserpreference)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `spresso-connector`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@firebasegen/spresso-connector` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@firebasegen/spresso-connector';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@firebasegen/spresso-connector';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `spresso-connector` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListProducts
You can execute the `ListProducts` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listProducts(options?: ExecuteQueryOptions): QueryPromise<ListProductsData, undefined>;

interface ListProductsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProductsData, undefined>;
}
export const listProductsRef: ListProductsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProducts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProductsData, undefined>;

interface ListProductsRef {
  ...
  (dc: DataConnect): QueryRef<ListProductsData, undefined>;
}
export const listProductsRef: ListProductsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProductsRef:
```typescript
const name = listProductsRef.operationName;
console.log(name);
```

### Variables
The `ListProducts` query has no variables.
### Return Type
Recall that executing the `ListProducts` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProductsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListProductsData {
  products: ({
    id: string;
    name: string;
    brand?: string | null;
    category?: string | null;
    price: number;
    image?: string | null;
    description?: string | null;
    likesCount: number;
  } & Product_Key)[];
}
```
### Using `ListProducts`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProducts } from '@firebasegen/spresso-connector';


// Call the `listProducts()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProducts();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProducts(dataConnect);

console.log(data.products);

// Or, you can use the `Promise` API.
listProducts().then((response) => {
  const data = response.data;
  console.log(data.products);
});
```

### Using `ListProducts`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProductsRef } from '@firebasegen/spresso-connector';


// Call the `listProductsRef()` function to get a reference to the query.
const ref = listProductsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProductsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.products);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.products);
});
```

## GetProductById
You can execute the `GetProductById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getProductById(vars: GetProductByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductByIdData, GetProductByIdVariables>;

interface GetProductByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProductByIdVariables): QueryRef<GetProductByIdData, GetProductByIdVariables>;
}
export const getProductByIdRef: GetProductByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getProductById(dc: DataConnect, vars: GetProductByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductByIdData, GetProductByIdVariables>;

interface GetProductByIdRef {
  ...
  (dc: DataConnect, vars: GetProductByIdVariables): QueryRef<GetProductByIdData, GetProductByIdVariables>;
}
export const getProductByIdRef: GetProductByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getProductByIdRef:
```typescript
const name = getProductByIdRef.operationName;
console.log(name);
```

### Variables
The `GetProductById` query requires an argument of type `GetProductByIdVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetProductByIdVariables {
  id: string;
}
```
### Return Type
Recall that executing the `GetProductById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetProductByIdData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetProductByIdData {
  product?: {
    id: string;
    name: string;
    brand?: string | null;
    category?: string | null;
    price: number;
    image?: string | null;
    description?: string | null;
    likesCount: number;
  } & Product_Key;
}
```
### Using `GetProductById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getProductById, GetProductByIdVariables } from '@firebasegen/spresso-connector';

// The `GetProductById` query requires an argument of type `GetProductByIdVariables`:
const getProductByIdVars: GetProductByIdVariables = {
  id: ..., 
};

// Call the `getProductById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getProductById(getProductByIdVars);
// Variables can be defined inline as well.
const { data } = await getProductById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getProductById(dataConnect, getProductByIdVars);

console.log(data.product);

// Or, you can use the `Promise` API.
getProductById(getProductByIdVars).then((response) => {
  const data = response.data;
  console.log(data.product);
});
```

### Using `GetProductById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getProductByIdRef, GetProductByIdVariables } from '@firebasegen/spresso-connector';

// The `GetProductById` query requires an argument of type `GetProductByIdVariables`:
const getProductByIdVars: GetProductByIdVariables = {
  id: ..., 
};

// Call the `getProductByIdRef()` function to get a reference to the query.
const ref = getProductByIdRef(getProductByIdVars);
// Variables can be defined inline as well.
const ref = getProductByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getProductByIdRef(dataConnect, getProductByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.product);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.product);
});
```

## GetUserProfile
You can execute the `GetUserProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getUserProfile(options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, undefined>;

interface GetUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserProfileData, undefined>;
}
export const getUserProfileRef: GetUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserProfile(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, undefined>;

interface GetUserProfileRef {
  ...
  (dc: DataConnect): QueryRef<GetUserProfileData, undefined>;
}
export const getUserProfileRef: GetUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserProfileRef:
```typescript
const name = getUserProfileRef.operationName;
console.log(name);
```

### Variables
The `GetUserProfile` query has no variables.
### Return Type
Recall that executing the `GetUserProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserProfileData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserProfileData {
  user?: {
    id: string;
    email?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    createdAt: TimestampString;
  } & User_Key;
}
```
### Using `GetUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserProfile } from '@firebasegen/spresso-connector';


// Call the `getUserProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserProfile();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserProfile(dataConnect);

console.log(data.user);

// Or, you can use the `Promise` API.
getUserProfile().then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetUserProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserProfileRef } from '@firebasegen/spresso-connector';


// Call the `getUserProfileRef()` function to get a reference to the query.
const ref = getUserProfileRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserProfileRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

## GetUserOrders
You can execute the `GetUserOrders` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getUserOrders(options?: ExecuteQueryOptions): QueryPromise<GetUserOrdersData, undefined>;

interface GetUserOrdersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserOrdersData, undefined>;
}
export const getUserOrdersRef: GetUserOrdersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserOrders(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserOrdersData, undefined>;

interface GetUserOrdersRef {
  ...
  (dc: DataConnect): QueryRef<GetUserOrdersData, undefined>;
}
export const getUserOrdersRef: GetUserOrdersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserOrdersRef:
```typescript
const name = getUserOrdersRef.operationName;
console.log(name);
```

### Variables
The `GetUserOrders` query has no variables.
### Return Type
Recall that executing the `GetUserOrders` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserOrdersData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserOrdersData {
  orders: ({
    id: UUIDString;
    authorizationId: string;
    product: {
      id: string;
      name: string;
      price: number;
      image?: string | null;
    } & Product_Key;
    quantity: number;
    totalAmount: number;
    shippingAddress?: string | null;
    deviceSource: string;
    paymentMethod: string;
    status: string;
    createdAt: TimestampString;
  } & Order_Key)[];
}
```
### Using `GetUserOrders`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserOrders } from '@firebasegen/spresso-connector';


// Call the `getUserOrders()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserOrders();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserOrders(dataConnect);

console.log(data.orders);

// Or, you can use the `Promise` API.
getUserOrders().then((response) => {
  const data = response.data;
  console.log(data.orders);
});
```

### Using `GetUserOrders`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserOrdersRef } from '@firebasegen/spresso-connector';


// Call the `getUserOrdersRef()` function to get a reference to the query.
const ref = getUserOrdersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserOrdersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.orders);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.orders);
});
```

## GetUserVideos
You can execute the `GetUserVideos` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getUserVideos(options?: ExecuteQueryOptions): QueryPromise<GetUserVideosData, undefined>;

interface GetUserVideosRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserVideosData, undefined>;
}
export const getUserVideosRef: GetUserVideosRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserVideos(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserVideosData, undefined>;

interface GetUserVideosRef {
  ...
  (dc: DataConnect): QueryRef<GetUserVideosData, undefined>;
}
export const getUserVideosRef: GetUserVideosRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserVideosRef:
```typescript
const name = getUserVideosRef.operationName;
console.log(name);
```

### Variables
The `GetUserVideos` query has no variables.
### Return Type
Recall that executing the `GetUserVideos` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserVideosData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserVideosData {
  videos: ({
    id: UUIDString;
    productId?: string | null;
    videoUrl: string;
    videoType: string;
    status: string;
    createdAt: TimestampString;
  } & Video_Key)[];
}
```
### Using `GetUserVideos`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserVideos } from '@firebasegen/spresso-connector';


// Call the `getUserVideos()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserVideos();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserVideos(dataConnect);

console.log(data.videos);

// Or, you can use the `Promise` API.
getUserVideos().then((response) => {
  const data = response.data;
  console.log(data.videos);
});
```

### Using `GetUserVideos`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserVideosRef } from '@firebasegen/spresso-connector';


// Call the `getUserVideosRef()` function to get a reference to the query.
const ref = getUserVideosRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserVideosRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.videos);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.videos);
});
```

## GetUserCart
You can execute the `GetUserCart` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getUserCart(options?: ExecuteQueryOptions): QueryPromise<GetUserCartData, undefined>;

interface GetUserCartRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserCartData, undefined>;
}
export const getUserCartRef: GetUserCartRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserCart(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserCartData, undefined>;

interface GetUserCartRef {
  ...
  (dc: DataConnect): QueryRef<GetUserCartData, undefined>;
}
export const getUserCartRef: GetUserCartRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserCartRef:
```typescript
const name = getUserCartRef.operationName;
console.log(name);
```

### Variables
The `GetUserCart` query has no variables.
### Return Type
Recall that executing the `GetUserCart` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserCartData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserCartData {
  carts: ({
    id: UUIDString;
    updatedAt: TimestampString;
  } & Cart_Key)[];
}
```
### Using `GetUserCart`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserCart } from '@firebasegen/spresso-connector';


// Call the `getUserCart()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserCart();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserCart(dataConnect);

console.log(data.carts);

// Or, you can use the `Promise` API.
getUserCart().then((response) => {
  const data = response.data;
  console.log(data.carts);
});
```

### Using `GetUserCart`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserCartRef } from '@firebasegen/spresso-connector';


// Call the `getUserCartRef()` function to get a reference to the query.
const ref = getUserCartRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserCartRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.carts);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.carts);
});
```

## GetTrips
You can execute the `GetTrips` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getTrips(options?: ExecuteQueryOptions): QueryPromise<GetTripsData, undefined>;

interface GetTripsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTripsData, undefined>;
}
export const getTripsRef: GetTripsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTrips(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetTripsData, undefined>;

interface GetTripsRef {
  ...
  (dc: DataConnect): QueryRef<GetTripsData, undefined>;
}
export const getTripsRef: GetTripsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTripsRef:
```typescript
const name = getTripsRef.operationName;
console.log(name);
```

### Variables
The `GetTrips` query has no variables.
### Return Type
Recall that executing the `GetTrips` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTripsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTripsData {
  trips: ({
    id: UUIDString;
    title: string;
    destination?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    status?: string | null;
    coverImage?: string | null;
  } & Trip_Key)[];
}
```
### Using `GetTrips`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTrips } from '@firebasegen/spresso-connector';


// Call the `getTrips()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTrips();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTrips(dataConnect);

console.log(data.trips);

// Or, you can use the `Promise` API.
getTrips().then((response) => {
  const data = response.data;
  console.log(data.trips);
});
```

### Using `GetTrips`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTripsRef } from '@firebasegen/spresso-connector';


// Call the `getTripsRef()` function to get a reference to the query.
const ref = getTripsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTripsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.trips);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.trips);
});
```

## GetUserPreferences
You can execute the `GetUserPreferences` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getUserPreferences(options?: ExecuteQueryOptions): QueryPromise<GetUserPreferencesData, undefined>;

interface GetUserPreferencesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserPreferencesData, undefined>;
}
export const getUserPreferencesRef: GetUserPreferencesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserPreferences(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserPreferencesData, undefined>;

interface GetUserPreferencesRef {
  ...
  (dc: DataConnect): QueryRef<GetUserPreferencesData, undefined>;
}
export const getUserPreferencesRef: GetUserPreferencesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserPreferencesRef:
```typescript
const name = getUserPreferencesRef.operationName;
console.log(name);
```

### Variables
The `GetUserPreferences` query has no variables.
### Return Type
Recall that executing the `GetUserPreferences` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserPreferencesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserPreferencesData {
  userPreferences: ({
    userId: string;
    theme?: string | null;
    pushNotifications?: boolean | null;
    emailAlerts?: boolean | null;
  } & UserPreference_Key)[];
}
```
### Using `GetUserPreferences`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserPreferences } from '@firebasegen/spresso-connector';


// Call the `getUserPreferences()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserPreferences();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserPreferences(dataConnect);

console.log(data.userPreferences);

// Or, you can use the `Promise` API.
getUserPreferences().then((response) => {
  const data = response.data;
  console.log(data.userPreferences);
});
```

### Using `GetUserPreferences`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserPreferencesRef } from '@firebasegen/spresso-connector';


// Call the `getUserPreferencesRef()` function to get a reference to the query.
const ref = getUserPreferencesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserPreferencesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userPreferences);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userPreferences);
});
```

## GetItineraryEvents
You can execute the `GetItineraryEvents` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getItineraryEvents(options?: ExecuteQueryOptions): QueryPromise<GetItineraryEventsData, undefined>;

interface GetItineraryEventsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetItineraryEventsData, undefined>;
}
export const getItineraryEventsRef: GetItineraryEventsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getItineraryEvents(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetItineraryEventsData, undefined>;

interface GetItineraryEventsRef {
  ...
  (dc: DataConnect): QueryRef<GetItineraryEventsData, undefined>;
}
export const getItineraryEventsRef: GetItineraryEventsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getItineraryEventsRef:
```typescript
const name = getItineraryEventsRef.operationName;
console.log(name);
```

### Variables
The `GetItineraryEvents` query has no variables.
### Return Type
Recall that executing the `GetItineraryEvents` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetItineraryEventsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetItineraryEventsData {
  itineraryEvents: ({
    id: UUIDString;
    tripId: UUIDString;
    type: string;
    title: string;
    description?: string | null;
    eventTime?: string | null;
    location?: string | null;
    price?: number | null;
    qrData?: string | null;
    confirmationCode?: string | null;
  } & ItineraryEvent_Key)[];
}
```
### Using `GetItineraryEvents`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getItineraryEvents } from '@firebasegen/spresso-connector';


// Call the `getItineraryEvents()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getItineraryEvents();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getItineraryEvents(dataConnect);

console.log(data.itineraryEvents);

// Or, you can use the `Promise` API.
getItineraryEvents().then((response) => {
  const data = response.data;
  console.log(data.itineraryEvents);
});
```

### Using `GetItineraryEvents`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getItineraryEventsRef } from '@firebasegen/spresso-connector';


// Call the `getItineraryEventsRef()` function to get a reference to the query.
const ref = getItineraryEventsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getItineraryEventsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.itineraryEvents);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.itineraryEvents);
});
```

## GetTravelExpenses
You can execute the `GetTravelExpenses` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getTravelExpenses(options?: ExecuteQueryOptions): QueryPromise<GetTravelExpensesData, undefined>;

interface GetTravelExpensesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTravelExpensesData, undefined>;
}
export const getTravelExpensesRef: GetTravelExpensesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTravelExpenses(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetTravelExpensesData, undefined>;

interface GetTravelExpensesRef {
  ...
  (dc: DataConnect): QueryRef<GetTravelExpensesData, undefined>;
}
export const getTravelExpensesRef: GetTravelExpensesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTravelExpensesRef:
```typescript
const name = getTravelExpensesRef.operationName;
console.log(name);
```

### Variables
The `GetTravelExpenses` query has no variables.
### Return Type
Recall that executing the `GetTravelExpenses` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTravelExpensesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTravelExpensesData {
  travelExpenses: ({
    id: UUIDString;
    tripId: UUIDString;
    amount: number;
    currency?: string | null;
    category: string;
    merchant: string;
    receiptImageUrl?: string | null;
    date?: string | null;
    items?: string | null;
  } & TravelExpense_Key)[];
}
```
### Using `GetTravelExpenses`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTravelExpenses } from '@firebasegen/spresso-connector';


// Call the `getTravelExpenses()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTravelExpenses();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTravelExpenses(dataConnect);

console.log(data.travelExpenses);

// Or, you can use the `Promise` API.
getTravelExpenses().then((response) => {
  const data = response.data;
  console.log(data.travelExpenses);
});
```

### Using `GetTravelExpenses`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTravelExpensesRef } from '@firebasegen/spresso-connector';


// Call the `getTravelExpensesRef()` function to get a reference to the query.
const ref = getTravelExpensesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTravelExpensesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.travelExpenses);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.travelExpenses);
});
```

## GetVoiceNotes
You can execute the `GetVoiceNotes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getVoiceNotes(options?: ExecuteQueryOptions): QueryPromise<GetVoiceNotesData, undefined>;

interface GetVoiceNotesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetVoiceNotesData, undefined>;
}
export const getVoiceNotesRef: GetVoiceNotesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getVoiceNotes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetVoiceNotesData, undefined>;

interface GetVoiceNotesRef {
  ...
  (dc: DataConnect): QueryRef<GetVoiceNotesData, undefined>;
}
export const getVoiceNotesRef: GetVoiceNotesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getVoiceNotesRef:
```typescript
const name = getVoiceNotesRef.operationName;
console.log(name);
```

### Variables
The `GetVoiceNotes` query has no variables.
### Return Type
Recall that executing the `GetVoiceNotes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetVoiceNotesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetVoiceNotesData {
  voiceNotes: ({
    id: UUIDString;
    tripId: UUIDString;
    transcript: string;
    audioUrl?: string | null;
    createdAt: TimestampString;
  } & VoiceNote_Key)[];
}
```
### Using `GetVoiceNotes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getVoiceNotes } from '@firebasegen/spresso-connector';


// Call the `getVoiceNotes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getVoiceNotes();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getVoiceNotes(dataConnect);

console.log(data.voiceNotes);

// Or, you can use the `Promise` API.
getVoiceNotes().then((response) => {
  const data = response.data;
  console.log(data.voiceNotes);
});
```

### Using `GetVoiceNotes`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getVoiceNotesRef } from '@firebasegen/spresso-connector';


// Call the `getVoiceNotesRef()` function to get a reference to the query.
const ref = getVoiceNotesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getVoiceNotesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.voiceNotes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.voiceNotes);
});
```

## GetPaymentMethods
You can execute the `GetPaymentMethods` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getPaymentMethods(options?: ExecuteQueryOptions): QueryPromise<GetPaymentMethodsData, undefined>;

interface GetPaymentMethodsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPaymentMethodsData, undefined>;
}
export const getPaymentMethodsRef: GetPaymentMethodsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPaymentMethods(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetPaymentMethodsData, undefined>;

interface GetPaymentMethodsRef {
  ...
  (dc: DataConnect): QueryRef<GetPaymentMethodsData, undefined>;
}
export const getPaymentMethodsRef: GetPaymentMethodsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPaymentMethodsRef:
```typescript
const name = getPaymentMethodsRef.operationName;
console.log(name);
```

### Variables
The `GetPaymentMethods` query has no variables.
### Return Type
Recall that executing the `GetPaymentMethods` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPaymentMethodsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPaymentMethodsData {
  paymentMethods: ({
    id: UUIDString;
    isDefault?: boolean | null;
    stripePaymentMethodId?: string | null;
  } & PaymentMethod_Key)[];
}
```
### Using `GetPaymentMethods`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPaymentMethods } from '@firebasegen/spresso-connector';


// Call the `getPaymentMethods()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPaymentMethods();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPaymentMethods(dataConnect);

console.log(data.paymentMethods);

// Or, you can use the `Promise` API.
getPaymentMethods().then((response) => {
  const data = response.data;
  console.log(data.paymentMethods);
});
```

### Using `GetPaymentMethods`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPaymentMethodsRef } from '@firebasegen/spresso-connector';


// Call the `getPaymentMethodsRef()` function to get a reference to the query.
const ref = getPaymentMethodsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPaymentMethodsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.paymentMethods);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.paymentMethods);
});
```

## GetUserSubscription
You can execute the `GetUserSubscription` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getUserSubscription(options?: ExecuteQueryOptions): QueryPromise<GetUserSubscriptionData, undefined>;

interface GetUserSubscriptionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserSubscriptionData, undefined>;
}
export const getUserSubscriptionRef: GetUserSubscriptionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserSubscription(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserSubscriptionData, undefined>;

interface GetUserSubscriptionRef {
  ...
  (dc: DataConnect): QueryRef<GetUserSubscriptionData, undefined>;
}
export const getUserSubscriptionRef: GetUserSubscriptionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserSubscriptionRef:
```typescript
const name = getUserSubscriptionRef.operationName;
console.log(name);
```

### Variables
The `GetUserSubscription` query has no variables.
### Return Type
Recall that executing the `GetUserSubscription` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserSubscriptionData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserSubscriptionData {
  userSubscriptions: ({
    id: UUIDString;
    tier?: string | null;
    status?: string | null;
    currentPeriodEnd?: string | null;
    stripeSubscriptionId?: string | null;
  } & UserSubscription_Key)[];
}
```
### Using `GetUserSubscription`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserSubscription } from '@firebasegen/spresso-connector';


// Call the `getUserSubscription()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserSubscription();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserSubscription(dataConnect);

console.log(data.userSubscriptions);

// Or, you can use the `Promise` API.
getUserSubscription().then((response) => {
  const data = response.data;
  console.log(data.userSubscriptions);
});
```

### Using `GetUserSubscription`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserSubscriptionRef } from '@firebasegen/spresso-connector';


// Call the `getUserSubscriptionRef()` function to get a reference to the query.
const ref = getUserSubscriptionRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserSubscriptionRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userSubscriptions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userSubscriptions);
});
```

## GetUserPreference
You can execute the `GetUserPreference` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getUserPreference(options?: ExecuteQueryOptions): QueryPromise<GetUserPreferenceData, undefined>;

interface GetUserPreferenceRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserPreferenceData, undefined>;
}
export const getUserPreferenceRef: GetUserPreferenceRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserPreference(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserPreferenceData, undefined>;

interface GetUserPreferenceRef {
  ...
  (dc: DataConnect): QueryRef<GetUserPreferenceData, undefined>;
}
export const getUserPreferenceRef: GetUserPreferenceRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserPreferenceRef:
```typescript
const name = getUserPreferenceRef.operationName;
console.log(name);
```

### Variables
The `GetUserPreference` query has no variables.
### Return Type
Recall that executing the `GetUserPreference` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserPreferenceData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserPreferenceData {
  userPreferences: ({
    userId: string;
    theme?: string | null;
    pushNotifications?: boolean | null;
    emailAlerts?: boolean | null;
  } & UserPreference_Key)[];
}
```
### Using `GetUserPreference`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserPreference } from '@firebasegen/spresso-connector';


// Call the `getUserPreference()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserPreference();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserPreference(dataConnect);

console.log(data.userPreferences);

// Or, you can use the `Promise` API.
getUserPreference().then((response) => {
  const data = response.data;
  console.log(data.userPreferences);
});
```

### Using `GetUserPreference`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserPreferenceRef } from '@firebasegen/spresso-connector';


// Call the `getUserPreferenceRef()` function to get a reference to the query.
const ref = getUserPreferenceRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserPreferenceRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userPreferences);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userPreferences);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `spresso-connector` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## UpsertUserProfile
You can execute the `UpsertUserProfile` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
upsertUserProfile(vars?: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;

interface UpsertUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
}
export const upsertUserProfileRef: UpsertUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertUserProfile(dc: DataConnect, vars?: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;

interface UpsertUserProfileRef {
  ...
  (dc: DataConnect, vars?: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
}
export const upsertUserProfileRef: UpsertUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertUserProfileRef:
```typescript
const name = upsertUserProfileRef.operationName;
console.log(name);
```

### Variables
The `UpsertUserProfile` mutation has an optional argument of type `UpsertUserProfileVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertUserProfileVariables {
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}
```
### Return Type
Recall that executing the `UpsertUserProfile` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertUserProfileData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertUserProfileData {
  user_upsert: User_Key;
}
```
### Using `UpsertUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertUserProfile, UpsertUserProfileVariables } from '@firebasegen/spresso-connector';

// The `UpsertUserProfile` mutation has an optional argument of type `UpsertUserProfileVariables`:
const upsertUserProfileVars: UpsertUserProfileVariables = {
  email: ..., // optional
  displayName: ..., // optional
  avatarUrl: ..., // optional
};

// Call the `upsertUserProfile()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertUserProfile(upsertUserProfileVars);
// Variables can be defined inline as well.
const { data } = await upsertUserProfile({ email: ..., displayName: ..., avatarUrl: ..., });
// Since all variables are optional for this mutation, you can omit the `UpsertUserProfileVariables` argument.
const { data } = await upsertUserProfile();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertUserProfile(dataConnect, upsertUserProfileVars);

console.log(data.user_upsert);

// Or, you can use the `Promise` API.
upsertUserProfile(upsertUserProfileVars).then((response) => {
  const data = response.data;
  console.log(data.user_upsert);
});
```

### Using `UpsertUserProfile`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertUserProfileRef, UpsertUserProfileVariables } from '@firebasegen/spresso-connector';

// The `UpsertUserProfile` mutation has an optional argument of type `UpsertUserProfileVariables`:
const upsertUserProfileVars: UpsertUserProfileVariables = {
  email: ..., // optional
  displayName: ..., // optional
  avatarUrl: ..., // optional
};

// Call the `upsertUserProfileRef()` function to get a reference to the mutation.
const ref = upsertUserProfileRef(upsertUserProfileVars);
// Variables can be defined inline as well.
const ref = upsertUserProfileRef({ email: ..., displayName: ..., avatarUrl: ..., });
// Since all variables are optional for this mutation, you can omit the `UpsertUserProfileVariables` argument.
const ref = upsertUserProfileRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertUserProfileRef(dataConnect, upsertUserProfileVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_upsert);
});
```

## CreateOrder
You can execute the `CreateOrder` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createOrder(vars: CreateOrderVariables): MutationPromise<CreateOrderData, CreateOrderVariables>;

interface CreateOrderRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateOrderVariables): MutationRef<CreateOrderData, CreateOrderVariables>;
}
export const createOrderRef: CreateOrderRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createOrder(dc: DataConnect, vars: CreateOrderVariables): MutationPromise<CreateOrderData, CreateOrderVariables>;

interface CreateOrderRef {
  ...
  (dc: DataConnect, vars: CreateOrderVariables): MutationRef<CreateOrderData, CreateOrderVariables>;
}
export const createOrderRef: CreateOrderRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createOrderRef:
```typescript
const name = createOrderRef.operationName;
console.log(name);
```

### Variables
The `CreateOrder` mutation requires an argument of type `CreateOrderVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateOrderVariables {
  authorizationId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  shippingAddress?: string | null;
  deviceSource: string;
  paymentMethod: string;
  userConfirmedToken?: string | null;
}
```
### Return Type
Recall that executing the `CreateOrder` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateOrderData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateOrderData {
  order_insert: Order_Key;
}
```
### Using `CreateOrder`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createOrder, CreateOrderVariables } from '@firebasegen/spresso-connector';

// The `CreateOrder` mutation requires an argument of type `CreateOrderVariables`:
const createOrderVars: CreateOrderVariables = {
  authorizationId: ..., 
  productId: ..., 
  quantity: ..., 
  totalAmount: ..., 
  shippingAddress: ..., // optional
  deviceSource: ..., 
  paymentMethod: ..., 
  userConfirmedToken: ..., // optional
};

// Call the `createOrder()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createOrder(createOrderVars);
// Variables can be defined inline as well.
const { data } = await createOrder({ authorizationId: ..., productId: ..., quantity: ..., totalAmount: ..., shippingAddress: ..., deviceSource: ..., paymentMethod: ..., userConfirmedToken: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createOrder(dataConnect, createOrderVars);

console.log(data.order_insert);

// Or, you can use the `Promise` API.
createOrder(createOrderVars).then((response) => {
  const data = response.data;
  console.log(data.order_insert);
});
```

### Using `CreateOrder`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createOrderRef, CreateOrderVariables } from '@firebasegen/spresso-connector';

// The `CreateOrder` mutation requires an argument of type `CreateOrderVariables`:
const createOrderVars: CreateOrderVariables = {
  authorizationId: ..., 
  productId: ..., 
  quantity: ..., 
  totalAmount: ..., 
  shippingAddress: ..., // optional
  deviceSource: ..., 
  paymentMethod: ..., 
  userConfirmedToken: ..., // optional
};

// Call the `createOrderRef()` function to get a reference to the mutation.
const ref = createOrderRef(createOrderVars);
// Variables can be defined inline as well.
const ref = createOrderRef({ authorizationId: ..., productId: ..., quantity: ..., totalAmount: ..., shippingAddress: ..., deviceSource: ..., paymentMethod: ..., userConfirmedToken: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createOrderRef(dataConnect, createOrderVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.order_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.order_insert);
});
```

## AddVideo
You can execute the `AddVideo` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
addVideo(vars: AddVideoVariables): MutationPromise<AddVideoData, AddVideoVariables>;

interface AddVideoRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddVideoVariables): MutationRef<AddVideoData, AddVideoVariables>;
}
export const addVideoRef: AddVideoRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addVideo(dc: DataConnect, vars: AddVideoVariables): MutationPromise<AddVideoData, AddVideoVariables>;

interface AddVideoRef {
  ...
  (dc: DataConnect, vars: AddVideoVariables): MutationRef<AddVideoData, AddVideoVariables>;
}
export const addVideoRef: AddVideoRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addVideoRef:
```typescript
const name = addVideoRef.operationName;
console.log(name);
```

### Variables
The `AddVideo` mutation requires an argument of type `AddVideoVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddVideoVariables {
  productId?: string | null;
  videoUrl: string;
  videoType: string;
}
```
### Return Type
Recall that executing the `AddVideo` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddVideoData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddVideoData {
  video_insert: Video_Key;
}
```
### Using `AddVideo`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addVideo, AddVideoVariables } from '@firebasegen/spresso-connector';

// The `AddVideo` mutation requires an argument of type `AddVideoVariables`:
const addVideoVars: AddVideoVariables = {
  productId: ..., // optional
  videoUrl: ..., 
  videoType: ..., 
};

// Call the `addVideo()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addVideo(addVideoVars);
// Variables can be defined inline as well.
const { data } = await addVideo({ productId: ..., videoUrl: ..., videoType: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addVideo(dataConnect, addVideoVars);

console.log(data.video_insert);

// Or, you can use the `Promise` API.
addVideo(addVideoVars).then((response) => {
  const data = response.data;
  console.log(data.video_insert);
});
```

### Using `AddVideo`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addVideoRef, AddVideoVariables } from '@firebasegen/spresso-connector';

// The `AddVideo` mutation requires an argument of type `AddVideoVariables`:
const addVideoVars: AddVideoVariables = {
  productId: ..., // optional
  videoUrl: ..., 
  videoType: ..., 
};

// Call the `addVideoRef()` function to get a reference to the mutation.
const ref = addVideoRef(addVideoVars);
// Variables can be defined inline as well.
const ref = addVideoRef({ productId: ..., videoUrl: ..., videoType: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addVideoRef(dataConnect, addVideoVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.video_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.video_insert);
});
```

## ToggleLike
You can execute the `ToggleLike` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
toggleLike(vars: ToggleLikeVariables): MutationPromise<ToggleLikeData, ToggleLikeVariables>;

interface ToggleLikeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ToggleLikeVariables): MutationRef<ToggleLikeData, ToggleLikeVariables>;
}
export const toggleLikeRef: ToggleLikeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
toggleLike(dc: DataConnect, vars: ToggleLikeVariables): MutationPromise<ToggleLikeData, ToggleLikeVariables>;

interface ToggleLikeRef {
  ...
  (dc: DataConnect, vars: ToggleLikeVariables): MutationRef<ToggleLikeData, ToggleLikeVariables>;
}
export const toggleLikeRef: ToggleLikeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the toggleLikeRef:
```typescript
const name = toggleLikeRef.operationName;
console.log(name);
```

### Variables
The `ToggleLike` mutation requires an argument of type `ToggleLikeVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ToggleLikeVariables {
  productId: string;
}
```
### Return Type
Recall that executing the `ToggleLike` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ToggleLikeData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ToggleLikeData {
  userLike_upsert: UserLike_Key;
}
```
### Using `ToggleLike`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, toggleLike, ToggleLikeVariables } from '@firebasegen/spresso-connector';

// The `ToggleLike` mutation requires an argument of type `ToggleLikeVariables`:
const toggleLikeVars: ToggleLikeVariables = {
  productId: ..., 
};

// Call the `toggleLike()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await toggleLike(toggleLikeVars);
// Variables can be defined inline as well.
const { data } = await toggleLike({ productId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await toggleLike(dataConnect, toggleLikeVars);

console.log(data.userLike_upsert);

// Or, you can use the `Promise` API.
toggleLike(toggleLikeVars).then((response) => {
  const data = response.data;
  console.log(data.userLike_upsert);
});
```

### Using `ToggleLike`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, toggleLikeRef, ToggleLikeVariables } from '@firebasegen/spresso-connector';

// The `ToggleLike` mutation requires an argument of type `ToggleLikeVariables`:
const toggleLikeVars: ToggleLikeVariables = {
  productId: ..., 
};

// Call the `toggleLikeRef()` function to get a reference to the mutation.
const ref = toggleLikeRef(toggleLikeVars);
// Variables can be defined inline as well.
const ref = toggleLikeRef({ productId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = toggleLikeRef(dataConnect, toggleLikeVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userLike_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userLike_upsert);
});
```

## CreateExpense
You can execute the `CreateExpense` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createExpense(vars: CreateExpenseVariables): MutationPromise<CreateExpenseData, CreateExpenseVariables>;

interface CreateExpenseRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateExpenseVariables): MutationRef<CreateExpenseData, CreateExpenseVariables>;
}
export const createExpenseRef: CreateExpenseRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createExpense(dc: DataConnect, vars: CreateExpenseVariables): MutationPromise<CreateExpenseData, CreateExpenseVariables>;

interface CreateExpenseRef {
  ...
  (dc: DataConnect, vars: CreateExpenseVariables): MutationRef<CreateExpenseData, CreateExpenseVariables>;
}
export const createExpenseRef: CreateExpenseRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createExpenseRef:
```typescript
const name = createExpenseRef.operationName;
console.log(name);
```

### Variables
The `CreateExpense` mutation requires an argument of type `CreateExpenseVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateExpenseVariables {
  tripId: UUIDString;
  amount: number;
  currency?: string | null;
  category: string;
  merchant: string;
  receiptImageUrl?: string | null;
  date?: string | null;
  items?: string | null;
}
```
### Return Type
Recall that executing the `CreateExpense` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateExpenseData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateExpenseData {
  travelExpense_insert: TravelExpense_Key;
}
```
### Using `CreateExpense`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createExpense, CreateExpenseVariables } from '@firebasegen/spresso-connector';

// The `CreateExpense` mutation requires an argument of type `CreateExpenseVariables`:
const createExpenseVars: CreateExpenseVariables = {
  tripId: ..., 
  amount: ..., 
  currency: ..., // optional
  category: ..., 
  merchant: ..., 
  receiptImageUrl: ..., // optional
  date: ..., // optional
  items: ..., // optional
};

// Call the `createExpense()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createExpense(createExpenseVars);
// Variables can be defined inline as well.
const { data } = await createExpense({ tripId: ..., amount: ..., currency: ..., category: ..., merchant: ..., receiptImageUrl: ..., date: ..., items: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createExpense(dataConnect, createExpenseVars);

console.log(data.travelExpense_insert);

// Or, you can use the `Promise` API.
createExpense(createExpenseVars).then((response) => {
  const data = response.data;
  console.log(data.travelExpense_insert);
});
```

### Using `CreateExpense`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createExpenseRef, CreateExpenseVariables } from '@firebasegen/spresso-connector';

// The `CreateExpense` mutation requires an argument of type `CreateExpenseVariables`:
const createExpenseVars: CreateExpenseVariables = {
  tripId: ..., 
  amount: ..., 
  currency: ..., // optional
  category: ..., 
  merchant: ..., 
  receiptImageUrl: ..., // optional
  date: ..., // optional
  items: ..., // optional
};

// Call the `createExpenseRef()` function to get a reference to the mutation.
const ref = createExpenseRef(createExpenseVars);
// Variables can be defined inline as well.
const ref = createExpenseRef({ tripId: ..., amount: ..., currency: ..., category: ..., merchant: ..., receiptImageUrl: ..., date: ..., items: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createExpenseRef(dataConnect, createExpenseVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.travelExpense_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.travelExpense_insert);
});
```

## CreateTravelExpense
You can execute the `CreateTravelExpense` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createTravelExpense(vars: CreateTravelExpenseVariables): MutationPromise<CreateTravelExpenseData, CreateTravelExpenseVariables>;

interface CreateTravelExpenseRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTravelExpenseVariables): MutationRef<CreateTravelExpenseData, CreateTravelExpenseVariables>;
}
export const createTravelExpenseRef: CreateTravelExpenseRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createTravelExpense(dc: DataConnect, vars: CreateTravelExpenseVariables): MutationPromise<CreateTravelExpenseData, CreateTravelExpenseVariables>;

interface CreateTravelExpenseRef {
  ...
  (dc: DataConnect, vars: CreateTravelExpenseVariables): MutationRef<CreateTravelExpenseData, CreateTravelExpenseVariables>;
}
export const createTravelExpenseRef: CreateTravelExpenseRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createTravelExpenseRef:
```typescript
const name = createTravelExpenseRef.operationName;
console.log(name);
```

### Variables
The `CreateTravelExpense` mutation requires an argument of type `CreateTravelExpenseVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateTravelExpenseVariables {
  tripId: UUIDString;
  amount: number;
  currency?: string | null;
  category: string;
  merchant: string;
  items?: string | null;
}
```
### Return Type
Recall that executing the `CreateTravelExpense` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateTravelExpenseData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateTravelExpenseData {
  travelExpense_insert: TravelExpense_Key;
}
```
### Using `CreateTravelExpense`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createTravelExpense, CreateTravelExpenseVariables } from '@firebasegen/spresso-connector';

// The `CreateTravelExpense` mutation requires an argument of type `CreateTravelExpenseVariables`:
const createTravelExpenseVars: CreateTravelExpenseVariables = {
  tripId: ..., 
  amount: ..., 
  currency: ..., // optional
  category: ..., 
  merchant: ..., 
  items: ..., // optional
};

// Call the `createTravelExpense()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createTravelExpense(createTravelExpenseVars);
// Variables can be defined inline as well.
const { data } = await createTravelExpense({ tripId: ..., amount: ..., currency: ..., category: ..., merchant: ..., items: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createTravelExpense(dataConnect, createTravelExpenseVars);

console.log(data.travelExpense_insert);

// Or, you can use the `Promise` API.
createTravelExpense(createTravelExpenseVars).then((response) => {
  const data = response.data;
  console.log(data.travelExpense_insert);
});
```

### Using `CreateTravelExpense`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createTravelExpenseRef, CreateTravelExpenseVariables } from '@firebasegen/spresso-connector';

// The `CreateTravelExpense` mutation requires an argument of type `CreateTravelExpenseVariables`:
const createTravelExpenseVars: CreateTravelExpenseVariables = {
  tripId: ..., 
  amount: ..., 
  currency: ..., // optional
  category: ..., 
  merchant: ..., 
  items: ..., // optional
};

// Call the `createTravelExpenseRef()` function to get a reference to the mutation.
const ref = createTravelExpenseRef(createTravelExpenseVars);
// Variables can be defined inline as well.
const ref = createTravelExpenseRef({ tripId: ..., amount: ..., currency: ..., category: ..., merchant: ..., items: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createTravelExpenseRef(dataConnect, createTravelExpenseVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.travelExpense_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.travelExpense_insert);
});
```

## CreateVoiceNote
You can execute the `CreateVoiceNote` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createVoiceNote(vars: CreateVoiceNoteVariables): MutationPromise<CreateVoiceNoteData, CreateVoiceNoteVariables>;

interface CreateVoiceNoteRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateVoiceNoteVariables): MutationRef<CreateVoiceNoteData, CreateVoiceNoteVariables>;
}
export const createVoiceNoteRef: CreateVoiceNoteRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createVoiceNote(dc: DataConnect, vars: CreateVoiceNoteVariables): MutationPromise<CreateVoiceNoteData, CreateVoiceNoteVariables>;

interface CreateVoiceNoteRef {
  ...
  (dc: DataConnect, vars: CreateVoiceNoteVariables): MutationRef<CreateVoiceNoteData, CreateVoiceNoteVariables>;
}
export const createVoiceNoteRef: CreateVoiceNoteRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createVoiceNoteRef:
```typescript
const name = createVoiceNoteRef.operationName;
console.log(name);
```

### Variables
The `CreateVoiceNote` mutation requires an argument of type `CreateVoiceNoteVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateVoiceNoteVariables {
  tripId: UUIDString;
  transcript: string;
}
```
### Return Type
Recall that executing the `CreateVoiceNote` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateVoiceNoteData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateVoiceNoteData {
  voiceNote_insert: VoiceNote_Key;
}
```
### Using `CreateVoiceNote`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createVoiceNote, CreateVoiceNoteVariables } from '@firebasegen/spresso-connector';

// The `CreateVoiceNote` mutation requires an argument of type `CreateVoiceNoteVariables`:
const createVoiceNoteVars: CreateVoiceNoteVariables = {
  tripId: ..., 
  transcript: ..., 
};

// Call the `createVoiceNote()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createVoiceNote(createVoiceNoteVars);
// Variables can be defined inline as well.
const { data } = await createVoiceNote({ tripId: ..., transcript: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createVoiceNote(dataConnect, createVoiceNoteVars);

console.log(data.voiceNote_insert);

// Or, you can use the `Promise` API.
createVoiceNote(createVoiceNoteVars).then((response) => {
  const data = response.data;
  console.log(data.voiceNote_insert);
});
```

### Using `CreateVoiceNote`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createVoiceNoteRef, CreateVoiceNoteVariables } from '@firebasegen/spresso-connector';

// The `CreateVoiceNote` mutation requires an argument of type `CreateVoiceNoteVariables`:
const createVoiceNoteVars: CreateVoiceNoteVariables = {
  tripId: ..., 
  transcript: ..., 
};

// Call the `createVoiceNoteRef()` function to get a reference to the mutation.
const ref = createVoiceNoteRef(createVoiceNoteVars);
// Variables can be defined inline as well.
const ref = createVoiceNoteRef({ tripId: ..., transcript: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createVoiceNoteRef(dataConnect, createVoiceNoteVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.voiceNote_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.voiceNote_insert);
});
```

## CreatePaymentMethod
You can execute the `CreatePaymentMethod` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createPaymentMethod(vars: CreatePaymentMethodVariables): MutationPromise<CreatePaymentMethodData, CreatePaymentMethodVariables>;

interface CreatePaymentMethodRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePaymentMethodVariables): MutationRef<CreatePaymentMethodData, CreatePaymentMethodVariables>;
}
export const createPaymentMethodRef: CreatePaymentMethodRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createPaymentMethod(dc: DataConnect, vars: CreatePaymentMethodVariables): MutationPromise<CreatePaymentMethodData, CreatePaymentMethodVariables>;

interface CreatePaymentMethodRef {
  ...
  (dc: DataConnect, vars: CreatePaymentMethodVariables): MutationRef<CreatePaymentMethodData, CreatePaymentMethodVariables>;
}
export const createPaymentMethodRef: CreatePaymentMethodRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPaymentMethodRef:
```typescript
const name = createPaymentMethodRef.operationName;
console.log(name);
```

### Variables
The `CreatePaymentMethod` mutation requires an argument of type `CreatePaymentMethodVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreatePaymentMethodVariables {
  stripePaymentMethodId: string;
}
```
### Return Type
Recall that executing the `CreatePaymentMethod` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePaymentMethodData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePaymentMethodData {
  paymentMethod_insert: PaymentMethod_Key;
}
```
### Using `CreatePaymentMethod`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createPaymentMethod, CreatePaymentMethodVariables } from '@firebasegen/spresso-connector';

// The `CreatePaymentMethod` mutation requires an argument of type `CreatePaymentMethodVariables`:
const createPaymentMethodVars: CreatePaymentMethodVariables = {
  stripePaymentMethodId: ..., 
};

// Call the `createPaymentMethod()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createPaymentMethod(createPaymentMethodVars);
// Variables can be defined inline as well.
const { data } = await createPaymentMethod({ stripePaymentMethodId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createPaymentMethod(dataConnect, createPaymentMethodVars);

console.log(data.paymentMethod_insert);

// Or, you can use the `Promise` API.
createPaymentMethod(createPaymentMethodVars).then((response) => {
  const data = response.data;
  console.log(data.paymentMethod_insert);
});
```

### Using `CreatePaymentMethod`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPaymentMethodRef, CreatePaymentMethodVariables } from '@firebasegen/spresso-connector';

// The `CreatePaymentMethod` mutation requires an argument of type `CreatePaymentMethodVariables`:
const createPaymentMethodVars: CreatePaymentMethodVariables = {
  stripePaymentMethodId: ..., 
};

// Call the `createPaymentMethodRef()` function to get a reference to the mutation.
const ref = createPaymentMethodRef(createPaymentMethodVars);
// Variables can be defined inline as well.
const ref = createPaymentMethodRef({ stripePaymentMethodId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPaymentMethodRef(dataConnect, createPaymentMethodVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.paymentMethod_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.paymentMethod_insert);
});
```

## DeletePaymentMethod
You can execute the `DeletePaymentMethod` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deletePaymentMethod(vars: DeletePaymentMethodVariables): MutationPromise<DeletePaymentMethodData, DeletePaymentMethodVariables>;

interface DeletePaymentMethodRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeletePaymentMethodVariables): MutationRef<DeletePaymentMethodData, DeletePaymentMethodVariables>;
}
export const deletePaymentMethodRef: DeletePaymentMethodRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deletePaymentMethod(dc: DataConnect, vars: DeletePaymentMethodVariables): MutationPromise<DeletePaymentMethodData, DeletePaymentMethodVariables>;

interface DeletePaymentMethodRef {
  ...
  (dc: DataConnect, vars: DeletePaymentMethodVariables): MutationRef<DeletePaymentMethodData, DeletePaymentMethodVariables>;
}
export const deletePaymentMethodRef: DeletePaymentMethodRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deletePaymentMethodRef:
```typescript
const name = deletePaymentMethodRef.operationName;
console.log(name);
```

### Variables
The `DeletePaymentMethod` mutation requires an argument of type `DeletePaymentMethodVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeletePaymentMethodVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeletePaymentMethod` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeletePaymentMethodData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeletePaymentMethodData {
  paymentMethod_delete?: PaymentMethod_Key | null;
}
```
### Using `DeletePaymentMethod`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deletePaymentMethod, DeletePaymentMethodVariables } from '@firebasegen/spresso-connector';

// The `DeletePaymentMethod` mutation requires an argument of type `DeletePaymentMethodVariables`:
const deletePaymentMethodVars: DeletePaymentMethodVariables = {
  id: ..., 
};

// Call the `deletePaymentMethod()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deletePaymentMethod(deletePaymentMethodVars);
// Variables can be defined inline as well.
const { data } = await deletePaymentMethod({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deletePaymentMethod(dataConnect, deletePaymentMethodVars);

console.log(data.paymentMethod_delete);

// Or, you can use the `Promise` API.
deletePaymentMethod(deletePaymentMethodVars).then((response) => {
  const data = response.data;
  console.log(data.paymentMethod_delete);
});
```

### Using `DeletePaymentMethod`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deletePaymentMethodRef, DeletePaymentMethodVariables } from '@firebasegen/spresso-connector';

// The `DeletePaymentMethod` mutation requires an argument of type `DeletePaymentMethodVariables`:
const deletePaymentMethodVars: DeletePaymentMethodVariables = {
  id: ..., 
};

// Call the `deletePaymentMethodRef()` function to get a reference to the mutation.
const ref = deletePaymentMethodRef(deletePaymentMethodVars);
// Variables can be defined inline as well.
const ref = deletePaymentMethodRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deletePaymentMethodRef(dataConnect, deletePaymentMethodVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.paymentMethod_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.paymentMethod_delete);
});
```

## UpdateUserSubscription
You can execute the `UpdateUserSubscription` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
updateUserSubscription(vars: UpdateUserSubscriptionVariables): MutationPromise<UpdateUserSubscriptionData, UpdateUserSubscriptionVariables>;

interface UpdateUserSubscriptionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateUserSubscriptionVariables): MutationRef<UpdateUserSubscriptionData, UpdateUserSubscriptionVariables>;
}
export const updateUserSubscriptionRef: UpdateUserSubscriptionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateUserSubscription(dc: DataConnect, vars: UpdateUserSubscriptionVariables): MutationPromise<UpdateUserSubscriptionData, UpdateUserSubscriptionVariables>;

interface UpdateUserSubscriptionRef {
  ...
  (dc: DataConnect, vars: UpdateUserSubscriptionVariables): MutationRef<UpdateUserSubscriptionData, UpdateUserSubscriptionVariables>;
}
export const updateUserSubscriptionRef: UpdateUserSubscriptionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateUserSubscriptionRef:
```typescript
const name = updateUserSubscriptionRef.operationName;
console.log(name);
```

### Variables
The `UpdateUserSubscription` mutation requires an argument of type `UpdateUserSubscriptionVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateUserSubscriptionVariables {
  id: UUIDString;
  tier: string;
}
```
### Return Type
Recall that executing the `UpdateUserSubscription` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateUserSubscriptionData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateUserSubscriptionData {
  userSubscription_update?: UserSubscription_Key | null;
}
```
### Using `UpdateUserSubscription`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateUserSubscription, UpdateUserSubscriptionVariables } from '@firebasegen/spresso-connector';

// The `UpdateUserSubscription` mutation requires an argument of type `UpdateUserSubscriptionVariables`:
const updateUserSubscriptionVars: UpdateUserSubscriptionVariables = {
  id: ..., 
  tier: ..., 
};

// Call the `updateUserSubscription()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateUserSubscription(updateUserSubscriptionVars);
// Variables can be defined inline as well.
const { data } = await updateUserSubscription({ id: ..., tier: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateUserSubscription(dataConnect, updateUserSubscriptionVars);

console.log(data.userSubscription_update);

// Or, you can use the `Promise` API.
updateUserSubscription(updateUserSubscriptionVars).then((response) => {
  const data = response.data;
  console.log(data.userSubscription_update);
});
```

### Using `UpdateUserSubscription`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateUserSubscriptionRef, UpdateUserSubscriptionVariables } from '@firebasegen/spresso-connector';

// The `UpdateUserSubscription` mutation requires an argument of type `UpdateUserSubscriptionVariables`:
const updateUserSubscriptionVars: UpdateUserSubscriptionVariables = {
  id: ..., 
  tier: ..., 
};

// Call the `updateUserSubscriptionRef()` function to get a reference to the mutation.
const ref = updateUserSubscriptionRef(updateUserSubscriptionVars);
// Variables can be defined inline as well.
const ref = updateUserSubscriptionRef({ id: ..., tier: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateUserSubscriptionRef(dataConnect, updateUserSubscriptionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userSubscription_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userSubscription_update);
});
```

## UpsertUserPreference
You can execute the `UpsertUserPreference` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
upsertUserPreference(vars?: UpsertUserPreferenceVariables): MutationPromise<UpsertUserPreferenceData, UpsertUserPreferenceVariables>;

interface UpsertUserPreferenceRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: UpsertUserPreferenceVariables): MutationRef<UpsertUserPreferenceData, UpsertUserPreferenceVariables>;
}
export const upsertUserPreferenceRef: UpsertUserPreferenceRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertUserPreference(dc: DataConnect, vars?: UpsertUserPreferenceVariables): MutationPromise<UpsertUserPreferenceData, UpsertUserPreferenceVariables>;

interface UpsertUserPreferenceRef {
  ...
  (dc: DataConnect, vars?: UpsertUserPreferenceVariables): MutationRef<UpsertUserPreferenceData, UpsertUserPreferenceVariables>;
}
export const upsertUserPreferenceRef: UpsertUserPreferenceRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertUserPreferenceRef:
```typescript
const name = upsertUserPreferenceRef.operationName;
console.log(name);
```

### Variables
The `UpsertUserPreference` mutation has an optional argument of type `UpsertUserPreferenceVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertUserPreferenceVariables {
  theme?: string | null;
  pushNotifications?: boolean | null;
  emailAlerts?: boolean | null;
}
```
### Return Type
Recall that executing the `UpsertUserPreference` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertUserPreferenceData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertUserPreferenceData {
  userPreference_upsert: UserPreference_Key;
}
```
### Using `UpsertUserPreference`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertUserPreference, UpsertUserPreferenceVariables } from '@firebasegen/spresso-connector';

// The `UpsertUserPreference` mutation has an optional argument of type `UpsertUserPreferenceVariables`:
const upsertUserPreferenceVars: UpsertUserPreferenceVariables = {
  theme: ..., // optional
  pushNotifications: ..., // optional
  emailAlerts: ..., // optional
};

// Call the `upsertUserPreference()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertUserPreference(upsertUserPreferenceVars);
// Variables can be defined inline as well.
const { data } = await upsertUserPreference({ theme: ..., pushNotifications: ..., emailAlerts: ..., });
// Since all variables are optional for this mutation, you can omit the `UpsertUserPreferenceVariables` argument.
const { data } = await upsertUserPreference();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertUserPreference(dataConnect, upsertUserPreferenceVars);

console.log(data.userPreference_upsert);

// Or, you can use the `Promise` API.
upsertUserPreference(upsertUserPreferenceVars).then((response) => {
  const data = response.data;
  console.log(data.userPreference_upsert);
});
```

### Using `UpsertUserPreference`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertUserPreferenceRef, UpsertUserPreferenceVariables } from '@firebasegen/spresso-connector';

// The `UpsertUserPreference` mutation has an optional argument of type `UpsertUserPreferenceVariables`:
const upsertUserPreferenceVars: UpsertUserPreferenceVariables = {
  theme: ..., // optional
  pushNotifications: ..., // optional
  emailAlerts: ..., // optional
};

// Call the `upsertUserPreferenceRef()` function to get a reference to the mutation.
const ref = upsertUserPreferenceRef(upsertUserPreferenceVars);
// Variables can be defined inline as well.
const ref = upsertUserPreferenceRef({ theme: ..., pushNotifications: ..., emailAlerts: ..., });
// Since all variables are optional for this mutation, you can omit the `UpsertUserPreferenceVariables` argument.
const ref = upsertUserPreferenceRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertUserPreferenceRef(dataConnect, upsertUserPreferenceVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userPreference_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userPreference_upsert);
});
```

