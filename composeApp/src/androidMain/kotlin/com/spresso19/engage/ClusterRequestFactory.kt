package com.spresso19.engage

import android.content.Context
import android.net.Uri
import com.google.android.engage.common.datamodel.RecommendationCluster
import com.google.android.engage.common.datamodel.RecommendationClusterType
import com.google.android.engage.shopping.datamodel.ShoppingCart
import com.google.android.engage.shopping.datamodel.ShoppingList
import com.google.android.engage.shopping.datamodel.ShoppingOrderTrackingCluster
import com.google.android.engage.shopping.datamodel.ShoppingReorderCluster
import com.google.android.engage.shopping.datamodel.ShoppingOrderType
import com.google.android.engage.service.PublishRecommendationClustersRequest
import com.google.android.engage.shopping.service.PublishShoppingCartClusterRequest
import com.google.android.engage.shopping.service.PublishShoppingListsRequest
import com.google.android.engage.shopping.service.PublishShoppingReorderClusterRequest
import com.google.android.engage.shopping.service.PublishShoppingOrderTrackingClusterRequest

class ClusterRequestFactory(context: Context) {

    fun constructRecommendationClustersRequest(): PublishRecommendationClustersRequest {
        // Dummy data for example
        val items = listOf(
            ProductItem("1", "Coffee Beans", 12.99, "http://example.com/coffee.png", "http://example.com/p/1")
        )
        val recommendationCluster = RecommendationCluster.Builder()
            .setTitle("Recommended For You")
            .setRecommendationClusterType(RecommendationClusterType.TYPE_TOP_PICKS_FOR_YOU)

        for (item in items) {
            recommendationCluster.addEntity(ItemToEntityConverter.convert(item))
        }

        return PublishRecommendationClustersRequest.Builder()
            .addRecommendationCluster(recommendationCluster.build())
            .build()
    }

    fun constructShoppingCartClusterRequest(): PublishShoppingCartClusterRequest {
        val shoppingCart = ShoppingCart.Builder()
            .setTitle("Your Cart")
            .setActionLinkUri(Uri.parse("http://example.com/cart"))
            .setNumberOfItems(2)
            .build()
        
        return PublishShoppingCartClusterRequest.Builder()
            .setShoppingCartCluster(shoppingCart)
            .build()
    }

    fun constructShoppingListsRequest(): PublishShoppingListsRequest {
        val shoppingList = ShoppingList.Builder()
            .setTitle("Weekly Groceries")
            .setActionLinkUri(Uri.parse("http://example.com/lists/1"))
            .setNumberOfItems(10)
            .build()

        return PublishShoppingListsRequest.Builder()
            .addShoppingListCluster(shoppingList)
            .build()
    }

    fun constructShoppingReorderClusterRequest(): PublishShoppingReorderClusterRequest {
        val reorderCluster = ShoppingReorderCluster.Builder()
            .setTitle("Buy Again")
            .setActionLinkUri(Uri.parse("http://example.com/reorder"))
            .setNumberOfItems(5)
            .build()

        return PublishShoppingReorderClusterRequest.Builder()
            .setShoppingReorderCluster(reorderCluster)
            .build()
    }

    fun constructShoppingOrderTrackingClusterRequest(): PublishShoppingOrderTrackingClusterRequest {
        val trackingCluster = ShoppingOrderTrackingCluster.Builder()
            .setTitle("Your Order is on the way")
            .setStatus("Shipped")
            .setOrderTime(System.currentTimeMillis())
            .setActionLinkUri(Uri.parse("http://example.com/track/123"))
            .setShoppingOrderType(ShoppingOrderType.TYPE_DELIVERY)
            .build()

        return PublishShoppingOrderTrackingClusterRequest.Builder()
            .setShoppingOrderTrackingCluster(trackingCluster)
            .build()
    }
}
