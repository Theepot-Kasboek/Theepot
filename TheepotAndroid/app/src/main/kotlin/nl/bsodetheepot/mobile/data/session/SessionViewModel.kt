package nl.bsodetheepot.mobile.data.session

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import nl.bsodetheepot.mobile.data.models.LocatieToegangRow
import nl.bsodetheepot.mobile.data.models.Profiel
import nl.bsodetheepot.mobile.data.models.Rechten
import nl.bsodetheepot.mobile.data.models.Rol
import nl.bsodetheepot.mobile.data.models.Toegang
import nl.bsodetheepot.mobile.data.services.SupabaseManager

/**
 * Houdt de ingelogde gebruiker (profiel + rechten + locatietoegang) bij,
 * spiegelt components/AuthProvider.tsx. Rollen: superadmin, directie,
 * leidinggevende, locatie.
 */
class SessionViewModel : ViewModel() {
    private val _profiel = MutableStateFlow<Profiel?>(null)
    val profiel: StateFlow<Profiel?> = _profiel.asStateFlow()

    private val _rechten = MutableStateFlow(Rechten.GEEN)
    val rechten: StateFlow<Rechten> = _rechten.asStateFlow()

    private val _locatieToegang = MutableStateFlow<List<LocatieToegangRow>>(emptyList())
    val locatieToegang: StateFlow<List<LocatieToegangRow>> = _locatieToegang.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    val isSuperadmin: Boolean get() = _profiel.value?.rol == Rol.SUPERADMIN

    /** Spiegelt `magAllesZien` in AuthProvider.tsx. */
    val magAllesZien: Boolean
        get() = when (_profiel.value?.rol) {
            Rol.SUPERADMIN, Rol.DIRECTIE, Rol.LEIDINGGEVENDE -> true
            else -> false
        }

    /** Toegang tot een locatie voor een gegeven module (locatie_type). */
    fun toegang(locatieNaam: String, locatieType: String): Toegang {
        if (magAllesZien) return Toegang.BEWERKEN
        return _locatieToegang.value
            .firstOrNull { it.locatieType == locatieType && it.locatieNaam == locatieNaam }
            ?.toegang ?: Toegang.GEEN
    }

    fun bootstrap() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                SupabaseManager.client.auth.awaitInitialization()
                val session = SupabaseManager.client.auth.currentSessionOrNull()
                if (session != null) {
                    loadProfiel(session.user!!.id)
                } else {
                    _profiel.value = null
                }
            } catch (e: Exception) {
                _profiel.value = null
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                SupabaseManager.client.auth.signInWith(Email) {
                    this.email = email
                    this.password = password
                }
                val userId = SupabaseManager.client.auth.currentUserOrNull()?.id
                if (userId != null) {
                    loadProfiel(userId)
                }
            } catch (e: Exception) {
                _errorMessage.value = "Inloggen mislukt. Controleer je e-mail en wachtwoord."
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            try {
                SupabaseManager.client.auth.signOut()
            } catch (_: Exception) {
            }
            _profiel.value = null
            _rechten.value = Rechten.GEEN
            _locatieToegang.value = emptyList()
        }
    }

    private suspend fun loadProfiel(userId: String) {
        try {
            val profiel = SupabaseManager.client.postgrest["profielen"]
                .select {
                    filter { eq("id", userId) }
                }
                .decodeSingle<Profiel>()
            _profiel.value = profiel

            if (profiel.rol == Rol.SUPERADMIN) {
                _rechten.value = Rechten.SUPERADMIN
                _locatieToegang.value = emptyList()
                return
            }

            coroutineScopeLoad(userId, profiel.rol)
        } catch (e: Exception) {
            _profiel.value = null
            _rechten.value = Rechten.GEEN
            _errorMessage.value = "Profiel kon niet worden geladen."
        }
    }

    private suspend fun coroutineScopeLoad(userId: String, rol: Rol) {
        kotlinx.coroutines.coroutineScope {
            val accountRecht = async {
                runCatching {
                    SupabaseManager.client.postgrest["rechten"]
                        .select { filter { eq("profiel_id", userId) } }
                        .decodeSingle<Rechten>()
                }.getOrNull()
            }
            val rolRecht = async {
                runCatching {
                    SupabaseManager.client.postgrest["rechten"]
                        .select { filter { eq("rol", rol.name.lowercase()) } }
                        .decodeSingle<Rechten>()
                }.getOrNull()
            }
            val ltData = async {
                runCatching {
                    SupabaseManager.client.postgrest["locatie_toegang"]
                        .select { filter { eq("profiel_id", userId) } }
                        .decodeList<LocatieToegangRow>()
                }.getOrDefault(emptyList())
            }

            val account = accountRecht.await()
            val rolR = rolRecht.await()
            val lt = ltData.await()
            _rechten.value = account ?: rolR ?: Rechten.GEEN
            _locatieToegang.value = lt
        }
    }
}
