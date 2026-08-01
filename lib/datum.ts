// Datumhulpjes die met de Nederlandse tijd rekenen.
//
// Gebruik deze in plaats van `new Date().toISOString().split('T')[0]`:
// toISOString() rekent naar UTC, en Nederland loopt daarop voor (+1 in de
// winter, +2 in de zomer). Tussen middernacht en 01:00/02:00 krijg je dan de
// dag ervoor te pakken — in formulieren zie je dan de verkeerde datum staan.

/** Een datum als "JJJJ-MM-DD" in lokale tijd. */
export function datumSleutel(datum: Date | string): string {
  const d = datum instanceof Date ? datum : new Date(datum)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Vandaag als "JJJJ-MM-DD" in lokale tijd — voor standaardwaarden in formulieren. */
export function vandaagLokaal(): string {
  return datumSleutel(new Date())
}
