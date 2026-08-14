package com.spresso19.engage

import android.net.Uri
import com.google.android.engage.common.datamodel.Image
import com.google.android.engage.common.datamodel.Price
import com.google.android.engage.shopping.datamodel.ShoppingEntity

data class ProductItem(
    val id: String,
    val title: String,
    val price: Double,
    val imageUrl: String,
    val productUrl: String
)

object ItemToEntityConverter {
    fun convert(item: ProductItem): ShoppingEntity {
        return ShoppingEntity.Builder()
            .setEntityId(item.id)
            .setTitle(item.title)
            .setPrice(
                Price.Builder()
                    .setPriceInMicros((item.price * 1_000_000).toLong())
                    .setCurrencyCode("USD")
                    .build()
            )
            .addPosterImage(
                Image.Builder()
                    .setImageUri(Uri.parse(item.imageUrl))
                    .setImageHeightInPixel(500)
                    .setImageWidthInPixel(500)
                    .build()
            )
            .setActionLinkUri(Uri.parse(item.productUrl))
            .build()
    }
}
