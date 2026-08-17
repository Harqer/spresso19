package com.spresso19.engage

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

class EngageWorker(context: Context, workerParams: WorkerParameters) : CoroutineWorker(context, workerParams) {
    private val client = AppEngageShoppingClient(context)
    private val clusterRequestFactory = ClusterRequestFactory(context)
    private val TAG = "EngageWorker"

    override suspend fun doWork(): Result {
        if (runAttemptCount > Constants.MAX_PUBLISHING_ATTEMPTS) {
            updatePublishStatus(AppEngagePublishStatusCode.NOT_PUBLISHED_SERVICE_ERROR)
            return Result.failure()
        }

        val publishType = inputData.getString(Constants.PUBLISH_TYPE_KEY)
        val intendedClusterType = when (publishType) {
            Constants.PUBLISH_TYPE_RECOMMENDATIONS -> ClusterType.TYPE_RECOMMENDATION
            Constants.PUBLISH_TYPE_SHOPPING_CART -> ClusterType.TYPE_SHOPPING_CART
            Constants.PUBLISH_TYPE_SHOPPING_LIST -> ClusterType.TYPE_SHOPPING_LIST
            Constants.PUBLISH_TYPE_SHOPPING_REORDER -> ClusterType.TYPE_SHOPPING_REORDER
            Constants.PUBLISH_TYPE_SHOPPING_ORDER_TRACKING -> ClusterType.TYPE_SHOPPING_ORDER_TRACKING
            else -> ClusterType.TYPE_UNKNOWN
        }

        if (intendedClusterType != ClusterType.TYPE_UNKNOWN) {
            val request = ServiceAvailabilityRequest.Builder()
                .addIntendedClusterType(intendedClusterType)
                .build()
            val availabilityMap = client.isServiceAvailable(request).await()
            if (availabilityMap[intendedClusterType] != true) {
                return Result.failure()
            }
        }

        return when (publishType) {
            Constants.PUBLISH_TYPE_RECOMMENDATIONS -> publishRecommendations()
            Constants.PUBLISH_TYPE_SHOPPING_CART -> publishShoppingCart()
            Constants.PUBLISH_TYPE_SHOPPING_LIST -> publishShoppingList()
            Constants.PUBLISH_TYPE_SHOPPING_REORDER -> publishShoppingReorder()
            Constants.PUBLISH_TYPE_SHOPPING_ORDER_TRACKING -> publishShoppingOrderTracking()
            else -> Result.failure()
        }
    }

    private suspend fun publishRecommendations(): Result {
        val publishTask: Task<Void> = client.publishRecommendationClusters(
            clusterRequestFactory.constructRecommendationClustersRequest(emptyList())
        )
        return publishAndProvideResult(publishTask)
    }

    private suspend fun publishShoppingCart(): Result {
        val publishTask: Task<Void> = client.publishShoppingCart(
            clusterRequestFactory.constructShoppingCartClusterRequest()
        )
        return publishAndProvideResult(publishTask)
    }

    private suspend fun publishShoppingList(): Result {
        val publishTask: Task<Void> = client.publishShoppingLists(
            clusterRequestFactory.constructShoppingListsRequest()
        )
        return publishAndProvideResult(publishTask)
    }

    private suspend fun publishShoppingReorder(): Result {
        val publishTask: Task<Void> = client.publishShoppingReorderCluster(
            clusterRequestFactory.constructShoppingReorderClusterRequest()
        )
        return publishAndProvideResult(publishTask)
    }

    private suspend fun publishShoppingOrderTracking(): Result {
        val publishTask: Task<Void> = client.publishShoppingOrderTrackingCluster(
            clusterRequestFactory.constructShoppingOrderTrackingClusterRequest()
        )
        return publishAndProvideResult(publishTask)
    }

    private suspend fun publishAndProvideResult(publishTask: Task<Void>): Result {
        return try {
            publishTask.await()
            updatePublishStatus(AppEngagePublishStatusCode.PUBLISHED)
            Result.success()
        } catch (publishException: Exception) {
            handlePublishException(publishException)
        }
    }

    private fun handlePublishException(publishException: Exception): Result {
        val appEngageException = publishException as? AppEngageException
        if (appEngageException != null) {
            logPublishing(appEngageException)
            val errorStatusCode = when (appEngageException.errorCode) {
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
        return Result.failure()
    }

    private fun updatePublishStatus(statusCode: Int) {
        client.updatePublishStatus(PublishStatusRequest.Builder().setStatusCode(statusCode).build())
            .addOnSuccessListener {
                Log.i(TAG, "Successfully updated publish status code to $statusCode")
            }
            .addOnFailureListener { exception ->
                Log.e(TAG, "Failed to update publish status code to $statusCode\n${exception.stackTraceToString()}")
            }
    }

    private fun logPublishing(publishingException: AppEngageException) {
        val message = when (publishingException.errorCode) {
            AppEngageErrorCode.SERVICE_NOT_FOUND -> "Service not found"
            AppEngageErrorCode.SERVICE_CALL_EXECUTION_FAILURE -> "Execution failure"
            AppEngageErrorCode.SERVICE_NOT_AVAILABLE -> "Service not available"
            AppEngageErrorCode.SERVICE_CALL_PERMISSION_DENIED -> "Permission denied"
            AppEngageErrorCode.SERVICE_CALL_INVALID_ARGUMENT -> "Invalid argument"
            AppEngageErrorCode.SERVICE_CALL_INTERNAL -> "Internal error"
            AppEngageErrorCode.SERVICE_CALL_RESOURCE_EXHAUSTED -> "Resource exhausted"
            else -> "Unknown error"
        }
        Log.d(TAG, message)
    }

    private fun isErrorRecoverable(publishingException: AppEngageException): Boolean {
        return when (publishingException.errorCode) {
            AppEngageErrorCode.SERVICE_CALL_EXECUTION_FAILURE,
            AppEngageErrorCode.SERVICE_CALL_INTERNAL,
            AppEngageErrorCode.SERVICE_CALL_RESOURCE_EXHAUSTED -> true
            else -> false
        }
    }
}
