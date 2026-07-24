package nl.bsodetheepot.mobile.ui.theme

import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import nl.bsodetheepot.mobile.R

/** Rond app-logo, te gebruiken in headers/login. */
@Composable
fun TheepotLogo(modifier: Modifier = Modifier, grootte: Int = 56) {
    Image(
        painter = painterResource(R.drawable.logo),
        contentDescription = null,
        modifier = modifier
            .size(grootte.dp)
            .clip(CircleShape)
            .border(1.5.dp, Color.White.copy(alpha = 0.6f), CircleShape),
    )
}
