
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

public interface UpsertUserProfileMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
        SpressoConnectorConnector,
        UpsertUserProfileMutation.Data,
        UpsertUserProfileMutation.Variables,
    > {
    @kotlinx.serialization.Serializable
    public data class Variables(
        val email: com.google.firebase.dataconnect.OptionalVariable<String?>,
        val displayName: com.google.firebase.dataconnect.OptionalVariable<String?>,
        val avatarUrl: com.google.firebase.dataconnect.OptionalVariable<String?>,
    ) {
        @kotlin.DslMarker public annotation class BuilderDsl

        @BuilderDsl
        public interface Builder {
            public var email: String?
            public var displayName: String?
            public var avatarUrl: String?
        }

        public companion object {
            @Suppress("NAME_SHADOWING")
            public fun build(block_: Builder.() -> Unit): Variables {
                var email: com.google.firebase.dataconnect.OptionalVariable<String?> =
                    com.google.firebase.dataconnect.OptionalVariable.Undefined
                var displayName: com.google.firebase.dataconnect.OptionalVariable<String?> =
                    com.google.firebase.dataconnect.OptionalVariable.Undefined
                var avatarUrl: com.google.firebase.dataconnect.OptionalVariable<String?> =
                    com.google.firebase.dataconnect.OptionalVariable.Undefined

                return object : Builder {
                    override var email: String?
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            email =
                                com.google.firebase.dataconnect.OptionalVariable
                                    .Value(value_)
                        }

                    override var displayName: String?
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            displayName =
                                com.google.firebase.dataconnect.OptionalVariable
                                    .Value(value_)
                        }

                    override var avatarUrl: String?
                        get() = throw UnsupportedOperationException("getting builder values is not supported")
                        set(value_) {
                            avatarUrl =
                                com.google.firebase.dataconnect.OptionalVariable
                                    .Value(value_)
                        }
                }.apply(block_)
                    .let {
                        Variables(
                            email = email,
                            displayName = displayName,
                            avatarUrl = avatarUrl,
                        )
                    }
            }
        }
    }

    @kotlinx.serialization.Serializable
    public data class Data(
        val user_upsert: UserKey,
    )

    public companion object {
        public val operationName: String = "UpsertUserProfile"

        public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
            kotlinx.serialization.serializer()

        public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
            kotlinx.serialization.serializer()
    }
}

public fun UpsertUserProfileMutation.ref(
    block_: UpsertUserProfileMutation.Variables.Builder.() -> Unit = {},
): com.google.firebase.dataconnect.MutationRef<
    UpsertUserProfileMutation.Data,
    UpsertUserProfileMutation.Variables,
> =
    ref(
        UpsertUserProfileMutation.Variables.build(
            block_,
        ),
    )

public suspend fun UpsertUserProfileMutation.execute(
    block_: UpsertUserProfileMutation.Variables.Builder.() -> Unit = {},
): com.google.firebase.dataconnect.MutationResult<
    UpsertUserProfileMutation.Data,
    UpsertUserProfileMutation.Variables,
> =
    ref(
        block_,
    ).execute()
