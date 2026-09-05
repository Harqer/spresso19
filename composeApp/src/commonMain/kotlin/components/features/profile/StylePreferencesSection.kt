package components.features.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Checkroom
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StylePreferencesSection(
    fitPreference: String,
    height: String,
    weight: String,
    onFitPreferenceChange: (String) -> Unit,
    onHeightChange: (String) -> Unit,
    onWeightChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val fitOptions = listOf("tailored", "regular", "relaxed", "oversized")
    var expanded by remember { mutableStateOf(false) }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(
                    imageVector = Icons.Outlined.Checkroom,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text("Style Preferences", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }

            Text(
                text = "Help Spresso find the right fit and style for you.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            // Fit preference dropdown
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = it },
            ) {
                OutlinedTextField(
                    value = fitPreference.replaceFirstChar { it.uppercase() },
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Fit Preference") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false },
                ) {
                    fitOptions.forEach { option ->
                        DropdownMenuItem(
                            text = { Text(option.replaceFirstChar { it.uppercase() }) },
                            onClick = {
                                onFitPreferenceChange(option)
                                expanded = false
                            },
                        )
                    }
                }
            }

            // Height
            OutlinedTextField(
                value = height,
                onValueChange = onHeightChange,
                label = { Text("Height") },
                placeholder = { Text("e.g. 5'10\" or 178 cm") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            // Weight
            OutlinedTextField(
                value = weight,
                onValueChange = onWeightChange,
                label = { Text("Weight") },
                placeholder = { Text("e.g. 165 lbs or 75 kg") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
        }
    }
}
