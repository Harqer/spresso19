package com.spresso19.engage

import android.content.Context
import android.net.Uri
import com.google.android.engage.common.datamodel.RecommendationCluster
import com.google.android.engage.common.datamodel.RecommendationClusterType
import com.google.android.engage.service.PublishRecommendationClustersRequest
import com.google.android.engage.shopping.datamodel.ShoppingCart
import com.google.android.engage.shopping.datamodel.ShoppingList
import com.google.android.engage.shopping.datamodel.ShoppingOrderTrackingCluster
import com.google.android.engage.shopping.datamodel.ShoppingOrderType
import com.google.android.engage.shopping.datamodel.ShoppingReorderCluster
import com.google.android.engage.shopping.service.PublishShoppingCartClusterRequest
import com.google.android.engage.shopping.service.PublishShoppingListsRequest
import com.google.android.engage.shopping.service.PublishShoppingOrderTrackingClusterRequest
import com.google.android.engage.shopping.service.PublishShoppingReorderClusterRequest

/**
 * Builds Google Engage SDK cluster publish requests.
 * All deep links use the spresso:// scheme registered in AndroidManifest.xml.
 * Item counts are sourced from real data passed by EngageWorker — no hardcoded values.
 */
class ClusterRequestFactory(
    context: Context,
) {
    fun constructRecommendationClustersRequest(items: List<ProductItem>): PublishRecommendationClustersRequest {
        val recommendationCluster =
            RecommendationCluster
                .Builder()
                .setTitle("Recommended For You")
                .setRecommendationClusterType(RecommendationClusterType.TYPE_TOP_PICKS_FOR_YOU)

        for (item in items) {
            recommendationCluster.addEntity(ItemToEntityConverter.convert(item))
        }

        return PublishRecommendationClustersRequest
            .Builder()
            .addRecommendationCluster(recommendationCluster.build())
            .build()
    }

    fun constructShoppingCartClusterRequest(itemCount: Int): PublishShoppingCartClusterRequest {
        val shoppingCart =
            ShoppingCart
                .Builder()
                .setTitle("Your Cart")
                // spresso:// deep link registered in AndroidManifest intent-filter
                .setActionLinkUri(Uri.parse("spresso://cart"))
                .setNumberOfItems(itemCount)
                .build()

        return PublishShoppingCartClusterRequest
            .Builder()
            .setShoppingCart(shoppingCart)
            .build()
    }

    fun constructShoppingListsRequest(
        listTitle: String,
        itemCount: Int,
    ): PublishShoppingListsRequest {
        val shoppingList =
            ShoppingList
                .Builder()
                .setTitle(listTitle)
                .setActionLinkUri(Uri.parse("spresso://grocery"))
                .setNumberOfItems(itemCount)
                .build()

        return PublishShoppingListsRequest
            .Builder()
            .addShoppingList(shoppingList)
            .build()
    }

    fun constructShoppingReorderClusterRequest(reorderCount: Int): PublishShoppingReorderClusterRequest {
        val reorderCluster =
            ShoppingReorderCluster
                .Builder()
                .setTitle("Buy Again")
                .setActionLinkUri(Uri.parse("spresso://reorder"))
                .setNumberOfItems(reorderCount)
                .build()

        return PublishShoppingReorderClusterRequest
            .Builder()
            .setReorderCluster(reorderCluster)
            .build()
    }

    fun constructShoppingOrderTrackingClusterRequest(
        orderId: String,
        orderStatus: String,
        orderTimeMillis: Long,
    ): PublishShoppingOrderTrackingClusterRequest {
        val trackingCluster =
            ShoppingOrderTrackingCluster
                .Builder()
                .setTitle("Your Order is on the way")
                .setStatus(orderStatus)
                .setOrderTime(orderTimeMillis)
                // Deep link includes the real order ID for navigation
                .setActionLinkUri(Uri.parse("spresso://orders/$orderId"))
                .setShoppingOrderType(ShoppingOrderType.TYPE_MULTI_DAY_DELIVERY)
                .build()

        return PublishShoppingOrderTrackingClusterRequest
            .Builder()
            .setShoppingOrderTrackingCluster(trackingCluster)
            .build()
    }
}
