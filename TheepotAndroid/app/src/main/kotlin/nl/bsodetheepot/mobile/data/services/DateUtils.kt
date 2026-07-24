package nl.bsodetheepot.mobile.data.services

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Gedeelde datum/tijd-hulpfuncties, Europe/Amsterdam, mirroring de Swift-services. */
object DateUtils {
    val amsterdam: ZoneId = ZoneId.of("Europe/Amsterdam")
    private val isoDate = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    private val maandFormatter = DateTimeFormatter.ofPattern("LLLL yyyy", Locale("nl", "NL"))

    fun vandaag(): LocalDate = LocalDate.now(amsterdam)

    fun periodeSleutel(date: LocalDate = vandaag()): String =
        date.format(DateTimeFormatter.ofPattern("yyyy-MM"))

    /** Maandag van de ISO-week waarin `date` valt. */
    fun maandaagVanWeek(date: LocalDate): LocalDate =
        date.with(DayOfWeek.MONDAY)

    fun toDateStr(date: LocalDate): String = date.format(isoDate)

    fun parseDateStr(s: String): LocalDate? = runCatching { LocalDate.parse(s, isoDate) }.getOrNull()

    fun maandLabel(date: LocalDate): String = date.format(maandFormatter)

    fun nowIso(): String = Instant.now().toString()
}
