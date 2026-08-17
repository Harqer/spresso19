import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface ActiveCookingSession_Key {
  id: UUIDString;
  __typename?: 'ActiveCookingSession_Key';
}

export interface AddGroceryItemData {
  groceryListItem_insert: GroceryListItem_Key;
}

export interface AddGroceryItemVariables {
  listId: UUIDString;
  productName: string;
  productId?: string | null;
  addedVia: string;
}

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

export interface CreateExpenseData {
  travelExpense_insert: TravelExpense_Key;
}

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

export interface CreateGroceryListData {
  groceryList_insert: GroceryList_Key;
}

export interface CreateGroceryListVariables {
  userId: string;
  title: string;
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

export interface CreatePaymentMethodData {
  paymentMethod_insert: PaymentMethod_Key;
}

export interface CreatePaymentMethodVariables {
  stripePaymentMethodId: string;
}

export interface CreateTravelExpenseData {
  travelExpense_insert: TravelExpense_Key;
}

export interface CreateTravelExpenseVariables {
  tripId: UUIDString;
  amount: number;
  currency?: string | null;
  category: string;
  merchant: string;
  items?: string | null;
}

export interface CreateVoiceNoteData {
  voiceNote_insert: VoiceNote_Key;
}

export interface CreateVoiceNoteVariables {
  tripId: UUIDString;
  transcript: string;
}

export interface DeleteGroceryItemData {
  groceryListItem_delete?: GroceryListItem_Key | null;
}

export interface DeleteGroceryItemVariables {
  id: UUIDString;
}

export interface DeletePaymentMethodData {
  paymentMethod_delete?: PaymentMethod_Key | null;
}

export interface DeletePaymentMethodVariables {
  id: UUIDString;
}

export interface GetGroceryListData {
  groceryLists: ({
    id: UUIDString;
    title: string;
    createdAt: TimestampString;
    items: ({
      id: UUIDString;
      productName: string;
      productId?: string | null;
      isPurchased: boolean;
      addedVia: string;
      createdAt: TimestampString;
    } & GroceryListItem_Key)[];
  } & GroceryList_Key)[];
}

export interface GetGroceryListVariables {
  userId: string;
}

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

export interface GetPaymentMethodsData {
  paymentMethods: ({
    id: UUIDString;
    isDefault?: boolean | null;
    stripePaymentMethodId?: string | null;
  } & PaymentMethod_Key)[];
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

export interface GetUserPreferenceData {
  userPreferences: ({
    userId: string;
    theme?: string | null;
    pushNotifications?: boolean | null;
    emailAlerts?: boolean | null;
  } & UserPreference_Key)[];
}

export interface GetUserPreferencesData {
  userPreferences: ({
    userId: string;
    theme?: string | null;
    pushNotifications?: boolean | null;
    emailAlerts?: boolean | null;
  } & UserPreference_Key)[];
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

export interface GetUserSubscriptionData {
  userSubscriptions: ({
    id: UUIDString;
    tier?: string | null;
    status?: string | null;
    currentPeriodEnd?: string | null;
    stripeSubscriptionId?: string | null;
  } & UserSubscription_Key)[];
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

export interface GetVoiceNotesData {
  voiceNotes: ({
    id: UUIDString;
    tripId: UUIDString;
    transcript: string;
    audioUrl?: string | null;
    createdAt: TimestampString;
  } & VoiceNote_Key)[];
}

export interface GroceryListItem_Key {
  id: UUIDString;
  __typename?: 'GroceryListItem_Key';
}

export interface GroceryList_Key {
  id: UUIDString;
  __typename?: 'GroceryList_Key';
}

export interface ItineraryEvent_Key {
  id: UUIDString;
  __typename?: 'ItineraryEvent_Key';
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

export interface PaymentMethod_Key {
  id: UUIDString;
  __typename?: 'PaymentMethod_Key';
}

export interface Product_Key {
  id: string;
  __typename?: 'Product_Key';
}

export interface ToggleGroceryItemData {
  groceryListItem_update?: GroceryListItem_Key | null;
}

export interface ToggleGroceryItemVariables {
  id: UUIDString;
  isPurchased: boolean;
}

export interface ToggleLikeData {
  userLike_upsert: UserLike_Key;
}

export interface ToggleLikeVariables {
  productId: string;
}

export interface TravelExpense_Key {
  id: UUIDString;
  __typename?: 'TravelExpense_Key';
}

export interface Trip_Key {
  id: UUIDString;
  __typename?: 'Trip_Key';
}

export interface UpdateUserSubscriptionData {
  userSubscription_update?: UserSubscription_Key | null;
}

export interface UpdateUserSubscriptionVariables {
  id: UUIDString;
  tier: string;
}

export interface UpsertUserPreferenceData {
  userPreference_upsert: UserPreference_Key;
}

export interface UpsertUserPreferenceVariables {
  theme?: string | null;
  pushNotifications?: boolean | null;
  emailAlerts?: boolean | null;
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

export interface UserPreference_Key {
  userId: string;
  __typename?: 'UserPreference_Key';
}

export interface UserSubscription_Key {
  id: UUIDString;
  __typename?: 'UserSubscription_Key';
}

export interface User_Key {
  id: string;
  __typename?: 'User_Key';
}

export interface Video_Key {
  id: UUIDString;
  __typename?: 'Video_Key';
}

export interface VoiceNote_Key {
  id: UUIDString;
  __typename?: 'VoiceNote_Key';
}

interface UpsertUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
  operationName: string;
}
export const upsertUserProfileRef: UpsertUserProfileRef;

export function upsertUserProfile(vars?: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;
export function upsertUserProfile(dc: DataConnect, vars?: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;

interface CreateOrderRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateOrderVariables): MutationRef<CreateOrderData, CreateOrderVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateOrderVariables): MutationRef<CreateOrderData, CreateOrderVariables>;
  operationName: string;
}
export const createOrderRef: CreateOrderRef;

export function createOrder(vars: CreateOrderVariables): MutationPromise<CreateOrderData, CreateOrderVariables>;
export function createOrder(dc: DataConnect, vars: CreateOrderVariables): MutationPromise<CreateOrderData, CreateOrderVariables>;

interface AddVideoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddVideoVariables): MutationRef<AddVideoData, AddVideoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddVideoVariables): MutationRef<AddVideoData, AddVideoVariables>;
  operationName: string;
}
export const addVideoRef: AddVideoRef;

export function addVideo(vars: AddVideoVariables): MutationPromise<AddVideoData, AddVideoVariables>;
export function addVideo(dc: DataConnect, vars: AddVideoVariables): MutationPromise<AddVideoData, AddVideoVariables>;

interface ToggleLikeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ToggleLikeVariables): MutationRef<ToggleLikeData, ToggleLikeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ToggleLikeVariables): MutationRef<ToggleLikeData, ToggleLikeVariables>;
  operationName: string;
}
export const toggleLikeRef: ToggleLikeRef;

export function toggleLike(vars: ToggleLikeVariables): MutationPromise<ToggleLikeData, ToggleLikeVariables>;
export function toggleLike(dc: DataConnect, vars: ToggleLikeVariables): MutationPromise<ToggleLikeData, ToggleLikeVariables>;

interface CreateExpenseRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateExpenseVariables): MutationRef<CreateExpenseData, CreateExpenseVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateExpenseVariables): MutationRef<CreateExpenseData, CreateExpenseVariables>;
  operationName: string;
}
export const createExpenseRef: CreateExpenseRef;

export function createExpense(vars: CreateExpenseVariables): MutationPromise<CreateExpenseData, CreateExpenseVariables>;
export function createExpense(dc: DataConnect, vars: CreateExpenseVariables): MutationPromise<CreateExpenseData, CreateExpenseVariables>;

interface CreateTravelExpenseRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTravelExpenseVariables): MutationRef<CreateTravelExpenseData, CreateTravelExpenseVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateTravelExpenseVariables): MutationRef<CreateTravelExpenseData, CreateTravelExpenseVariables>;
  operationName: string;
}
export const createTravelExpenseRef: CreateTravelExpenseRef;

export function createTravelExpense(vars: CreateTravelExpenseVariables): MutationPromise<CreateTravelExpenseData, CreateTravelExpenseVariables>;
export function createTravelExpense(dc: DataConnect, vars: CreateTravelExpenseVariables): MutationPromise<CreateTravelExpenseData, CreateTravelExpenseVariables>;

interface CreateVoiceNoteRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateVoiceNoteVariables): MutationRef<CreateVoiceNoteData, CreateVoiceNoteVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateVoiceNoteVariables): MutationRef<CreateVoiceNoteData, CreateVoiceNoteVariables>;
  operationName: string;
}
export const createVoiceNoteRef: CreateVoiceNoteRef;

export function createVoiceNote(vars: CreateVoiceNoteVariables): MutationPromise<CreateVoiceNoteData, CreateVoiceNoteVariables>;
export function createVoiceNote(dc: DataConnect, vars: CreateVoiceNoteVariables): MutationPromise<CreateVoiceNoteData, CreateVoiceNoteVariables>;

interface CreatePaymentMethodRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePaymentMethodVariables): MutationRef<CreatePaymentMethodData, CreatePaymentMethodVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreatePaymentMethodVariables): MutationRef<CreatePaymentMethodData, CreatePaymentMethodVariables>;
  operationName: string;
}
export const createPaymentMethodRef: CreatePaymentMethodRef;

export function createPaymentMethod(vars: CreatePaymentMethodVariables): MutationPromise<CreatePaymentMethodData, CreatePaymentMethodVariables>;
export function createPaymentMethod(dc: DataConnect, vars: CreatePaymentMethodVariables): MutationPromise<CreatePaymentMethodData, CreatePaymentMethodVariables>;

interface DeletePaymentMethodRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeletePaymentMethodVariables): MutationRef<DeletePaymentMethodData, DeletePaymentMethodVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeletePaymentMethodVariables): MutationRef<DeletePaymentMethodData, DeletePaymentMethodVariables>;
  operationName: string;
}
export const deletePaymentMethodRef: DeletePaymentMethodRef;

export function deletePaymentMethod(vars: DeletePaymentMethodVariables): MutationPromise<DeletePaymentMethodData, DeletePaymentMethodVariables>;
export function deletePaymentMethod(dc: DataConnect, vars: DeletePaymentMethodVariables): MutationPromise<DeletePaymentMethodData, DeletePaymentMethodVariables>;

interface UpdateUserSubscriptionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateUserSubscriptionVariables): MutationRef<UpdateUserSubscriptionData, UpdateUserSubscriptionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateUserSubscriptionVariables): MutationRef<UpdateUserSubscriptionData, UpdateUserSubscriptionVariables>;
  operationName: string;
}
export const updateUserSubscriptionRef: UpdateUserSubscriptionRef;

export function updateUserSubscription(vars: UpdateUserSubscriptionVariables): MutationPromise<UpdateUserSubscriptionData, UpdateUserSubscriptionVariables>;
export function updateUserSubscription(dc: DataConnect, vars: UpdateUserSubscriptionVariables): MutationPromise<UpdateUserSubscriptionData, UpdateUserSubscriptionVariables>;

interface UpsertUserPreferenceRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: UpsertUserPreferenceVariables): MutationRef<UpsertUserPreferenceData, UpsertUserPreferenceVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: UpsertUserPreferenceVariables): MutationRef<UpsertUserPreferenceData, UpsertUserPreferenceVariables>;
  operationName: string;
}
export const upsertUserPreferenceRef: UpsertUserPreferenceRef;

export function upsertUserPreference(vars?: UpsertUserPreferenceVariables): MutationPromise<UpsertUserPreferenceData, UpsertUserPreferenceVariables>;
export function upsertUserPreference(dc: DataConnect, vars?: UpsertUserPreferenceVariables): MutationPromise<UpsertUserPreferenceData, UpsertUserPreferenceVariables>;

interface CreateGroceryListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateGroceryListVariables): MutationRef<CreateGroceryListData, CreateGroceryListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateGroceryListVariables): MutationRef<CreateGroceryListData, CreateGroceryListVariables>;
  operationName: string;
}
export const createGroceryListRef: CreateGroceryListRef;

export function createGroceryList(vars: CreateGroceryListVariables): MutationPromise<CreateGroceryListData, CreateGroceryListVariables>;
export function createGroceryList(dc: DataConnect, vars: CreateGroceryListVariables): MutationPromise<CreateGroceryListData, CreateGroceryListVariables>;

interface AddGroceryItemRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddGroceryItemVariables): MutationRef<AddGroceryItemData, AddGroceryItemVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddGroceryItemVariables): MutationRef<AddGroceryItemData, AddGroceryItemVariables>;
  operationName: string;
}
export const addGroceryItemRef: AddGroceryItemRef;

export function addGroceryItem(vars: AddGroceryItemVariables): MutationPromise<AddGroceryItemData, AddGroceryItemVariables>;
export function addGroceryItem(dc: DataConnect, vars: AddGroceryItemVariables): MutationPromise<AddGroceryItemData, AddGroceryItemVariables>;

interface ToggleGroceryItemRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ToggleGroceryItemVariables): MutationRef<ToggleGroceryItemData, ToggleGroceryItemVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ToggleGroceryItemVariables): MutationRef<ToggleGroceryItemData, ToggleGroceryItemVariables>;
  operationName: string;
}
export const toggleGroceryItemRef: ToggleGroceryItemRef;

export function toggleGroceryItem(vars: ToggleGroceryItemVariables): MutationPromise<ToggleGroceryItemData, ToggleGroceryItemVariables>;
export function toggleGroceryItem(dc: DataConnect, vars: ToggleGroceryItemVariables): MutationPromise<ToggleGroceryItemData, ToggleGroceryItemVariables>;

interface DeleteGroceryItemRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteGroceryItemVariables): MutationRef<DeleteGroceryItemData, DeleteGroceryItemVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteGroceryItemVariables): MutationRef<DeleteGroceryItemData, DeleteGroceryItemVariables>;
  operationName: string;
}
export const deleteGroceryItemRef: DeleteGroceryItemRef;

export function deleteGroceryItem(vars: DeleteGroceryItemVariables): MutationPromise<DeleteGroceryItemData, DeleteGroceryItemVariables>;
export function deleteGroceryItem(dc: DataConnect, vars: DeleteGroceryItemVariables): MutationPromise<DeleteGroceryItemData, DeleteGroceryItemVariables>;

interface ListProductsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProductsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListProductsData, undefined>;
  operationName: string;
}
export const listProductsRef: ListProductsRef;

export function listProducts(options?: ExecuteQueryOptions): QueryPromise<ListProductsData, undefined>;
export function listProducts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProductsData, undefined>;

interface GetProductByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProductByIdVariables): QueryRef<GetProductByIdData, GetProductByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetProductByIdVariables): QueryRef<GetProductByIdData, GetProductByIdVariables>;
  operationName: string;
}
export const getProductByIdRef: GetProductByIdRef;

export function getProductById(vars: GetProductByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductByIdData, GetProductByIdVariables>;
export function getProductById(dc: DataConnect, vars: GetProductByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductByIdData, GetProductByIdVariables>;

interface GetUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserProfileData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserProfileData, undefined>;
  operationName: string;
}
export const getUserProfileRef: GetUserProfileRef;

export function getUserProfile(options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, undefined>;
export function getUserProfile(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, undefined>;

interface GetUserOrdersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserOrdersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserOrdersData, undefined>;
  operationName: string;
}
export const getUserOrdersRef: GetUserOrdersRef;

export function getUserOrders(options?: ExecuteQueryOptions): QueryPromise<GetUserOrdersData, undefined>;
export function getUserOrders(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserOrdersData, undefined>;

interface GetUserVideosRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserVideosData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserVideosData, undefined>;
  operationName: string;
}
export const getUserVideosRef: GetUserVideosRef;

export function getUserVideos(options?: ExecuteQueryOptions): QueryPromise<GetUserVideosData, undefined>;
export function getUserVideos(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserVideosData, undefined>;

interface GetUserCartRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserCartData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserCartData, undefined>;
  operationName: string;
}
export const getUserCartRef: GetUserCartRef;

export function getUserCart(options?: ExecuteQueryOptions): QueryPromise<GetUserCartData, undefined>;
export function getUserCart(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserCartData, undefined>;

interface GetTripsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTripsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetTripsData, undefined>;
  operationName: string;
}
export const getTripsRef: GetTripsRef;

export function getTrips(options?: ExecuteQueryOptions): QueryPromise<GetTripsData, undefined>;
export function getTrips(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetTripsData, undefined>;

interface GetUserPreferencesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserPreferencesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserPreferencesData, undefined>;
  operationName: string;
}
export const getUserPreferencesRef: GetUserPreferencesRef;

export function getUserPreferences(options?: ExecuteQueryOptions): QueryPromise<GetUserPreferencesData, undefined>;
export function getUserPreferences(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserPreferencesData, undefined>;

interface GetItineraryEventsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetItineraryEventsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetItineraryEventsData, undefined>;
  operationName: string;
}
export const getItineraryEventsRef: GetItineraryEventsRef;

export function getItineraryEvents(options?: ExecuteQueryOptions): QueryPromise<GetItineraryEventsData, undefined>;
export function getItineraryEvents(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetItineraryEventsData, undefined>;

interface GetTravelExpensesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTravelExpensesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetTravelExpensesData, undefined>;
  operationName: string;
}
export const getTravelExpensesRef: GetTravelExpensesRef;

export function getTravelExpenses(options?: ExecuteQueryOptions): QueryPromise<GetTravelExpensesData, undefined>;
export function getTravelExpenses(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetTravelExpensesData, undefined>;

interface GetVoiceNotesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetVoiceNotesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetVoiceNotesData, undefined>;
  operationName: string;
}
export const getVoiceNotesRef: GetVoiceNotesRef;

export function getVoiceNotes(options?: ExecuteQueryOptions): QueryPromise<GetVoiceNotesData, undefined>;
export function getVoiceNotes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetVoiceNotesData, undefined>;

interface GetPaymentMethodsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPaymentMethodsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetPaymentMethodsData, undefined>;
  operationName: string;
}
export const getPaymentMethodsRef: GetPaymentMethodsRef;

export function getPaymentMethods(options?: ExecuteQueryOptions): QueryPromise<GetPaymentMethodsData, undefined>;
export function getPaymentMethods(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetPaymentMethodsData, undefined>;

interface GetUserSubscriptionRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserSubscriptionData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserSubscriptionData, undefined>;
  operationName: string;
}
export const getUserSubscriptionRef: GetUserSubscriptionRef;

export function getUserSubscription(options?: ExecuteQueryOptions): QueryPromise<GetUserSubscriptionData, undefined>;
export function getUserSubscription(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserSubscriptionData, undefined>;

interface GetUserPreferenceRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserPreferenceData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserPreferenceData, undefined>;
  operationName: string;
}
export const getUserPreferenceRef: GetUserPreferenceRef;

export function getUserPreference(options?: ExecuteQueryOptions): QueryPromise<GetUserPreferenceData, undefined>;
export function getUserPreference(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserPreferenceData, undefined>;

interface GetGroceryListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetGroceryListVariables): QueryRef<GetGroceryListData, GetGroceryListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetGroceryListVariables): QueryRef<GetGroceryListData, GetGroceryListVariables>;
  operationName: string;
}
export const getGroceryListRef: GetGroceryListRef;

export function getGroceryList(vars: GetGroceryListVariables, options?: ExecuteQueryOptions): QueryPromise<GetGroceryListData, GetGroceryListVariables>;
export function getGroceryList(dc: DataConnect, vars: GetGroceryListVariables, options?: ExecuteQueryOptions): QueryPromise<GetGroceryListData, GetGroceryListVariables>;

