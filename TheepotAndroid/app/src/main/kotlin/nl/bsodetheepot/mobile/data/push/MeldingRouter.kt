package nl.bsodetheepot.mobile.data.push

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Gedeelde deeplink-state, analoog aan MeldingRouter.swift. MainActivity zet
 * `gewenstGesprekId` als de app via een pushmelding (of de intent bij cold
 * start) geopend wordt; DashboardScreen/ChatListScreen lezen dat om naar het
 * juiste gesprek te navigeren. `actiefGesprekId` houdt bij welk gesprek open
 * staat; TheepotMessagingService gebruikt dat om `onMessageReceived` de
 * banner te laten onderdrukken (via de notificatie zelf hoeft dat op Android
 * niet apart, want de app tekent zelf de melding — zie TheepotMessagingService).
 */
object MeldingRouter {
    private val _gewenstGesprekId = MutableStateFlow<String?>(null)
    val gewenstGesprekId: StateFlow<String?> = _gewenstGesprekId.asStateFlow()

    private val _actiefGesprekId = MutableStateFlow<String?>(null)
    val actiefGesprekId: StateFlow<String?> = _actiefGesprekId.asStateFlow()

    /** Zelfde patroon als `gewenstGesprekId`, maar voor een tik op een agenda-herinnering. */
    private val _gewenstAfspraakId = MutableStateFlow<String?>(null)
    val gewenstAfspraakId: StateFlow<String?> = _gewenstAfspraakId.asStateFlow()

    fun open(gesprekId: String) {
        _gewenstGesprekId.value = gesprekId
    }

    fun verwerkt() {
        _gewenstGesprekId.value = null
    }

    fun zetActiefGesprek(gesprekId: String?) {
        _actiefGesprekId.value = gesprekId
    }

    fun openAfspraak(afspraakId: String) {
        _gewenstAfspraakId.value = afspraakId
    }

    fun verwerktAfspraak() {
        _gewenstAfspraakId.value = null
    }
}
