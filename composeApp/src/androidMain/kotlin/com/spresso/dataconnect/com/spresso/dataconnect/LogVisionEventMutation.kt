
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

public interface LogVisionEventMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
        SpressoConnectorConnector,
        LogVisionEventMutation.Data,
        LogVisionEventMutation.Variables,
    > {
    @kotlinx.serialization.Serializable
    public data class Variables(
        val detectedObjects: String,
        val context: com.google.firebase.dataconnect.OptionalVariable<String?>,
        val imageUrl: com.google.firebase.dataconnect.OptionalVariable<String?>,
    ) {
        @kotlin.DslMarker public annotation class BuilderDsl

        @BuilderDsl
        public interface Builder {
            public var detectedObjects: String
            public var context: String?
            public var imageUrl: String?
        }

        public companion object {
            @Suppress("NAME_SHADOWING")
            public fun build(
                detectedObjects: String,
                block_: Builder.() -> Unit,
            ): Variables {
                var detectedObjects = detectedObjects
                var context: com.google.firebase.dataconnect.OptionalVariable<String?> =
                    com.google.firebase.dataconnect.OptionalVariable.Undefined
                var imageUrl: com.google.firebase.dataconnect.OptionalVariable<String?> =
                    com.google.firebase.dataconnect.OptionalVariable.Undefined

                return object : Builder {
                    override var detectedObjects: String
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            detectedObjects = value_
                        }

                    override var context: String?
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            context =
                                com.google.firebase.dataconnect.OptionalVariable
                                    .Value(value_)
                        }

                    override var imageUrl: String?
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            imageUrl =
                                com.google.firebase.dataconnect.OptionalVariable
                                    .Value(value_)
                        }
                }.apply(block_)
                    .let {
                        Variables(
                            detectedObjects = detectedObjects,
                            context = context,
                            imageUrl = imageUrl,
                        )
                    }
            }
        }
    }

    @kotlinx.serialization.Serializable
    public data class Data(
        val visionHistory_insert: VisionHistoryKey,
    )

    public companion object {
        public val operationName: String = "LogVisionEvent"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
            kotlinx.serialization.serializer()
    }
}

public fun LogVisionEventMutation.ref(
    detectedObjects: String,
    block_: LogVisionEventMutation.Variables.Builder.() -> Unit = {},
): com.google.firebase.dataconnect.MutationRef<
    LogVisionEventMutation.Data,
    LogVisionEventMutation.Variables,
> =
    ref(
        LogVisionEventMutation.Variables.build(
            detectedObjects = detectedObjects,
            block_,
        ),
    )

public suspend fun LogVisionEventMutation.execute(
    detectedObjects: String,
    block_: LogVisionEventMutation.Variables.Builder.() -> Unit = {},
): com.google.firebase.dataconnect.MutationResult<
    LogVisionEventMutation.Data,
    LogVisionEventMutation.Variables,
> =
    ref(
        detectedObjects = detectedObjects,
        block_,
    ).execute()
