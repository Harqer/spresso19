package utils

import kotlin.math.round

fun Double.toPriceString(): String {
    val rounded = (this * 100).let { round(it).toInt() }
    val wholePart = rounded / 100
    val fractionPart = (rounded % 100).toString().padStart(2, '0')
    return "$wholePart.$fractionPart"
}
