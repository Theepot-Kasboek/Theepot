package nl.bsodetheepot.mobile.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/** Merkkleuren, gespiegeld op de CSS-variabelen in app/globals.css van de webapp. */
val TheepotGroen = Color(0xFF8CC63F)
val TheepotGroenDonker = Color(0xFF6FA832)
val TheepotGroenDonkerder = Color(0xFF5A9022)
val TheepotGroenLicht = Color(0xFFEBF5D6)
val TheepotGroenXLicht = Color(0xFFF3FAE8)
val TheepotGroenTekst = Color(0xFF3D6B1A)

private val TheepotColorScheme = lightColorScheme(
    primary = TheepotGroen,
    onPrimary = Color.White,
    secondary = TheepotGroenDonker,
    background = Color(0xFFF7F8FA),
    surface = Color.White,
)

@Composable
fun TheepotTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TheepotColorScheme,
        content = content,
    )
}

/**
 * "Liquid glass" kaartstijl: licht-transparante achtergrond met een dun groen
 * randje, gebruikt voor tegels/koppen buiten standaard lijsten om.
 */
fun Modifier.theepotGlasKaart(hoekradius: Int = 18, padding: Int = 14): Modifier {
    val shape = RoundedCornerShape(hoekradius.dp)
    return this
        .background(Color.White.copy(alpha = 0.72f), shape)
        .border(1.dp, TheepotGroen.copy(alpha = 0.18f), shape)
        .padding(padding.dp)
}
