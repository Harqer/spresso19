import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

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

export interface AddWardrobeItemData {
  wardrobeItem_insert: WardrobeItem_Key;
}

export interface AddWardrobeItemVariables {
  outfitId?: UUIDString | null;
  category: string;
  brand?: string | null;
  imageUrl: string;
  color?: string | null;
}

export interface AgentQuickPrompt_Key {
  id: UUIDString;
  __typename?: 'AgentQuickPrompt_Key';
}

export interface CartItem_Key {
  id: UUIDString;
  __typename?: 'CartItem_Key';
}

export interface Cart_Key {
  id: UUIDString;
  __typename?: 'Cart_Key';
}

export interface CoinbaseWallet_Key {
  userId: string;
  __typename?: 'CoinbaseWallet_Key';
}

export interface ConnectCoinbaseWalletData {
  coinbaseWallet_upsert: CoinbaseWallet_Key;
}

export interface ConnectCoinbaseWalletVariables {
  walletAddress: string;
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

export interface CreateWardrobeOutfitData {
  wardrobeOutfit_insert: WardrobeOutfit_Key;
}

export interface CreateWardrobeOutfitVariables {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface CreativeTemplate_Key {
  id: UUIDString;
  __typename?: 'CreativeTemplate_Key';
}

export interface CreatorAgent_Key {
  id: UUIDString;
  __typename?: 'CreatorAgent_Key';
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

export interface GetCreativeTemplatesData {
  creativeTemplates: ({
    id: UUIDString;
    name: string;
    creator: string;
    category: string;
    description?: string | null;
    iconName: string;
    promptExample?: string | null;
    createdAt: TimestampString;
  } & CreativeTemplate_Key)[];
}

export interface GetCreatorAgentsData {
  creatorAgents: ({
    id: UUIDString;
    title: string;
    badge?: string | null;
    subtitle: string;
    iconName: string;
    capabilities: string;
    createdAt: TimestampString;
    quickPrompts: ({
      id: UUIDString;
      label: string;
      prompt: string;
    } & AgentQuickPrompt_Key)[];
  } & CreatorAgent_Key)[];
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

export interface GetOnboardingStatusData {
  onboardingStatuses: ({
    userId: string;
    currentStep: number;
    isCompleted: boolean;
    updatedAt: TimestampString;
  } & OnboardingStatus_Key)[];
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
    brand: string;
    category: string;
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

export interface GetVisionHistoryData {
  visionHistories: ({
    id: UUIDString;
    detectedObjects: string;
    context?: string | null;
    imageUrl?: string | null;
    createdAt: TimestampString;
  } & VisionHistory_Key)[];
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

export interface GetWardrobeItemsData {
  wardrobeItems: ({
    id: UUIDString;
    category: string;
    brand?: string | null;
    imageUrl: string;
    color?: string | null;
    createdAt: TimestampString;
  } & WardrobeItem_Key)[];
}

export interface GetWardrobeOutfitsData {
  wardrobeOutfits: ({
    id: UUIDString;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    createdAt: TimestampString;
    items: ({
      id: UUIDString;
      category: string;
      brand?: string | null;
      imageUrl: string;
      color?: string | null;
    } & WardrobeItem_Key)[];
  } & WardrobeOutfit_Key)[];
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
    brand: string;
    category: string;
    price: number;
    image?: string | null;
    description?: string | null;
    likesCount: number;
  } & Product_Key)[];
}

export interface LogVisionEventData {
  visionHistory_insert: VisionHistory_Key;
}

export interface LogVisionEventVariables {
  detectedObjects: string;
  context?: string | null;
  imageUrl?: string | null;
}

export interface OnboardingStatus_Key {
  userId: string;
  __typename?: 'OnboardingStatus_Key';
}

export interface Order_Key {
  id: UUIDString;
  __typename?: 'Order_Key';
}

export interface PasskeyCredential_Key {
  userId: string;
  __typename?: 'PasskeyCredential_Key';
}

export interface PaymentMethod_Key {
  id: UUIDString;
  __typename?: 'PaymentMethod_Key';
}

export interface Product_Key {
  id: string;
  __typename?: 'Product_Key';
}

export interface RegisterPasskeyData {
  passkeyCredential_upsert: PasskeyCredential_Key;
}

export interface RegisterPasskeyVariables {
  credentialId: string;
  publicKey: string;
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

export interface UpdateOnboardingStatusData {
  onboardingStatus_upsert: OnboardingStatus_Key;
}

export interface UpdateOnboardingStatusVariables {
  currentStep: number;
  isCompleted: boolean;
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

export interface VisionHistory_Key {
  id: UUIDString;
  __typename?: 'VisionHistory_Key';
}

export interface VoiceNote_Key {
  id: UUIDString;
  __typename?: 'VoiceNote_Key';
}

export interface WardrobeItem_Key {
  id: UUIDString;
  __typename?: 'WardrobeItem_Key';
}

export interface WardrobeOutfit_Key {
  id: UUIDString;
  __typename?: 'WardrobeOutfit_Key';
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

/** Generated Node Admin SDK operation action function for the 'CreateExpense' Mutation. Allow users to execute without passing in DataConnect. */
export function createExpense(dc: DataConnect, vars: CreateExpenseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateExpenseData>>;
/** Generated Node Admin SDK operation action function for the 'CreateExpense' Mutation. Allow users to pass in custom DataConnect instances. */
export function createExpense(vars: CreateExpenseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateExpenseData>>;

/** Generated Node Admin SDK operation action function for the 'CreateTravelExpense' Mutation. Allow users to execute without passing in DataConnect. */
export function createTravelExpense(dc: DataConnect, vars: CreateTravelExpenseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateTravelExpenseData>>;
/** Generated Node Admin SDK operation action function for the 'CreateTravelExpense' Mutation. Allow users to pass in custom DataConnect instances. */
export function createTravelExpense(vars: CreateTravelExpenseVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateTravelExpenseData>>;

/** Generated Node Admin SDK operation action function for the 'CreateVoiceNote' Mutation. Allow users to execute without passing in DataConnect. */
export function createVoiceNote(dc: DataConnect, vars: CreateVoiceNoteVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateVoiceNoteData>>;
/** Generated Node Admin SDK operation action function for the 'CreateVoiceNote' Mutation. Allow users to pass in custom DataConnect instances. */
export function createVoiceNote(vars: CreateVoiceNoteVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateVoiceNoteData>>;

/** Generated Node Admin SDK operation action function for the 'CreatePaymentMethod' Mutation. Allow users to execute without passing in DataConnect. */
export function createPaymentMethod(dc: DataConnect, vars: CreatePaymentMethodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePaymentMethodData>>;
/** Generated Node Admin SDK operation action function for the 'CreatePaymentMethod' Mutation. Allow users to pass in custom DataConnect instances. */
export function createPaymentMethod(vars: CreatePaymentMethodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePaymentMethodData>>;

/** Generated Node Admin SDK operation action function for the 'DeletePaymentMethod' Mutation. Allow users to execute without passing in DataConnect. */
export function deletePaymentMethod(dc: DataConnect, vars: DeletePaymentMethodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeletePaymentMethodData>>;
/** Generated Node Admin SDK operation action function for the 'DeletePaymentMethod' Mutation. Allow users to pass in custom DataConnect instances. */
export function deletePaymentMethod(vars: DeletePaymentMethodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeletePaymentMethodData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateUserSubscription' Mutation. Allow users to execute without passing in DataConnect. */
export function updateUserSubscription(dc: DataConnect, vars: UpdateUserSubscriptionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateUserSubscriptionData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateUserSubscription' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateUserSubscription(vars: UpdateUserSubscriptionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateUserSubscriptionData>>;

/** Generated Node Admin SDK operation action function for the 'UpsertUserPreference' Mutation. Allow users to execute without passing in DataConnect. */
export function upsertUserPreference(dc: DataConnect, vars?: UpsertUserPreferenceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpsertUserPreferenceData>>;
/** Generated Node Admin SDK operation action function for the 'UpsertUserPreference' Mutation. Allow users to pass in custom DataConnect instances. */
export function upsertUserPreference(vars?: UpsertUserPreferenceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpsertUserPreferenceData>>;

/** Generated Node Admin SDK operation action function for the 'CreateGroceryList' Mutation. Allow users to execute without passing in DataConnect. */
export function createGroceryList(dc: DataConnect, vars: CreateGroceryListVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateGroceryListData>>;
/** Generated Node Admin SDK operation action function for the 'CreateGroceryList' Mutation. Allow users to pass in custom DataConnect instances. */
export function createGroceryList(vars: CreateGroceryListVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateGroceryListData>>;

/** Generated Node Admin SDK operation action function for the 'AddGroceryItem' Mutation. Allow users to execute without passing in DataConnect. */
export function addGroceryItem(dc: DataConnect, vars: AddGroceryItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddGroceryItemData>>;
/** Generated Node Admin SDK operation action function for the 'AddGroceryItem' Mutation. Allow users to pass in custom DataConnect instances. */
export function addGroceryItem(vars: AddGroceryItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddGroceryItemData>>;

/** Generated Node Admin SDK operation action function for the 'ToggleGroceryItem' Mutation. Allow users to execute without passing in DataConnect. */
export function toggleGroceryItem(dc: DataConnect, vars: ToggleGroceryItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ToggleGroceryItemData>>;
/** Generated Node Admin SDK operation action function for the 'ToggleGroceryItem' Mutation. Allow users to pass in custom DataConnect instances. */
export function toggleGroceryItem(vars: ToggleGroceryItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ToggleGroceryItemData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteGroceryItem' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteGroceryItem(dc: DataConnect, vars: DeleteGroceryItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteGroceryItemData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteGroceryItem' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteGroceryItem(vars: DeleteGroceryItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteGroceryItemData>>;

/** Generated Node Admin SDK operation action function for the 'CreateWardrobeOutfit' Mutation. Allow users to execute without passing in DataConnect. */
export function createWardrobeOutfit(dc: DataConnect, vars: CreateWardrobeOutfitVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateWardrobeOutfitData>>;
/** Generated Node Admin SDK operation action function for the 'CreateWardrobeOutfit' Mutation. Allow users to pass in custom DataConnect instances. */
export function createWardrobeOutfit(vars: CreateWardrobeOutfitVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateWardrobeOutfitData>>;

/** Generated Node Admin SDK operation action function for the 'AddWardrobeItem' Mutation. Allow users to execute without passing in DataConnect. */
export function addWardrobeItem(dc: DataConnect, vars: AddWardrobeItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddWardrobeItemData>>;
/** Generated Node Admin SDK operation action function for the 'AddWardrobeItem' Mutation. Allow users to pass in custom DataConnect instances. */
export function addWardrobeItem(vars: AddWardrobeItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddWardrobeItemData>>;

/** Generated Node Admin SDK operation action function for the 'LogVisionEvent' Mutation. Allow users to execute without passing in DataConnect. */
export function logVisionEvent(dc: DataConnect, vars: LogVisionEventVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<LogVisionEventData>>;
/** Generated Node Admin SDK operation action function for the 'LogVisionEvent' Mutation. Allow users to pass in custom DataConnect instances. */
export function logVisionEvent(vars: LogVisionEventVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<LogVisionEventData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateOnboardingStatus' Mutation. Allow users to execute without passing in DataConnect. */
export function updateOnboardingStatus(dc: DataConnect, vars: UpdateOnboardingStatusVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateOnboardingStatusData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateOnboardingStatus' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateOnboardingStatus(vars: UpdateOnboardingStatusVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateOnboardingStatusData>>;

/** Generated Node Admin SDK operation action function for the 'ConnectCoinbaseWallet' Mutation. Allow users to execute without passing in DataConnect. */
export function connectCoinbaseWallet(dc: DataConnect, vars: ConnectCoinbaseWalletVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ConnectCoinbaseWalletData>>;
/** Generated Node Admin SDK operation action function for the 'ConnectCoinbaseWallet' Mutation. Allow users to pass in custom DataConnect instances. */
export function connectCoinbaseWallet(vars: ConnectCoinbaseWalletVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ConnectCoinbaseWalletData>>;

/** Generated Node Admin SDK operation action function for the 'RegisterPasskey' Mutation. Allow users to execute without passing in DataConnect. */
export function registerPasskey(dc: DataConnect, vars: RegisterPasskeyVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RegisterPasskeyData>>;
/** Generated Node Admin SDK operation action function for the 'RegisterPasskey' Mutation. Allow users to pass in custom DataConnect instances. */
export function registerPasskey(vars: RegisterPasskeyVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RegisterPasskeyData>>;

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

/** Generated Node Admin SDK operation action function for the 'GetTrips' Query. Allow users to execute without passing in DataConnect. */
export function getTrips(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetTripsData>>;
/** Generated Node Admin SDK operation action function for the 'GetTrips' Query. Allow users to pass in custom DataConnect instances. */
export function getTrips(options?: OperationOptions): Promise<ExecuteOperationResponse<GetTripsData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserPreferences' Query. Allow users to execute without passing in DataConnect. */
export function getUserPreferences(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserPreferencesData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserPreferences' Query. Allow users to pass in custom DataConnect instances. */
export function getUserPreferences(options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserPreferencesData>>;

/** Generated Node Admin SDK operation action function for the 'GetItineraryEvents' Query. Allow users to execute without passing in DataConnect. */
export function getItineraryEvents(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetItineraryEventsData>>;
/** Generated Node Admin SDK operation action function for the 'GetItineraryEvents' Query. Allow users to pass in custom DataConnect instances. */
export function getItineraryEvents(options?: OperationOptions): Promise<ExecuteOperationResponse<GetItineraryEventsData>>;

/** Generated Node Admin SDK operation action function for the 'GetTravelExpenses' Query. Allow users to execute without passing in DataConnect. */
export function getTravelExpenses(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetTravelExpensesData>>;
/** Generated Node Admin SDK operation action function for the 'GetTravelExpenses' Query. Allow users to pass in custom DataConnect instances. */
export function getTravelExpenses(options?: OperationOptions): Promise<ExecuteOperationResponse<GetTravelExpensesData>>;

/** Generated Node Admin SDK operation action function for the 'GetVoiceNotes' Query. Allow users to execute without passing in DataConnect. */
export function getVoiceNotes(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetVoiceNotesData>>;
/** Generated Node Admin SDK operation action function for the 'GetVoiceNotes' Query. Allow users to pass in custom DataConnect instances. */
export function getVoiceNotes(options?: OperationOptions): Promise<ExecuteOperationResponse<GetVoiceNotesData>>;

/** Generated Node Admin SDK operation action function for the 'GetPaymentMethods' Query. Allow users to execute without passing in DataConnect. */
export function getPaymentMethods(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPaymentMethodsData>>;
/** Generated Node Admin SDK operation action function for the 'GetPaymentMethods' Query. Allow users to pass in custom DataConnect instances. */
export function getPaymentMethods(options?: OperationOptions): Promise<ExecuteOperationResponse<GetPaymentMethodsData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserSubscription' Query. Allow users to execute without passing in DataConnect. */
export function getUserSubscription(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserSubscriptionData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserSubscription' Query. Allow users to pass in custom DataConnect instances. */
export function getUserSubscription(options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserSubscriptionData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserPreference' Query. Allow users to execute without passing in DataConnect. */
export function getUserPreference(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserPreferenceData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserPreference' Query. Allow users to pass in custom DataConnect instances. */
export function getUserPreference(options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserPreferenceData>>;

/** Generated Node Admin SDK operation action function for the 'GetGroceryList' Query. Allow users to execute without passing in DataConnect. */
export function getGroceryList(dc: DataConnect, vars: GetGroceryListVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetGroceryListData>>;
/** Generated Node Admin SDK operation action function for the 'GetGroceryList' Query. Allow users to pass in custom DataConnect instances. */
export function getGroceryList(vars: GetGroceryListVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetGroceryListData>>;

/** Generated Node Admin SDK operation action function for the 'GetCreatorAgents' Query. Allow users to execute without passing in DataConnect. */
export function getCreatorAgents(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCreatorAgentsData>>;
/** Generated Node Admin SDK operation action function for the 'GetCreatorAgents' Query. Allow users to pass in custom DataConnect instances. */
export function getCreatorAgents(options?: OperationOptions): Promise<ExecuteOperationResponse<GetCreatorAgentsData>>;

/** Generated Node Admin SDK operation action function for the 'GetCreativeTemplates' Query. Allow users to execute without passing in DataConnect. */
export function getCreativeTemplates(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetCreativeTemplatesData>>;
/** Generated Node Admin SDK operation action function for the 'GetCreativeTemplates' Query. Allow users to pass in custom DataConnect instances. */
export function getCreativeTemplates(options?: OperationOptions): Promise<ExecuteOperationResponse<GetCreativeTemplatesData>>;

/** Generated Node Admin SDK operation action function for the 'GetWardrobeOutfits' Query. Allow users to execute without passing in DataConnect. */
export function getWardrobeOutfits(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetWardrobeOutfitsData>>;
/** Generated Node Admin SDK operation action function for the 'GetWardrobeOutfits' Query. Allow users to pass in custom DataConnect instances. */
export function getWardrobeOutfits(options?: OperationOptions): Promise<ExecuteOperationResponse<GetWardrobeOutfitsData>>;

/** Generated Node Admin SDK operation action function for the 'GetWardrobeItems' Query. Allow users to execute without passing in DataConnect. */
export function getWardrobeItems(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetWardrobeItemsData>>;
/** Generated Node Admin SDK operation action function for the 'GetWardrobeItems' Query. Allow users to pass in custom DataConnect instances. */
export function getWardrobeItems(options?: OperationOptions): Promise<ExecuteOperationResponse<GetWardrobeItemsData>>;

/** Generated Node Admin SDK operation action function for the 'GetVisionHistory' Query. Allow users to execute without passing in DataConnect. */
export function getVisionHistory(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetVisionHistoryData>>;
/** Generated Node Admin SDK operation action function for the 'GetVisionHistory' Query. Allow users to pass in custom DataConnect instances. */
export function getVisionHistory(options?: OperationOptions): Promise<ExecuteOperationResponse<GetVisionHistoryData>>;

/** Generated Node Admin SDK operation action function for the 'GetOnboardingStatus' Query. Allow users to execute without passing in DataConnect. */
export function getOnboardingStatus(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetOnboardingStatusData>>;
/** Generated Node Admin SDK operation action function for the 'GetOnboardingStatus' Query. Allow users to pass in custom DataConnect instances. */
export function getOnboardingStatus(options?: OperationOptions): Promise<ExecuteOperationResponse<GetOnboardingStatusData>>;

