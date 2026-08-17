const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'spresso-connector',
  service: 'spresso-dataconnect',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const upsertUserProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertUserProfile', inputVars);
}
upsertUserProfileRef.operationName = 'UpsertUserProfile';
exports.upsertUserProfileRef = upsertUserProfileRef;

exports.upsertUserProfile = function upsertUserProfile(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars);
  return executeMutation(upsertUserProfileRef(dcInstance, inputVars));
}
;

const createOrderRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateOrder', inputVars);
}
createOrderRef.operationName = 'CreateOrder';
exports.createOrderRef = createOrderRef;

exports.createOrder = function createOrder(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createOrderRef(dcInstance, inputVars));
}
;

const addVideoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddVideo', inputVars);
}
addVideoRef.operationName = 'AddVideo';
exports.addVideoRef = addVideoRef;

exports.addVideo = function addVideo(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(addVideoRef(dcInstance, inputVars));
}
;

const toggleLikeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ToggleLike', inputVars);
}
toggleLikeRef.operationName = 'ToggleLike';
exports.toggleLikeRef = toggleLikeRef;

exports.toggleLike = function toggleLike(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(toggleLikeRef(dcInstance, inputVars));
}
;

const createExpenseRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateExpense', inputVars);
}
createExpenseRef.operationName = 'CreateExpense';
exports.createExpenseRef = createExpenseRef;

exports.createExpense = function createExpense(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createExpenseRef(dcInstance, inputVars));
}
;

const createTravelExpenseRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateTravelExpense', inputVars);
}
createTravelExpenseRef.operationName = 'CreateTravelExpense';
exports.createTravelExpenseRef = createTravelExpenseRef;

exports.createTravelExpense = function createTravelExpense(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createTravelExpenseRef(dcInstance, inputVars));
}
;

const createVoiceNoteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateVoiceNote', inputVars);
}
createVoiceNoteRef.operationName = 'CreateVoiceNote';
exports.createVoiceNoteRef = createVoiceNoteRef;

exports.createVoiceNote = function createVoiceNote(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createVoiceNoteRef(dcInstance, inputVars));
}
;

const createPaymentMethodRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreatePaymentMethod', inputVars);
}
createPaymentMethodRef.operationName = 'CreatePaymentMethod';
exports.createPaymentMethodRef = createPaymentMethodRef;

exports.createPaymentMethod = function createPaymentMethod(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createPaymentMethodRef(dcInstance, inputVars));
}
;

const deletePaymentMethodRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeletePaymentMethod', inputVars);
}
deletePaymentMethodRef.operationName = 'DeletePaymentMethod';
exports.deletePaymentMethodRef = deletePaymentMethodRef;

exports.deletePaymentMethod = function deletePaymentMethod(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deletePaymentMethodRef(dcInstance, inputVars));
}
;

const updateUserSubscriptionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateUserSubscription', inputVars);
}
updateUserSubscriptionRef.operationName = 'UpdateUserSubscription';
exports.updateUserSubscriptionRef = updateUserSubscriptionRef;

exports.updateUserSubscription = function updateUserSubscription(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateUserSubscriptionRef(dcInstance, inputVars));
}
;

const upsertUserPreferenceRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertUserPreference', inputVars);
}
upsertUserPreferenceRef.operationName = 'UpsertUserPreference';
exports.upsertUserPreferenceRef = upsertUserPreferenceRef;

exports.upsertUserPreference = function upsertUserPreference(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars);
  return executeMutation(upsertUserPreferenceRef(dcInstance, inputVars));
}
;

const createGroceryListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateGroceryList', inputVars);
}
createGroceryListRef.operationName = 'CreateGroceryList';
exports.createGroceryListRef = createGroceryListRef;

exports.createGroceryList = function createGroceryList(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createGroceryListRef(dcInstance, inputVars));
}
;

const addGroceryItemRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddGroceryItem', inputVars);
}
addGroceryItemRef.operationName = 'AddGroceryItem';
exports.addGroceryItemRef = addGroceryItemRef;

exports.addGroceryItem = function addGroceryItem(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(addGroceryItemRef(dcInstance, inputVars));
}
;

const toggleGroceryItemRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ToggleGroceryItem', inputVars);
}
toggleGroceryItemRef.operationName = 'ToggleGroceryItem';
exports.toggleGroceryItemRef = toggleGroceryItemRef;

exports.toggleGroceryItem = function toggleGroceryItem(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(toggleGroceryItemRef(dcInstance, inputVars));
}
;

const deleteGroceryItemRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteGroceryItem', inputVars);
}
deleteGroceryItemRef.operationName = 'DeleteGroceryItem';
exports.deleteGroceryItemRef = deleteGroceryItemRef;

exports.deleteGroceryItem = function deleteGroceryItem(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteGroceryItemRef(dcInstance, inputVars));
}
;

const listProductsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProducts');
}
listProductsRef.operationName = 'ListProducts';
exports.listProductsRef = listProductsRef;

exports.listProducts = function listProducts(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listProductsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getProductByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetProductById', inputVars);
}
getProductByIdRef.operationName = 'GetProductById';
exports.getProductByIdRef = getProductByIdRef;

exports.getProductById = function getProductById(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getProductByIdRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getUserProfileRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserProfile');
}
getUserProfileRef.operationName = 'GetUserProfile';
exports.getUserProfileRef = getUserProfileRef;

exports.getUserProfile = function getUserProfile(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getUserProfileRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getUserOrdersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserOrders');
}
getUserOrdersRef.operationName = 'GetUserOrders';
exports.getUserOrdersRef = getUserOrdersRef;

exports.getUserOrders = function getUserOrders(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getUserOrdersRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getUserVideosRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserVideos');
}
getUserVideosRef.operationName = 'GetUserVideos';
exports.getUserVideosRef = getUserVideosRef;

exports.getUserVideos = function getUserVideos(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getUserVideosRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getUserCartRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserCart');
}
getUserCartRef.operationName = 'GetUserCart';
exports.getUserCartRef = getUserCartRef;

exports.getUserCart = function getUserCart(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getUserCartRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getTripsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTrips');
}
getTripsRef.operationName = 'GetTrips';
exports.getTripsRef = getTripsRef;

exports.getTrips = function getTrips(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getTripsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getUserPreferencesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserPreferences');
}
getUserPreferencesRef.operationName = 'GetUserPreferences';
exports.getUserPreferencesRef = getUserPreferencesRef;

exports.getUserPreferences = function getUserPreferences(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getUserPreferencesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getItineraryEventsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetItineraryEvents');
}
getItineraryEventsRef.operationName = 'GetItineraryEvents';
exports.getItineraryEventsRef = getItineraryEventsRef;

exports.getItineraryEvents = function getItineraryEvents(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getItineraryEventsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getTravelExpensesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelExpenses');
}
getTravelExpensesRef.operationName = 'GetTravelExpenses';
exports.getTravelExpensesRef = getTravelExpensesRef;

exports.getTravelExpenses = function getTravelExpenses(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getTravelExpensesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getVoiceNotesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetVoiceNotes');
}
getVoiceNotesRef.operationName = 'GetVoiceNotes';
exports.getVoiceNotesRef = getVoiceNotesRef;

exports.getVoiceNotes = function getVoiceNotes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getVoiceNotesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getPaymentMethodsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPaymentMethods');
}
getPaymentMethodsRef.operationName = 'GetPaymentMethods';
exports.getPaymentMethodsRef = getPaymentMethodsRef;

exports.getPaymentMethods = function getPaymentMethods(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getPaymentMethodsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getUserSubscriptionRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserSubscription');
}
getUserSubscriptionRef.operationName = 'GetUserSubscription';
exports.getUserSubscriptionRef = getUserSubscriptionRef;

exports.getUserSubscription = function getUserSubscription(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getUserSubscriptionRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getUserPreferenceRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserPreference');
}
getUserPreferenceRef.operationName = 'GetUserPreference';
exports.getUserPreferenceRef = getUserPreferenceRef;

exports.getUserPreference = function getUserPreference(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getUserPreferenceRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getGroceryListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetGroceryList', inputVars);
}
getGroceryListRef.operationName = 'GetGroceryList';
exports.getGroceryListRef = getGroceryListRef;

exports.getGroceryList = function getGroceryList(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getGroceryListRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
