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
    tier?: string | null;
    status?: string | null;
    currentPeriodEnd?: string | null;
    stripeSubscriptionId?: string | null;
  })[];
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

export interface UpsertUserSubscriptionData {
  userSubscription_upsert: UserSubscription_Key;
}

export interface UpsertUserSubscriptionVariables {
  tier: string;
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
  userId: string;
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

interface UpsertUserSubscriptionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserSubscriptionVariables): MutationRef<UpsertUserSubscriptionData, UpsertUserSubscriptionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertUserSubscriptionVariables): MutationRef<UpsertUserSubscriptionData, UpsertUserSubscriptionVariables>;
  operationName: string;
}
export const upsertUserSubscriptionRef: UpsertUserSubscriptionRef;

export function upsertUserSubscription(vars: UpsertUserSubscriptionVariables): MutationPromise<UpsertUserSubscriptionData, UpsertUserSubscriptionVariables>;
export function upsertUserSubscription(dc: DataConnect, vars: UpsertUserSubscriptionVariables): MutationPromise<UpsertUserSubscriptionData, UpsertUserSubscriptionVariables>;

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

interface CreateWardrobeOutfitRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateWardrobeOutfitVariables): MutationRef<CreateWardrobeOutfitData, CreateWardrobeOutfitVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateWardrobeOutfitVariables): MutationRef<CreateWardrobeOutfitData, CreateWardrobeOutfitVariables>;
  operationName: string;
}
export const createWardrobeOutfitRef: CreateWardrobeOutfitRef;

export function createWardrobeOutfit(vars: CreateWardrobeOutfitVariables): MutationPromise<CreateWardrobeOutfitData, CreateWardrobeOutfitVariables>;
export function createWardrobeOutfit(dc: DataConnect, vars: CreateWardrobeOutfitVariables): MutationPromise<CreateWardrobeOutfitData, CreateWardrobeOutfitVariables>;

interface AddWardrobeItemRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddWardrobeItemVariables): MutationRef<AddWardrobeItemData, AddWardrobeItemVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddWardrobeItemVariables): MutationRef<AddWardrobeItemData, AddWardrobeItemVariables>;
  operationName: string;
}
export const addWardrobeItemRef: AddWardrobeItemRef;

export function addWardrobeItem(vars: AddWardrobeItemVariables): MutationPromise<AddWardrobeItemData, AddWardrobeItemVariables>;
export function addWardrobeItem(dc: DataConnect, vars: AddWardrobeItemVariables): MutationPromise<AddWardrobeItemData, AddWardrobeItemVariables>;

interface LogVisionEventRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: LogVisionEventVariables): MutationRef<LogVisionEventData, LogVisionEventVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: LogVisionEventVariables): MutationRef<LogVisionEventData, LogVisionEventVariables>;
  operationName: string;
}
export const logVisionEventRef: LogVisionEventRef;

export function logVisionEvent(vars: LogVisionEventVariables): MutationPromise<LogVisionEventData, LogVisionEventVariables>;
export function logVisionEvent(dc: DataConnect, vars: LogVisionEventVariables): MutationPromise<LogVisionEventData, LogVisionEventVariables>;

interface UpdateOnboardingStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateOnboardingStatusVariables): MutationRef<UpdateOnboardingStatusData, UpdateOnboardingStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateOnboardingStatusVariables): MutationRef<UpdateOnboardingStatusData, UpdateOnboardingStatusVariables>;
  operationName: string;
}
export const updateOnboardingStatusRef: UpdateOnboardingStatusRef;

export function updateOnboardingStatus(vars: UpdateOnboardingStatusVariables): MutationPromise<UpdateOnboardingStatusData, UpdateOnboardingStatusVariables>;
export function updateOnboardingStatus(dc: DataConnect, vars: UpdateOnboardingStatusVariables): MutationPromise<UpdateOnboardingStatusData, UpdateOnboardingStatusVariables>;

interface ConnectCoinbaseWalletRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ConnectCoinbaseWalletVariables): MutationRef<ConnectCoinbaseWalletData, ConnectCoinbaseWalletVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ConnectCoinbaseWalletVariables): MutationRef<ConnectCoinbaseWalletData, ConnectCoinbaseWalletVariables>;
  operationName: string;
}
export const connectCoinbaseWalletRef: ConnectCoinbaseWalletRef;

export function connectCoinbaseWallet(vars: ConnectCoinbaseWalletVariables): MutationPromise<ConnectCoinbaseWalletData, ConnectCoinbaseWalletVariables>;
export function connectCoinbaseWallet(dc: DataConnect, vars: ConnectCoinbaseWalletVariables): MutationPromise<ConnectCoinbaseWalletData, ConnectCoinbaseWalletVariables>;

interface RegisterPasskeyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: RegisterPasskeyVariables): MutationRef<RegisterPasskeyData, RegisterPasskeyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: RegisterPasskeyVariables): MutationRef<RegisterPasskeyData, RegisterPasskeyVariables>;
  operationName: string;
}
export const registerPasskeyRef: RegisterPasskeyRef;

export function registerPasskey(vars: RegisterPasskeyVariables): MutationPromise<RegisterPasskeyData, RegisterPasskeyVariables>;
export function registerPasskey(dc: DataConnect, vars: RegisterPasskeyVariables): MutationPromise<RegisterPasskeyData, RegisterPasskeyVariables>;

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

interface GetCreatorAgentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetCreatorAgentsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetCreatorAgentsData, undefined>;
  operationName: string;
}
export const getCreatorAgentsRef: GetCreatorAgentsRef;

export function getCreatorAgents(options?: ExecuteQueryOptions): QueryPromise<GetCreatorAgentsData, undefined>;
export function getCreatorAgents(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetCreatorAgentsData, undefined>;

interface GetCreativeTemplatesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetCreativeTemplatesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetCreativeTemplatesData, undefined>;
  operationName: string;
}
export const getCreativeTemplatesRef: GetCreativeTemplatesRef;

export function getCreativeTemplates(options?: ExecuteQueryOptions): QueryPromise<GetCreativeTemplatesData, undefined>;
export function getCreativeTemplates(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetCreativeTemplatesData, undefined>;

interface GetWardrobeOutfitsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetWardrobeOutfitsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetWardrobeOutfitsData, undefined>;
  operationName: string;
}
export const getWardrobeOutfitsRef: GetWardrobeOutfitsRef;

export function getWardrobeOutfits(options?: ExecuteQueryOptions): QueryPromise<GetWardrobeOutfitsData, undefined>;
export function getWardrobeOutfits(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetWardrobeOutfitsData, undefined>;

interface GetWardrobeItemsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetWardrobeItemsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetWardrobeItemsData, undefined>;
  operationName: string;
}
export const getWardrobeItemsRef: GetWardrobeItemsRef;

export function getWardrobeItems(options?: ExecuteQueryOptions): QueryPromise<GetWardrobeItemsData, undefined>;
export function getWardrobeItems(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetWardrobeItemsData, undefined>;

interface GetVisionHistoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetVisionHistoryData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetVisionHistoryData, undefined>;
  operationName: string;
}
export const getVisionHistoryRef: GetVisionHistoryRef;

export function getVisionHistory(options?: ExecuteQueryOptions): QueryPromise<GetVisionHistoryData, undefined>;
export function getVisionHistory(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetVisionHistoryData, undefined>;

interface GetOnboardingStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetOnboardingStatusData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetOnboardingStatusData, undefined>;
  operationName: string;
}
export const getOnboardingStatusRef: GetOnboardingStatusRef;

export function getOnboardingStatus(options?: ExecuteQueryOptions): QueryPromise<GetOnboardingStatusData, undefined>;
export function getOnboardingStatus(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetOnboardingStatusData, undefined>;

