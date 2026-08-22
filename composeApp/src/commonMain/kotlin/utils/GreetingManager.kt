package utils

import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

object GreetingManager {
    fun getGreeting(userName: String?): String {
        val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault())
        val hour = now.hour

        val timeBlock =
            when (hour) {
                in 0..4 -> "Late Night"
                in 5..8 -> "Early Morning"
                in 9..11 -> "Morning"
                in 12..16 -> "Afternoon"
                in 17..20 -> "Evening"
                else -> "Night"
            }

        val greetingBase =
            when (timeBlock) {
                "Late Night" -> "Still awake"
                "Early Morning" -> "Rise and shine"
                "Morning" -> "Good morning"
                "Afternoon" -> "Good afternoon"
                "Evening" -> "Good evening"
                "Night" -> "Good night"
                else -> "Hello"
            }

        val name =
            if (userName.isNullOrBlank() ||
                userName.lowercase() == "null" ||
                userName.lowercase() == "undefined"
            ) {
                ""
            } else {
                ", $userName"
            }
        return "$greetingBase$name!"
    }
}
