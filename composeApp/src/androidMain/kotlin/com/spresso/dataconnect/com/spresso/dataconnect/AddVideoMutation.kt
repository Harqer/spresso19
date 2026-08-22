
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

public interface AddVideoMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
        SpressoConnectorConnector,
        AddVideoMutation.Data,
        AddVideoMutation.Variables,
    > {
    @kotlinx.serialization.Serializable
    public data class Variables(
        val productId: com.google.firebase.dataconnect.OptionalVariable<String?>,
        val videoUrl: String,
        val videoType: String,
    ) {
        @kotlin.DslMarker public annotation class BuilderDsl

        @BuilderDsl
        public interface Builder {
            public var productId: String?
            public var videoUrl: String
            public var videoType: String
        }

        public companion object {
            @Suppress("NAME_SHADOWING")
            public fun build(
                videoUrl: String,
                videoType: String,
                block_: Builder.() -> Unit,
            ): Variables {
                var productId: com.google.firebase.dataconnect.OptionalVariable<String?> =
                    com.google.firebase.dataconnect.OptionalVariable.Undefined
                var videoUrl = videoUrl
                var videoType = videoType

                return object : Builder {
                    override var productId: String?
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            productId =
                                com.google.firebase.dataconnect.OptionalVariable
                                    .Value(value_)
                        }

                    override var videoUrl: String
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            videoUrl = value_
                        }

                    override var videoType: String
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            videoType = value_
                        }
                }.apply(block_)
                    .let {
                        Variables(
                            productId = productId,
                            videoUrl = videoUrl,
                            videoType = videoType,
                        )
                    }
            }
        }
    }

    @kotlinx.serialization.Serializable
    public data class Data(
        val video_insert: VideoKey,
    )

    public companion object {
        public val operationName: String = "AddVideo"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
            kotlinx.serialization.serializer()
    }
}

public fun AddVideoMutation.ref(
    videoUrl: String,
    videoType: String,
    block_: AddVideoMutation.Variables.Builder.() -> Unit = {},
): com.google.firebase.dataconnect.MutationRef<
    AddVideoMutation.Data,
    AddVideoMutation.Variables,
> =
    ref(
        AddVideoMutation.Variables.build(
            videoUrl = videoUrl,
            videoType = videoType,
            block_,
        ),
    )

public suspend fun AddVideoMutation.execute(
    videoUrl: String,
    videoType: String,
    block_: AddVideoMutation.Variables.Builder.() -> Unit = {},
): com.google.firebase.dataconnect.MutationResult<
    AddVideoMutation.Data,
    AddVideoMutation.Variables,
> =
    ref(
        videoUrl = videoUrl,
        videoType = videoType,
        block_,
    ).execute()
