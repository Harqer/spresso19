
@file:Suppress(
    "KotlinRedundantDiagnosticSuppress",
    "PropertyName",
    "MayBeConstant",
    "RedundantVisibilityModifier",
    "RedundantCompanionReference",
    "RemoveEmptyClassBody",
    "SpellCheckingInspection",
    "unused",
)

package com.spresso.dataconnect

public interface AddWardrobeItemMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
        SpressoConnectorConnector,
        AddWardrobeItemMutation.Data,
        AddWardrobeItemMutation.Variables,
    > {
    @kotlinx.serialization.Serializable
    public data class Variables(
        val outfitId: com.google.firebase.dataconnect.OptionalVariable<
            @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class)
            java.util.UUID?,
        >,
        val category: String,
        val brand: com.google.firebase.dataconnect.OptionalVariable<String?>,
        val imageUrl: String,
        val color: com.google.firebase.dataconnect.OptionalVariable<String?>,
    ) {
        @kotlin.DslMarker public annotation class BuilderDsl

        @BuilderDsl
        public interface Builder {
            public var outfitId: java.util.UUID?
            public var category: String
            public var brand: String?
            public var imageUrl: String
            public var color: String?
        }

        public companion object {
            @Suppress("NAME_SHADOWING")
            public fun build(
                category: String,
                imageUrl: String,
                block_: Builder.() -> Unit,
            ): Variables {
                var outfitId: com.google.firebase.dataconnect.OptionalVariable<java.util.UUID?> =
                    com.google.firebase.dataconnect.OptionalVariable.Undefined
                var category = category
                var brand: com.google.firebase.dataconnect.OptionalVariable<String?> =
                    com.google.firebase.dataconnect.OptionalVariable.Undefined
                var imageUrl = imageUrl
                var color: com.google.firebase.dataconnect.OptionalVariable<String?> =
                    com.google.firebase.dataconnect.OptionalVariable.Undefined

                return object : Builder {
                    override var outfitId: java.util.UUID?
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            outfitId =
                                com.google.firebase.dataconnect.OptionalVariable
                                    .Value(value_)
                        }

                    override var category: String
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            category = value_
                        }

                    override var brand: String?
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            brand =
                                com.google.firebase.dataconnect.OptionalVariable
                                    .Value(value_)
                        }

                    override var imageUrl: String
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            imageUrl = value_
                        }

                    override var color: String?
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            color =
                                com.google.firebase.dataconnect.OptionalVariable
                                    .Value(value_)
                        }
                }.apply(block_)
                    .let {
                        Variables(
                            outfitId = outfitId,
                            category = category,
                            brand = brand,
                            imageUrl = imageUrl,
                            color = color,
                        )
                    }
            }
        }
    }

    @kotlinx.serialization.Serializable
    public data class Data(
        val wardrobeItem_insert: WardrobeItemKey,
    )

    public companion object {
        public val operationName: String = "AddWardrobeItem"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
            kotlinx.serialization.serializer()
    }
}

public fun AddWardrobeItemMutation.ref(
    category: String,
    imageUrl: String,
    block_: AddWardrobeItemMutation.Variables.Builder.() -> Unit = {},
): com.google.firebase.dataconnect.MutationRef<
    AddWardrobeItemMutation.Data,
    AddWardrobeItemMutation.Variables,
> =
    ref(
        AddWardrobeItemMutation.Variables.build(
            category = category,
            imageUrl = imageUrl,
            block_,
        ),
    )

public suspend fun AddWardrobeItemMutation.execute(
    category: String,
    imageUrl: String,
    block_: AddWardrobeItemMutation.Variables.Builder.() -> Unit = {},
): com.google.firebase.dataconnect.MutationResult<
    AddWardrobeItemMutation.Data,
    AddWardrobeItemMutation.Variables,
> =
    ref(
        category = category,
        imageUrl = imageUrl,
        block_,
    ).execute()
