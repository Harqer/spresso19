package network

import kotlin.js.Promise

@JsFun("(jsonStr) => JSON.parse(jsonStr)")
external fun parseJsonToJsAny(jsonStr: String): JsAny

@JsFun("(obj) => JSON.stringify(obj)")
external fun stringifyJsAny(obj: JsAny?): String

@JsName("window.SpressoDataConnect")
external object SpressoDataConnect {
    fun toggleLike(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun addGroceryItem(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun toggleGroceryItem(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun deleteGroceryItem(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun updateOnboardingStatus(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun createOrder(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun createVoiceNote(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun createTravelExpense(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun logVisionEvent(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun getWardrobeOutfits(): Promise<JsAny?>

    fun getWardrobeItems(): Promise<JsAny?>

    fun addWardrobeItem(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun getCreatorAgents(): Promise<JsAny?>

    fun getCreativeTemplates(): Promise<JsAny?>

    fun upsertUserProfile(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun upsertUserPreference(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun createPaymentMethod(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun deletePaymentMethod(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun updateUserSubscription(vars: JsAny? = definedExternally): Promise<JsAny?>

    fun connectCoinbaseWallet(vars: JsAny? = definedExternally): Promise<JsAny?>
}
