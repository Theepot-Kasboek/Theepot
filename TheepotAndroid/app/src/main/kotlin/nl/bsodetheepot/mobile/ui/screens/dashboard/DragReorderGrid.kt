package nl.bsodetheepot.mobile.ui.screens.dashboard

import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInParent
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex

/**
 * Handgeschreven drag-to-reorder grid (geen library-dependency toegevoegd
 * voor dit ene scherm). `items` is een [SnapshotStateList] die tijdens het
 * slepen zelf in-place wordt herschikt (live visuele feedback); pas bij het
 * loslaten wordt [onReorderEnd] aangeroepen — dat is het enige moment waarop
 * de aanroeper naar Supabase mag schrijven.
 *
 * Alle accounts mogen slepen; er is bewust geen rolcheck in deze component.
 */
@Composable
fun <T> DragReorderGrid(
    items: SnapshotStateList<T>,
    columns: Int,
    key: (T) -> Any,
    onReorderEnd: (List<T>) -> Unit,
    modifier: Modifier = Modifier,
    horizontalSpacing: Dp = 12.dp,
    verticalSpacing: Dp = 12.dp,
    itemContent: @Composable (T) -> Unit,
) {
    val itemBounds = remember { mutableStateMapOf<Any, Rect>() }
    var draggedKey by remember { mutableStateOf<Any?>(null) }
    var dragOffset by remember { mutableStateOf(Offset.Zero) }

    LazyVerticalGrid(
        columns = GridCells.Fixed(columns),
        horizontalArrangement = Arrangement.spacedBy(horizontalSpacing),
        verticalArrangement = Arrangement.spacedBy(verticalSpacing),
        modifier = modifier,
    ) {
        items(items, key = key) { item ->
            val itemKey = key(item)
            val isDragged = itemKey == draggedKey

            Box(
                modifier = Modifier
                    .onGloballyPositioned { coords -> itemBounds[itemKey] = coords.boundsInParent() }
                    .then(
                        if (isDragged) {
                            Modifier
                                .zIndex(1f)
                                .graphicsLayer {
                                    translationX = dragOffset.x
                                    translationY = dragOffset.y
                                    scaleX = 1.03f
                                    scaleY = 1.03f
                                }
                        } else {
                            Modifier
                        },
                    )
                    .pointerInput(itemKey) {
                        detectDragGesturesAfterLongPress(
                            onDragStart = {
                                draggedKey = itemKey
                                dragOffset = Offset.Zero
                            },
                            onDrag = { change, delta ->
                                change.consume()
                                dragOffset += delta
                                val draggedBounds = itemBounds[itemKey] ?: return@detectDragGesturesAfterLongPress
                                val huidigeCentrum = draggedBounds.center + dragOffset
                                val doelEntry = itemBounds.entries.firstOrNull { (k, bounds) ->
                                    k != itemKey && bounds.contains(huidigeCentrum)
                                }
                                val vanIndex = items.indexOfFirst { key(it) == itemKey }
                                val naarIndex = doelEntry?.let { entry -> items.indexOfFirst { key(it) == entry.key } }
                                if (naarIndex != null && naarIndex != -1 && vanIndex != -1 && naarIndex != vanIndex) {
                                    val verplaatst = items.removeAt(vanIndex)
                                    items.add(naarIndex, verplaatst)
                                    // Buur is nu op de plek van het gesleepte item verschoven;
                                    // corrigeer de offset zodat de kaart niet "meespringt".
                                    val nieuweBounds = itemBounds[itemKey]
                                    if (nieuweBounds != null) dragOffset = draggedBounds.center + dragOffset - nieuweBounds.center
                                }
                            },
                            onDragEnd = {
                                draggedKey = null
                                dragOffset = Offset.Zero
                                onReorderEnd(items.toList())
                            },
                            onDragCancel = {
                                draggedKey = null
                                dragOffset = Offset.Zero
                            },
                        )
                    },
            ) {
                itemContent(item)
            }
        }
    }
}
