import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface CreateOrderData {
  order_insert: Order_Key;
}

export interface CreateOrderVariables {
  authorizationId: string;
  productId: string;
  quantity: number;
  deviceSource: string;
  paymentMethod: string;
}

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

export interface Order_Key {
  id: UUIDString;
  __typename?: 'Order_Key';
}

export interface Product_Key {
  id: string;
  __typename?: 'Product_Key';
}

export interface ToggleLikeData {
  userLike_upsert: UserLike_Key;
}

export interface ToggleLikeVariables {
  productId: string;
}

export interface UserLike_Key {
  userUid: string;
  productId: string;
  __typename?: 'UserLike_Key';
}

/** Generated Node Admin SDK operation action function for the 'ToggleLike' Mutation. Allow users to execute without passing in DataConnect. */
export function toggleLike(dc: DataConnect, vars: ToggleLikeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ToggleLikeData>>;
/** Generated Node Admin SDK operation action function for the 'ToggleLike' Mutation. Allow users to pass in custom DataConnect instances. */
export function toggleLike(vars: ToggleLikeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ToggleLikeData>>;

/** Generated Node Admin SDK operation action function for the 'CreateOrder' Mutation. Allow users to execute without passing in DataConnect. */
export function createOrder(dc: DataConnect, vars: CreateOrderVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateOrderData>>;
/** Generated Node Admin SDK operation action function for the 'CreateOrder' Mutation. Allow users to pass in custom DataConnect instances. */
export function createOrder(vars: CreateOrderVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateOrderData>>;

/** Generated Node Admin SDK operation action function for the 'ListProducts' Query. Allow users to execute without passing in DataConnect. */
export function listProducts(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListProductsData>>;
/** Generated Node Admin SDK operation action function for the 'ListProducts' Query. Allow users to pass in custom DataConnect instances. */
export function listProducts(options?: OperationOptions): Promise<ExecuteOperationResponse<ListProductsData>>;

