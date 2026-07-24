package nl.bsodetheepot.mobile.ui.screens.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import nl.bsodetheepot.mobile.data.session.SessionViewModel
import nl.bsodetheepot.mobile.ui.theme.TheepotGroen
import nl.bsodetheepot.mobile.ui.theme.TheepotLogo
import nl.bsodetheepot.mobile.ui.theme.theepotGlasKaart

@Composable
fun LoginScreen(session: SessionViewModel) {
    var email by remember { mutableStateOf("") }
    var wachtwoord by remember { mutableStateOf("") }
    val isLoading by session.isLoading.collectAsState()
    val errorMessage by session.errorMessage.collectAsState()
    val focusWachtwoord = remember { FocusRequester() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(PaddingValues(24.dp)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        TheepotLogo(grootte = 84)
        androidx.compose.foundation.layout.Spacer(Modifier.size(12.dp))
        Text("De Theepot", style = MaterialTheme.typography.headlineMedium)
        Text("Kinderopvang", style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
        androidx.compose.foundation.layout.Spacer(Modifier.size(24.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .theepotGlasKaart(padding = 20),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("E-mail") },
                placeholder = { Text("naam@bsodetheepot.nl") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(onNext = { focusWachtwoord.requestFocus() }),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = wachtwoord,
                onValueChange = { wachtwoord = it },
                label = { Text("Wachtwoord") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { session.signIn(email, wachtwoord) }),
                modifier = Modifier.fillMaxWidth().focusRequester(focusWachtwoord),
            )

            if (errorMessage != null) {
                Text(errorMessage.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Button(
                onClick = { session.signIn(email, wachtwoord) },
                enabled = email.isNotBlank() && wachtwoord.isNotBlank() && !isLoading,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = TheepotGroen),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.width(20.dp), color = Color.White)
                } else {
                    Text("Inloggen")
                }
            }
        }
    }
}
