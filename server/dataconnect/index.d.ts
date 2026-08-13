import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface AddVideoData {
  video_insert: Video_Key;
}

export interface AddVideoVariables {
  productId?: string | null;
  videoUrl: string;
  videoType: string;
}

export interface CartItem_Key {
  id: UUIDString;
  __typename?: 'CartItem_Key';
}

export interface Cart_Key {
  id: UUIDString;
  __typename?: 'Cart_Key';
}

export interface CreateOrderData {
  order_insert: Order_Key;
}

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

export interface GetProductByIdVariables {
  id: string;
}

export interface GetUserCartData {
  carts: ({
    id: UUIDString;
    updatedAt: TimestampString;
  } & Cart_Key)[];
}

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

export interface GetUserProfileData {
  user?: {
    id: string;
    email?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    createdAt: TimestampString;
  } & User_Key;
}

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

export interface UpsertUserProfileData {
  user_upsert: User_Key;
}

export interface UpsertUserProfileVariables {
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface UserLike_Key {
  userUid: string;
  productId: string;
  __typename?: 'UserLike_Key';
}

export interface User_Key {
  id: string;
  __typename?: 'User_Key';
}

export interface Video_Key {
  id: UUIDString;
  __typename?: 'Video_Key';
}

/** Generated Node Admin SDK operation action function for the 'UpsertUserProfile' Mutation. Allow users to execute without passing in DataConnect. */
export function upsertUserProfile(dc: DataConnect, vars?: UpsertUserProfileVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpsertUserProfileData>>;
/** Generated Node Admin SDK operation action function for the 'UpsertUserProfile' Mutation. Allow users to pass in custom DataConnect instances. */
export function upsertUserProfile(vars?: UpsertUserProfileVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpsertUserProfileData>>;

/** Generated Node Admin SDK operation action function for the 'CreateOrder' Mutation. Allow users to execute without passing in DataConnect. */
export function createOrder(dc: DataConnect, vars: CreateOrderVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateOrderData>>;
/** Generated Node Admin SDK operation action function for the 'CreateOrder' Mutation. Allow users to pass in custom DataConnect instances. */
export function createOrder(vars: CreateOrderVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateOrderData>>;

/** Generated Node Admin SDK operation action function for the 'AddVideo' Mutation. Allow users to execute without passing in DataConnect. */
export function addVideo(dc: DataConnect, vars: AddVideoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddVideoData>>;
/** Generated Node Admin SDK operation action function for the 'AddVideo' Mutation. Allow users to pass in custom DataConnect instances. */
export function addVideo(vars: AddVideoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddVideoData>>;

/** Generated Node Admin SDK operation action function for the 'ToggleLike' Mutation. Allow users to execute without passing in DataConnect. */
export function toggleLike(dc: DataConnect, vars: ToggleLikeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ToggleLikeData>>;
/** Generated Node Admin SDK operation action function for the 'ToggleLike' Mutation. Allow users to pass in custom DataConnect instances. */
export function toggleLike(vars: ToggleLikeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ToggleLikeData>>;

/** Generated Node Admin SDK operation action function for the 'ListProducts' Query. Allow users to execute without passing in DataConnect. */
export function listProducts(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListProductsData>>;
/** Generated Node Admin SDK operation action function for the 'ListProducts' Query. Allow users to pass in custom DataConnect instances. */
export function listProducts(options?: OperationOptions): Promise<ExecuteOperationResponse<ListProductsData>>;

/** Generated Node Admin SDK operation action function for the 'GetProductById' Query. Allow users to execute without passing in DataConnect. */
export function getProductById(dc: DataConnect, vars: GetProductByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetProductByIdData>>;
/** Generated Node Admin SDK operation action function for the 'GetProductById' Query. Allow users to pass in custom DataConnect instances. */
export function getProductById(vars: GetProductByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetProductByIdData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserProfile' Query. Allow users to execute without passing in DataConnect. */
export function getUserProfile(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserProfileData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserProfile' Query. Allow users to pass in custom DataConnect instances. */
export function getUserProfile(options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserProfileData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserOrders' Query. Allow users to execute without passing in DataConnect. */
export function getUserOrders(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserOrdersData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserOrders' Query. Allow users to pass in custom DataConnect instances. */
export function getUserOrders(options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserOrdersData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserVideos' Query. Allow users to execute without passing in DataConnect. */
export function getUserVideos(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserVideosData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserVideos' Query. Allow users to pass in custom DataConnect instances. */
export function getUserVideos(options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserVideosData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserCart' Query. Allow users to execute without passing in DataConnect. */
export function getUserCart(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserCartData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserCart' Query. Allow users to pass in custom DataConnect instances. */
export function getUserCart(options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserCartData>>;

