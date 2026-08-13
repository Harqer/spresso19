package components.molecules

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun AuthForm(
    mode: String,
    email: String,
    onEmailChange: (String) -> Unit,
    password: String,
    onPasswordChange: (String) -> Unit,
    name: String,
    onNameChange: (String) -> Unit,
    loading: Boolean,
    errorMsg: String?,
    onGoogleSignInRequested: () -> Unit,
    onSubmitRequested: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (errorMsg != null) {
            Surface(modifier = Modifier.fillMaxWidth(), color = Color(0xFFFEF2F2), shape = RoundedCornerShape(12.dp)) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.ErrorOutline, null, tint = Color(0xFFB91C1C), modifier = Modifier.size(16.dp))
                    Text(errorMsg, fontSize = 11.sp, color = Color(0xFFB91C1C))
                }
            }
        }

        OutlinedButton(
            onClick = onGoogleSignInRequested,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF18211E)),
            border = BorderStroke(1.dp, Color(0xFFD8EBD7))
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(18.dp), tint = Color(0xFF4285F4))
                Text("Continue with Google", fontWeight = FontWeight.Medium, fontSize = 14.sp)
            }
        }

        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFD8EBD7), thickness = 1.dp)
            Text("OR WITH EMAIL", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF52645B), modifier = Modifier.padding(horizontal = 12.dp))
            HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFD8EBD7), thickness = 1.dp)
        }

        if (mode == "register") {
            OutlinedTextField(
                value = name, onValueChange = onNameChange, label = { Text("Full Name", fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true
            )
        }
        OutlinedTextField(
            value = email, onValueChange = onEmailChange, label = { Text("Email Address", fontSize = 12.sp) },
            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true
        )
        OutlinedTextField(
            value = password, onValueChange = onPasswordChange, label = { Text("Password", fontSize = 12.sp) },
            visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true
        )

        Spacer(modifier = Modifier.height(4.dp))

        Button(
            onClick = onSubmitRequested, enabled = !loading, modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF386633))
        ) {
            if (loading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
            } else {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(if (mode == "signin") "Sign In" else "Create Account", fontWeight = FontWeight.Bold)
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, null, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}
