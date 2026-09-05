package components.features.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.spresso.translation.LocaleHelper
import org.jetbrains.compose.resources.stringResource
import spresso.composeapp.generated.resources.*

@Composable
fun LanguageSettingsSection() {
    val localeHelper = remember { LocaleHelper() }
    var currentLocale by remember { mutableStateOf(localeHelper.getCurrentLocale()) }

    val supportedLocales =
        listOf(
            "en" to "English",
            "es" to "Español",
            "de" to "Deutsch",
            "fr" to "Français",
            "ja" to "日本語",
            "pt-BR" to "Português (Brasil)",
            "zh-Hans" to "简体中文",
            "ru" to "Русский",
            "uk" to "Українська",
        )

    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        Text(stringResource(Res.string.settings_language), style = MaterialTheme.typography.titleMedium)
        Spacer(modifier = Modifier.height(8.dp))

        supportedLocales.forEach { (tag, name) ->
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .clickable {
                            localeHelper.setLocale(tag)
                            currentLocale = tag
                        }.padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(
                    selected = currentLocale.startsWith(tag),
                    onClick = {
                        localeHelper.setLocale(tag)
                        currentLocale = tag
                    },
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(name)
            }
        }
    }
}
