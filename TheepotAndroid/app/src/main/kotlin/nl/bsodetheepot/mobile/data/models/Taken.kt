package nl.bsodetheepot.mobile.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.services.DateUtils

@Serializable
enum class LijstType {
    @SerialName("taken") TAKEN,
    @SerialName("notities") NOTITIES,
}

enum class Prioriteit(val waarde: Int) {
    GEEN(0), LAAG(1), MEDIUM(2), HOOG(3);

    val label: String
        get() = when (this) {
            GEEN -> "Geen"
            LAAG -> "Laag"
            MEDIUM -> "Medium"
            HOOG -> "Hoog"
        }

    val kleurHex: String
        get() = when (this) {
            GEEN -> "#9CA3AF"
            LAAG -> "#3B82F6"
            MEDIUM -> "#F59E0B"
            HOOG -> "#EF4444"
        }

    companion object {
        fun vanWaarde(w: Int): Prioriteit = entries.firstOrNull { it.waarde == w } ?: GEEN
    }
}

/** Tabel `todo_lijsten`. */
@Serializable
data class TodoLijst(
    val id: String,
    val naam: String,
    val kleur: String,
    @SerialName("eigenaar_id") val eigenaarId: String,
    val volgorde: Int,
    val type: LijstType,
)

/** Tabel `todo_taken`. */
@Serializable
data class TodoTaak(
    val id: String,
    @SerialName("lijst_id") val lijstId: String,
    val titel: String,
    val notitie: String? = null,
    val voltooid: Boolean = false,
    val prioriteit: Int = 0,
    val vervaldatum: String? = null,
    val volgorde: Int = 0,
    @SerialName("voltooid_op") val voltooidOp: String? = null,
) {
    val prioriteitEnum: Prioriteit get() = Prioriteit.vanWaarde(prioriteit)

    val isVerlopen: Boolean
        get() {
            if (voltooid) return false
            val datum = vervaldatum?.let { DateUtils.parseDateStr(it) } ?: return false
            return datum.isBefore(DateUtils.vandaag())
        }

    val isVandaag: Boolean
        get() = vervaldatum == DateUtils.toDateStr(DateUtils.vandaag())
}

/** Tabel `notities`. */
@Serializable
data class Notitie(
    val id: String,
    @SerialName("lijst_id") val lijstId: String,
    val titel: String,
    val inhoud: String,
    val kleur: String = "#ffffff",
    val volgorde: Int = 0,
    @SerialName("bijgewerkt_op") val bijgewerktOp: String? = null,
)
