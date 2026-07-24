package nl.bsodetheepot.mobile.data.services

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.Serializable
import nl.bsodetheepot.mobile.data.models.KmRegistratie
import nl.bsodetheepot.mobile.data.models.KmVoertuig

class NietHogerDanLaatsteFout(laatste: Int) : Exception("De nieuwe stand moet hoger zijn dan de laatste bekende stand ($laatste).")

object KilometerstandenService {
    suspend fun voertuigen(): List<KmVoertuig> =
        SupabaseManager.client.postgrest["km_voertuigen"]
            .select {
                filter { eq("actief", true) }
                order("aangemaakt_op", Order.ASCENDING)
            }
            .decodeList()

    suspend fun laatsteStand(voertuigId: String): Int? = runCatching {
        SupabaseManager.client.postgrest["km_registraties"]
            .select {
                filter { eq("voertuig_id", voertuigId) }
                order("datum", Order.DESCENDING)
                limit(1)
            }
            .decodeSingle<KmRegistratie>()
            .kilometerstand
    }.getOrNull()

    @Serializable
    private data class Insert(val voertuig_id: String, val kilometerstand: Int, val datum: String, val notitie: String?, val ingevoerd_door: String?)

    suspend fun voegToe(voertuigId: String, kilometerstand: Int, datum: String, notitie: String?, ingevoerdDoor: String?) {
        val laatste = laatsteStand(voertuigId)
        if (laatste != null && kilometerstand <= laatste) {
            throw NietHogerDanLaatsteFout(laatste)
        }
        SupabaseManager.client.postgrest["km_registraties"]
            .insert(Insert(voertuigId, kilometerstand, datum, notitie, ingevoerdDoor))
    }
}
