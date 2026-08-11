package ui

import androidx.compose.runtime.Composable
import kotlinx.browser.document
import org.w3c.dom.HTMLInputElement
import org.w3c.dom.events.Event
import org.w3c.files.File
import org.w3c.files.FileReader
import org.khronos.webgl.Int8Array

@JsFun("(array, index) => array[index]")
external fun getInt8ArrayElement(array: Int8Array, index: Int): Byte

@Composable
actual fun rememberImagePicker(onImagePicked: (ByteArray?) -> Unit): () -> Unit {
    return {
        val input = document.createElement("input") as HTMLInputElement
        input.type = "file"
        input.accept = "image/*"
        input.onchange = { event: Event ->
            val file = input.files?.item(0)
            if (file != null) {
                val reader = FileReader()
                reader.onload = {
                    val arrayBuffer = reader.result as org.khronos.webgl.ArrayBuffer
                    val intArray = Int8Array(arrayBuffer)
                    val bytes = ByteArray(intArray.length)
                    for (i in 0 until intArray.length) {
                        bytes[i] = getInt8ArrayElement(intArray, i)
                    }
                    onImagePicked(bytes)
                    null
                }
                reader.readAsArrayBuffer(file)
            } else {
                onImagePicked(null)
            }
            null
        }
        input.click()
    }
}
