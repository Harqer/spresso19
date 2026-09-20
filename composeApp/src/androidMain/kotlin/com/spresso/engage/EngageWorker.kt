package com.spresso.engage

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.android.engage.common.datamodel.ClusterType
import com.google.android.engage.service.AppEngageErrorCode
import com.google.android.engage.service.AppEngageException
import com.google.android.engage.service.AppEngagePublishStatusCode
import com.google.android.engage.service.PublishStatusRequest
import com.google.android.engage.service.ServiceAvailabilityRequest
import com.google.android.engage.shopping.service.AppEngageShoppingClient
import com.google.android.gms.tasks.Task
import kotlinx.coroutines.tasks.await
import network.ConvexApi
import network.Telemetry
import network.getCurrentUserUid

class EngageWorker(
    context: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(context, workerParams) {
    private val client = AppEngageShoppingClient(context)
    private val clusterRequestFactory = ClusterRequestFactory()
    private val logTag = "EngageWorker"

    override suspend fun doWork(): Result {
        if (runAttemptCount > Constants.MAX_PUBLISHING_ATTEMPTS) {
            updatePublishStatus(AppEngagePublishStatusCode.NOT_PUBLISHED_SERVICE_ERROR)
            return Result.failure()
        }

        val publishType = inputData.getString(Constants.PUBLISH_TYPE_KEY)
        val intendedClusterType =
            when (publishType) {
                Constants.PUBLISH_TYPE_RECOMMENDATIONS -> ClusterType.TYPE_RECOMMENDATION
                Constants.PUBLISH_TYPE_FEATURED -> ClusterType.TYPE_FEATURED
                Constants.PUBLISH_TYPE_SHOPPING_CART -> ClusterType.TYPE_SHOPPING_CART
                Constants.PUBLISH_TYPE_SHOPPING_LIST -> ClusterType.TYPE_SHOPPING_LIST
                Constants.PUBLISH_TYPE_SHOPPING_REORDER -> ClusterType.TYPE_SHOPPING_REORDER
                Constants.PUBLISH_TYPE_SHOPPING_ORDER_TRACKING -> ClusterType.TYPE_SHOPPING_ORDER_TRACKING
                else -> ClusterType.TYPE_UNKNOWN
            }

        if (intendedClusterType != ClusterType.TYPE_UNKNOWN) {
            val request =
                ServiceAvailabilityRequest
                    .Builder()
                    .addIntendedClusterType(intendedClusterType)
                    .build()
            val availabilityMap = client.isServiceAvailable(request).await()
            if (availabilityMap[intendedClusterType] != true) {
                return Result.failure()
            }
        }

        return when (publishType) {
            Constants.PUBLISH_TYPE_RECOMMENDATIONS -> publishRecommendations()
            Constants.PUBLISH_TYPE_FEATURED -> publishFeatured()
            Constants.PUBLISH_TYPE_SHOPPING_CART -> publishShoppingCart()
            Constants.PUBLISH_TYPE_SHOPPING_LIST -> publishShoppingList()
            Constants.PUBLISH_TYPE_SHOPPING_REORDER -> publishShoppingReorder()
            Constants.PUBLISH_TYPE_SHOPPING_ORDER_TRACKING -> publishShoppingOrderTracking()
            else -> {
                Log.w(logTag, "Unknown publish type: $publishType")
                Result.failure()
            }
        }
    }

    /**
     * Fetches real product recommendations from the personalized discovery API.
     */
    private suspend fun publishRecommendations(): Result {
        val products =
            try {
                val convexApi = ConvexApi()
                val result = convexApi.fetchRecommendedProducts()
                result.map { p: network.ProductItem ->
                    ProductItem(
                        id = p.id,
                        title = p.name,
                        price = p.price ?: 0.0,
                        imageUrl = p.imageUrl,
                        productUrl = "spresso://product/${p.id}",
                    )
                }
            } catch (e: Exception) {
                Telemetry.recordError("EngageWorker: fetchRecommendations failed", e)
                return Result.retry()
            }

        if (products.isEmpty()) {
            Log.w(logTag, "No products from discovery API — skipping recommendations publish")
            return Result.success()
        }

        val publishTask: Task<Void> =
            client.publishRecommendationClusters(
                clusterRequestFactory.constructRecommendationClustersRequest(products),
            )
        return publishAndProvideResult(publishTask)
    }

    /**
     * Publishes featured items using the personalized discovery API.
     */
    private suspend fun publishFeatured(): Result {
        val topItems =
            try {
                val convexApi = ConvexApi()
                val result = convexApi.fetchRecommendedProducts()
                result.take(5).map { p: network.ProductItem ->
                    ProductItem(
                        id = p.id,
                        title = p.name,
                        price = p.price ?: 0.0,
                        imageUrl = p.imageUrl,
                        productUrl = "spresso://product/${p.id}",
                    )
                }
            } catch (e: Exception) {
                Telemetry.recordError("EngageWorker: fetchFeatured failed", e)
                return Result.retry()
            }

        if (topItems.isEmpty()) {
            Log.w(logTag, "No featured items from discovery API — skipping featured publish")
            return Result.success()
        }

        // Featured uses recommendation cluster API with TYPE_FEATURED_FOR_YOU
        val publishTask: Task<Void> =
            client.publishRecommendationClusters(
                clusterRequestFactory.constructRecommendationClustersRequest(topItems),
            )
        return publishAndProvideResult(publishTask)
    }

    /**
     * Fetches the user-scoped external-listing cart snapshot from Convex.
     */
    private suspend fun publishShoppingCart(): Result {
        val uid = getCurrentUserUid()
        val cartItemCount =
            if (uid != null) {
                try {
                    ConvexApi().fetchCartItemCount()
                } catch (e: Exception) {
                    Telemetry.recordError("EngageWorker: fetchCart failed", e)
                    return Result.retry()
                }
            } else {
                0
            }

        if (cartItemCount == 0) return Result.success()

        val publishTask: Task<Void> =
            client.publishShoppingCarts(
                clusterRequestFactory.constructShoppingCartClustersRequest(itemCount = cartItemCount),
            )
        return publishAndProvideResult(publishTask)
    }

    /**
     * Fetches the user-scoped grocery list from Convex.
     */
    private suspend fun publishShoppingList(): Result {
        val uid = getCurrentUserUid() ?: return Result.success()
        val (listTitle, itemCount) =
            try {
                val items = ConvexApi().fetchGroceryItems()
                Pair("My Grocery List", items.size)
            } catch (e: Exception) {
                Telemetry.recordError("EngageWorker: fetchGroceryList failed", e)
                return Result.retry()
            }

        if (itemCount == 0) return Result.success()

        val publishTask: Task<Void> =
            client.publishShoppingLists(
                clusterRequestFactory.constructShoppingListsRequest(
                    listTitle = listTitle,
                    itemCount = itemCount,
                ),
            )
        return publishAndProvideResult(publishTask)
    }

    /**
     * Fetches purchase history from Convex for the reorder cluster.
     */
    private suspend fun publishShoppingReorder(): Result {
        val reorderCount =
            try {
                ConvexApi().fetchOrders().size
            } catch (e: Exception) {
                Telemetry.recordError("EngageWorker: fetchReorders failed", e)
                return Result.retry()
            }

        if (reorderCount == 0) return Result.success()

        val publishTask: Task<Void> =
            client.publishShoppingReorderCluster(
                clusterRequestFactory.constructShoppingReorderClusterRequest(reorderCount = reorderCount),
            )
        return publishAndProvideResult(publishTask)
    }

    /**
     * Fetches the most recent purchase record from Convex for order tracking.
     */
    private suspend fun publishShoppingOrderTracking(): Result {
        val latestOrder =
            try {
                ConvexApi().fetchOrders().firstOrNull() ?: return Result.success()
            } catch (e: Exception) {
                Telemetry.recordError("EngageWorker: fetchOrderTracking failed", e)
                return Result.retry()
            }
        val orderId = latestOrder.id
        val status = latestOrder.status

        val publishTask: Task<Void> =
            client.publishShoppingOrderTrackingCluster(
                clusterRequestFactory.constructShoppingOrderTrackingClusterRequest(
                    orderId = orderId,
                    orderStatus = status,
                    orderTimeMillis = System.currentTimeMillis(),
                ),
            )
        return publishAndProvideResult(publishTask)
    }

    private suspend fun publishAndProvideResult(publishTask: Task<Void>): Result =
        try {
            publishTask.await()
            updatePublishStatus(AppEngagePublishStatusCode.PUBLISHED)
            Result.success()
        } catch (publishException: Exception) {
            handlePublishException(publishException)
        }

    private fun handlePublishException(publishException: Exception): Result {
        val appEngageException = publishException as? AppEngageException
        if (appEngageException != null) {
            logPublishing(appEngageException)
            val errorStatusCode =
                when (appEngageException.errorCode) {
                    AppEngageErrorCode.SERVICE_CALL_INVALID_ARGUMENT ->
                        AppEngagePublishStatusCode.NOT_PUBLISHED_CLIENT_ERROR
                    AppEngageErrorCode.SERVICE_CALL_PERMISSION_DENIED ->
                        AppEngagePublishStatusCode.NOT_PUBLISHED_CLIENT_ERROR
                    else ->
                        AppEngagePublishStatusCode.NOT_PUBLISHED_SERVICE_ERROR
                }
            updatePublishStatus(errorStatusCode)
            return if (isErrorRecoverable(appEngageException)) Result.retry() else Result.failure()
        }
        Telemetry.recordError("EngageWorker: unexpected publish error", publishException)
        return Result.failure()
    }

    private fun updatePublishStatus(statusCode: Int) {
        client
            .updatePublishStatus(PublishStatusRequest.Builder().setStatusCode(statusCode).build())
            .addOnSuccessListener {
                Log.i(logTag, "Successfully updated publish status code to $statusCode")
            }.addOnFailureListener { exception ->
                Log.e(logTag, "Failed to update publish status code to $statusCode\n${exception.stackTraceToString()}")
            }
    }

    private fun logPublishing(publishingException: AppEngageException) {
        val message =
            when (publishingException.errorCode) {
                AppEngageErrorCode.SERVICE_NOT_FOUND -> "Service not found"
                AppEngageErrorCode.SERVICE_CALL_EXECUTION_FAILURE -> "Execution failure"
                AppEngageErrorCode.SERVICE_NOT_AVAILABLE -> "Service not available"
                AppEngageErrorCode.SERVICE_CALL_PERMISSION_DENIED -> "Permission denied"
                AppEngageErrorCode.SERVICE_CALL_INVALID_ARGUMENT -> "Invalid argument"
                AppEngageErrorCode.SERVICE_CALL_INTERNAL -> "Internal error"
                AppEngageErrorCode.SERVICE_CALL_RESOURCE_EXHAUSTED -> "Resource exhausted"
                else -> "Unknown error"
            }
        Log.d(logTag, message)
    }

    private fun isErrorRecoverable(publishingException: AppEngageException): Boolean =
        when (publishingException.errorCode) {
            AppEngageErrorCode.SERVICE_CALL_EXECUTION_FAILURE,
            AppEngageErrorCode.SERVICE_CALL_INTERNAL,
            AppEngageErrorCode.SERVICE_CALL_RESOURCE_EXHAUSTED,
            -> true
            else -> false
        }
}
