# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { upsertUserProfile, createOrder, addVideo, toggleLike, createExpense, createTravelExpense, createVoiceNote, createPaymentMethod, deletePaymentMethod, upsertUserSubscription } from '@firebasegen/spresso-connector';


// Operation UpsertUserProfile:  For variables, look at type UpsertUserProfileVars in ../index.d.ts
const { data } = await UpsertUserProfile(dataConnect, upsertUserProfileVars);

// Operation CreateOrder:  For variables, look at type CreateOrderVars in ../index.d.ts
const { data } = await CreateOrder(dataConnect, createOrderVars);

// Operation AddVideo:  For variables, look at type AddVideoVars in ../index.d.ts
const { data } = await AddVideo(dataConnect, addVideoVars);

// Operation ToggleLike:  For variables, look at type ToggleLikeVars in ../index.d.ts
const { data } = await ToggleLike(dataConnect, toggleLikeVars);

// Operation CreateExpense:  For variables, look at type CreateExpenseVars in ../index.d.ts
const { data } = await CreateExpense(dataConnect, createExpenseVars);

// Operation CreateTravelExpense:  For variables, look at type CreateTravelExpenseVars in ../index.d.ts
const { data } = await CreateTravelExpense(dataConnect, createTravelExpenseVars);

// Operation CreateVoiceNote:  For variables, look at type CreateVoiceNoteVars in ../index.d.ts
const { data } = await CreateVoiceNote(dataConnect, createVoiceNoteVars);

// Operation CreatePaymentMethod:  For variables, look at type CreatePaymentMethodVars in ../index.d.ts
const { data } = await CreatePaymentMethod(dataConnect, createPaymentMethodVars);

// Operation DeletePaymentMethod:  For variables, look at type DeletePaymentMethodVars in ../index.d.ts
const { data } = await DeletePaymentMethod(dataConnect, deletePaymentMethodVars);

// Operation UpsertUserSubscription:  For variables, look at type UpsertUserSubscriptionVars in ../index.d.ts
const { data } = await UpsertUserSubscription(dataConnect, upsertUserSubscriptionVars);


```