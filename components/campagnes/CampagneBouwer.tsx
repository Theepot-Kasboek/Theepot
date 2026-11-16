"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Type, Image as ImageIcon, Link2, QrCode, Trash2, GripVertical, Upload, AlignLeft, AlignCenter, AlignRight,
  Megaphone, Columns2, ArrowLeftRight, Bold, Italic, SeparatorHorizontal, Share2, Copy, Rows2, BookmarkPlus, Bookmark, X,
  Heading,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import {
  CampagneBlok, Kolom, Uitlijning, TekstStijlVelden, KnopInhoud, SocialPlatform, BlokSjabloon, SOCIAL_PLATFORMS,
  nieuwBlok, nieuweKolomInhoud, kloonBlok, afbeeldingUrl, CAMPAGNE_AFBEELDINGEN_BUCKET, LETTERTYPEN,
  sanitizeRijkeTekst,
} from "@/lib/campagnes";

interface Props {
  blokken: CampagneBlok[];
  onChange: (blokken: CampagneBlok[]) => void;
  magBewerken: boolean;
  onQrDataUrlsChange?: (dataUrls: Record<string, string>) => void;
  sjablonen?: BlokSjabloon[];
  onSjabloonOpslaan?: (blok: CampagneBlok) => void;
  onSjabloonVerwijderen?: (id: string) => void;
}

const PALET: { type: CampagneBlok["type"]; label: string; icoon: typeof Type }[] = [
  { type: "tekst", label: "Tekst", icoon: Type },
  { type: "afbeelding", label: "Afbeelding", icoon: ImageIcon },
  { type: "knop", label: "Knop / link", icoon: Link2 },
  { type: "qr", label: "QR-code", icoon: QrCode },
  { type: "reclame", label: "Reclame (volledig)", icoon: Megaphone },
  { type: "rij", label: "Combinatieblok", icoon: Columns2 },
  { type: "scheiding", label: "Scheiding", icoon: SeparatorHorizontal },
  { type: "socials", label: "Social media", icoon: Share2 },
];

const veld = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A2E0D] bg-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F]";

export default function CampagneBouwer({
  blokken, onChange, magBewerken, onQrDataUrlsChange, sjablonen = [], onSjabloonOpslaan, onSjabloonVerwijderen,
}: Props) {
  const [actief, setActief] = useState<string | null>(null);
  const [uploadBezig, setUploadBezig] = useState<string | null>(null);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [dragPaletType, setDragPaletType] = useState<CampagneBlok["type"] | null>(null);
  const [dragSjabloonNaam, setDragSjabloonNaam] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // QR-codes genereren zodra de waarde van een qr-blok verandert
  useEffect(() => {
    const qrBlokken = blokken.filter((b): b is Extract<CampagneBlok, { type: "qr" }> => b.type === "qr" && !!b.waarde.trim());
    let geannuleerd = false;
    Promise.all(qrBlokken.map(async b => {
      const url = await QRCode.toDataURL(b.waarde, { width: 320, margin: 1, color: { dark: "#1A2E0D", light: "#FFFFFF" } });
      return [b.id, url] as const;
    })).then(paren => {
      if (geannuleerd) return;
      const nieuw = Object.fromEntries(paren);
      setQrDataUrls(nieuw);
      onQrDataUrlsChange?.(nieuw);
    });
    return () => { geannuleerd = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(blokken.filter(b => b.type === "qr"))]);

  function updateBlok(id: string, patch: Partial<CampagneBlok>) {
    onChange(blokken.map(b => b.id === id ? ({ ...b, ...patch } as CampagneBlok) : b));
  }

  function updateRijKolom(blokId: string, kant: "links" | "rechts", patch: Record<string, unknown>) {
    onChange(blokken.map(b => {
      if (b.id !== blokId || b.type !== "rij") return b;
      return { ...b, [kant]: { ...b[kant], ...patch } } as CampagneBlok;
    }));
  }

  function wisselRijKanten(blokId: string) {
    onChange(blokken.map(b => (b.id === blokId && b.type === "rij") ? { ...b, links: b.rechts, rechts: b.links } : b));
  }

  function verwijderBlok(id: string) {
    onChange(blokken.filter(b => b.id !== id));
    if (actief === id) setActief(null);
  }

  function dupliceerBlok(id: string) {
    const index = blokken.findIndex(b => b.id === id);
    if (index === -1) return;
    const kloon = kloonBlok(blokken[index]);
    const kopie = [...blokken];
    kopie.splice(index + 1, 0, kloon);
    onChange(kopie);
    setActief(kloon.id);
  }

  function voegBlokToe(blok: CampagneBlok, index?: number) {
    if (index === undefined) {
      onChange([...blokken, blok]);
    } else {
      const kopie = [...blokken];
      kopie.splice(index, 0, blok);
      onChange(kopie);
    }
    setActief(blok.id);
  }

  function voegToeAanEinde(type: CampagneBlok["type"]) {
    voegBlokToe(nieuwBlok(type));
  }

  function voegToeOpIndex(type: CampagneBlok["type"], index: number) {
    voegBlokToe(nieuwBlok(type), index);
  }

  function voegSjabloonToeAanEinde(sjabloon: BlokSjabloon) {
    voegBlokToe(kloonBlok(sjabloon.blok));
  }

  function voegSjabloonToeOpIndex(sjabloon: BlokSjabloon, index: number) {
    voegBlokToe(kloonBlok(sjabloon.blok), index);
  }

  async function uploadAfbeelding(blokId: string, bestand: File) {
    setUploadBezig(blokId);
    const ext = bestand.name.split(".").pop() || "jpg";
    const pad = `campagnes/${blokId}.${ext}`;
    const { error } = await getSupabase().storage.from(CAMPAGNE_AFBEELDINGEN_BUCKET).upload(pad, bestand, { upsert: true });
    setUploadBezig(null);
    if (error) { alert("Upload mislukt: " + error.message); return; }
    updateBlok(blokId, { pad } as Partial<CampagneBlok>);
  }

  async function uploadKolomAfbeelding(blokId: string, kant: "links" | "rechts", bestand: File) {
    const sleutel = `${blokId}-${kant}`;
    setUploadBezig(sleutel);
    const ext = bestand.name.split(".").pop() || "jpg";
    const pad = `campagnes/${sleutel}.${ext}`;
    const { error } = await getSupabase().storage.from(CAMPAGNE_AFBEELDINGEN_BUCKET).upload(pad, bestand, { upsert: true });
    setUploadBezig(null);
    if (error) { alert("Upload mislukt: " + error.message); return; }
    updateRijKolom(blokId, kant, { pad });
  }

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("palet-")) setDragPaletType(id.replace("palet-", "") as CampagneBlok["type"]);
    if (id.startsWith("sjabloon-")) {
      const sjabloon = sjablonen.find(s => s.id === id.replace("sjabloon-", ""));
      if (sjabloon) setDragSjabloonNaam(sjabloon.naam);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    setDragPaletType(null);
    setDragSjabloonNaam(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);

    if (activeId.startsWith("palet-")) {
      const type = activeId.replace("palet-", "") as CampagneBlok["type"];
      const overId = String(over.id);
      if (overId === "canvas-leeg") { voegToeAanEinde(type); return; }
      const overIndex = blokken.findIndex(b => b.id === overId);
      voegToeOpIndex(type, overIndex === -1 ? blokken.length : overIndex);
      return;
    }

    if (activeId.startsWith("sjabloon-")) {
      const sjabloonId = activeId.replace("sjabloon-", "");
      const sjabloon = sjablonen.find(s => s.id === sjabloonId);
      if (!sjabloon) return;
      const overId = String(over.id);
      if (overId === "canvas-leeg") { voegSjabloonToeAanEinde(sjabloon); return; }
      const overIndex = blokken.findIndex(b => b.id === overId);
      voegSjabloonToeOpIndex(sjabloon, overIndex === -1 ? blokken.length : overIndex);
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = blokken.findIndex(b => b.id === active.id);
      const newIndex = blokken.findIndex(b => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onChange(arrayMove(blokken, oldIndex, newIndex));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
        {/* Palet */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Blokken</div>
          {PALET.map(p => (
            <PaletKnop key={p.type} type={p.type} label={p.label} Icoon={p.icoon} disabled={!magBewerken}
              onClick={() => magBewerken && voegToeAanEinde(p.type)} />
          ))}
          <p className="text-xs text-gray-400 pt-2">Sleep een blok naar de mail, of klik om onderaan toe te voegen.</p>

          {sjablonen.length > 0 && (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1 pt-3 border-t border-gray-100">Mijn sjablonen</div>
              {sjablonen.map(s => (
                <SjabloonKnop key={s.id} sjabloon={s} disabled={!magBewerken}
                  onClick={() => magBewerken && voegSjabloonToeAanEinde(s)}
                  onVerwijder={() => onSjabloonVerwijderen?.(s.id)} />
              ))}
            </>
          )}
        </div>

        {/* Canvas */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 min-h-[300px]">
          {blokken.length === 0 ? (
            <LeegCanvas />
          ) : (
            <SortableContext items={blokken.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {blokken.map(blok => (
                  <BlokKaart
                    key={blok.id}
                    blok={blok}
                    actief={actief === blok.id}
                    magBewerken={magBewerken}
                    uploadBezig={uploadBezig === blok.id}
                    uploadBezigKolom={kant => uploadBezig === `${blok.id}-${kant}`}
                    qrDataUrl={qrDataUrls[blok.id]}
                    onSelect={() => setActief(blok.id)}
                    onChange={patch => updateBlok(blok.id, patch)}
                    onVerwijder={() => verwijderBlok(blok.id)}
                    onUpload={bestand => uploadAfbeelding(blok.id, bestand)}
                    onKolomChange={(kant, patch) => updateRijKolom(blok.id, kant, patch)}
                    onKolomUpload={(kant, bestand) => uploadKolomAfbeelding(blok.id, kant, bestand)}
                    onWisselKanten={() => wisselRijKanten(blok.id)}
                    onDupliceren={() => dupliceerBlok(blok.id)}
                    onOpslaanAlsSjabloon={onSjabloonOpslaan ? () => onSjabloonOpslaan(blok) : undefined}
                    fileInputRef={el => { fileInputs.current[blok.id] = el; }}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>

      <DragOverlay>
        {dragPaletType ? (
          <div className="px-4 py-2.5 rounded-xl bg-[#3D6B1A] text-white text-sm font-medium shadow-lg" style={{ background: "#3D6B1A" }}>
            + {PALET.find(p => p.type === dragPaletType)?.label}
          </div>
        ) : dragSjabloonNaam ? (
          <div className="px-4 py-2.5 rounded-xl bg-[#3D6B1A] text-white text-sm font-medium shadow-lg" style={{ background: "#3D6B1A" }}>
            + {dragSjabloonNaam}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function PaletKnop({ type, label, Icoon, disabled, onClick }: {
  type: CampagneBlok["type"]; label: string; Icoon: typeof Type; disabled: boolean; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggableSafe(`palet-${type}`, disabled);
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      disabled={disabled}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, opacity: isDragging ? 0.4 : 1 }}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-[#EBF5D6] hover:border-[#8CC63F] text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-grab active:cursor-grabbing"
    >
      <Icoon size={15} />
      {label}
    </button>
  );
}

function SjabloonKnop({ sjabloon, disabled, onClick, onVerwijder }: {
  sjabloon: BlokSjabloon; disabled: boolean; onClick: () => void; onVerwijder: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggableSafe(`sjabloon-${sjabloon.id}`, disabled);
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, opacity: isDragging ? 0.4 : 1 }}
      className="relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-[#EBF5D6] hover:border-[#8CC63F] text-sm font-medium text-gray-700 cursor-grab active:cursor-grabbing"
    >
      <Bookmark size={14} className="flex-shrink-0" />
      <span className="truncate">{sjabloon.naam}</span>
      <button type="button" onClick={e => { e.stopPropagation(); onVerwijder(); }}
        className="ml-auto text-gray-300 hover:text-red-500 flex-shrink-0" title="Sjabloon verwijderen">
        <X size={13} />
      </button>
    </div>
  );
}

// Kleine wrapper zodat we useDraggable conditioneel "uitzetten" zonder hooks-regels te breken
function useDraggableSafe(id: string, disabled: boolean) {
  const res = useDraggable({ id, disabled });
  return res;
}

function LeegCanvas() {
  const { setNodeRef, isOver } = useDroppableSafe("canvas-leeg");
  return (
    <div ref={setNodeRef} className={`text-center py-16 rounded-xl border-2 border-dashed transition-colors ${isOver ? "border-[#8CC63F] bg-[#EBF5D6]" : "border-gray-200"}`}>
      <div className="text-4xl mb-3">📧</div>
      <p className="text-gray-500 font-medium">Nog geen inhoud</p>
      <p className="text-gray-400 text-sm mt-1">Sleep een blok hierheen om te beginnen</p>
    </div>
  );
}

function useDroppableSafe(id: string) {
  return useDroppable({ id });
}

function BlokKaart({
  blok, actief, magBewerken, uploadBezig, uploadBezigKolom, qrDataUrl, onSelect, onChange, onVerwijder, onUpload,
  onKolomChange, onKolomUpload, onWisselKanten, onDupliceren, onOpslaanAlsSjabloon, fileInputRef,
}: {
  blok: CampagneBlok;
  actief: boolean;
  magBewerken: boolean;
  uploadBezig: boolean;
  uploadBezigKolom: (kant: "links" | "rechts") => boolean;
  qrDataUrl?: string;
  onSelect: () => void;
  onChange: (patch: Partial<CampagneBlok>) => void;
  onVerwijder: () => void;
  onUpload: (bestand: File) => void;
  onKolomChange: (kant: "links" | "rechts", patch: Record<string, unknown>) => void;
  onKolomUpload: (kant: "links" | "rechts", bestand: File) => void;
  onWisselKanten: () => void;
  onDupliceren: () => void;
  onOpslaanAlsSjabloon?: () => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: blok.id });
  const stijl = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={stijl} onClick={onSelect}
      className={`relative rounded-xl border p-3 pl-9 transition-colors ${actief ? "border-[#8CC63F] bg-[#EBF5D6]/40" : "border-gray-100 hover:border-gray-200"}`}>
      <button {...attributes} {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing" tabIndex={-1}>
        <GripVertical size={16} />
      </button>

      {magBewerken && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {onOpslaanAlsSjabloon && (
            <button onClick={e => { e.stopPropagation(); onOpslaanAlsSjabloon(); }} className="text-gray-300 hover:text-[#3D6B1A] p-0.5" title="Opslaan als sjabloon">
              <BookmarkPlus size={15} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onDupliceren(); }} className="text-gray-300 hover:text-gray-600 p-0.5" title="Dupliceren">
            <Copy size={15} />
          </button>
          <button onClick={e => { e.stopPropagation(); onVerwijder(); }} className="text-gray-300 hover:text-red-500 p-0.5" title="Verwijderen">
            <Trash2 size={15} />
          </button>
        </div>
      )}

      <fieldset disabled={!magBewerken} className="pr-20 space-y-2.5">
        {blok.type === "tekst" && (
          <>
            <KopVeld kop={blok.kop} kopStijl={blok.kopStijl} onChange={patch => onChange(patch as Partial<CampagneBlok>)} />

            <RijkeTekstEditor
              html={blok.tekst}
              onChange={tekst => onChange({ tekst } as Partial<CampagneBlok>)}
              placeholder={"Typ hier je tekst... (selecteer tekst om vet/cursief te maken)\n• of begin een regel met een bolletje voor een lijst"}
              style={{
                fontFamily: blok.lettertype || LETTERTYPEN[0].waarde, fontSize: (blok.tekstgrootte || 15) + "px",
                color: blok.kleur || "#1A2E0D", textAlign: htmlAlign(blok.uitlijning),
                fontWeight: blok.vet ? 700 : 400, fontStyle: blok.cursief ? "italic" : "normal", lineHeight: blok.regelafstand ?? 1.5,
              }}
            />
            <StijlRij>
              <input type="number" min={10} max={36} value={blok.tekstgrootte || 15}
                onChange={e => onChange({ tekstgrootte: Number(e.target.value) } as Partial<CampagneBlok>)}
                className={`${stijlVeld} w-16`} title="Tekstgrootte (px)" />
              <UitlijningKnoppen waarde={blok.uitlijning} onChange={u => onChange({ uitlijning: u } as Partial<CampagneBlok>)} />
            </StijlRij>
            <TekstStijlRij stijl={blok} onChange={patch => onChange(patch as Partial<CampagneBlok>)} toonRegelafstand rijkeTekst />
          </>
        )}

        {blok.type === "afbeelding" && (
          <>
            <AfbeeldingBlokVeld blok={blok} onChange={onChange} uploadBezig={uploadBezig} onUpload={onUpload} fileInputRef={fileInputRef} />
            <StijlRij>
              <label className="text-xs text-gray-400 flex items-center gap-1.5">
                Breedte
                <input type="range" min={20} max={100} step={5} value={blok.breedte ?? 100}
                  onChange={e => onChange({ breedte: Number(e.target.value) } as Partial<CampagneBlok>)} className="w-24" />
                <span className="w-9 text-right">{blok.breedte ?? 100}%</span>
              </label>
              <UitlijningKnoppen waarde={blok.uitlijning} onChange={u => onChange({ uitlijning: u } as Partial<CampagneBlok>)} />
            </StijlRij>
          </>
        )}

        {blok.type === "knop" && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <input value={blok.label} onChange={e => onChange({ label: e.target.value } as Partial<CampagneBlok>)}
                placeholder="Knoptekst" className={`${veld} max-w-[220px]`} />
              <input value={blok.url} onChange={e => onChange({ url: e.target.value } as Partial<CampagneBlok>)}
                placeholder="https://..." className={`${veld} flex-1 min-w-[180px]`} />
            </div>
            <div style={{ textAlign: htmlAlign(blok.uitlijning) }}>
              <span className="inline-block px-5 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: blok.achtergrondkleur || "#3D6B1A", color: blok.tekstkleur || "#ffffff",
                  fontFamily: blok.lettertype || LETTERTYPEN[0].waarde,
                  fontWeight: blok.vet === false ? 400 : 700, fontStyle: blok.cursief ? "italic" : "normal",
                }}>
                {blok.label || "Knoptekst"}
              </span>
            </div>
            <StijlRij>
              <label className="text-xs text-gray-400 flex items-center gap-1.5">
                Knop
                <input type="color" value={blok.achtergrondkleur || "#3D6B1A"} onChange={e => onChange({ achtergrondkleur: e.target.value } as Partial<CampagneBlok>)}
                  className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
              </label>
              <label className="text-xs text-gray-400 flex items-center gap-1.5">
                Tekst
                <input type="color" value={blok.tekstkleur || "#ffffff"} onChange={e => onChange({ tekstkleur: e.target.value } as Partial<CampagneBlok>)}
                  className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
              </label>
              <LettertypeSelect waarde={blok.lettertype} onChange={v => onChange({ lettertype: v } as Partial<CampagneBlok>)} />
              <BoldItalicKnoppen vet={blok.vet !== false} cursief={blok.cursief}
                onVet={v => onChange({ vet: v } as Partial<CampagneBlok>)} onCursief={v => onChange({ cursief: v } as Partial<CampagneBlok>)} />
              <UitlijningKnoppen waarde={blok.uitlijning} onChange={u => onChange({ uitlijning: u } as Partial<CampagneBlok>)} />
            </StijlRij>
          </>
        )}

        {blok.type === "qr" && (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px] space-y-2">
                <input value={blok.waarde} onChange={e => onChange({ waarde: e.target.value } as Partial<CampagneBlok>)}
                  placeholder="URL of tekst om te coderen" className={veld} />
                <input value={blok.bijschrift} onChange={e => onChange({ bijschrift: e.target.value } as Partial<CampagneBlok>)}
                  placeholder="Bijschrift (optioneel)" className={veld} />
              </div>
              {qrDataUrl && <img src={qrDataUrl} alt="QR-code voorbeeld" className="rounded border border-gray-100" style={{ width: (blok.grootte ?? 160) / 2, height: (blok.grootte ?? 160) / 2 }} />}
            </div>
            <StijlRij>
              <label className="text-xs text-gray-400 flex items-center gap-1.5">
                Grootte
                <input type="range" min={80} max={240} step={10} value={blok.grootte ?? 160}
                  onChange={e => onChange({ grootte: Number(e.target.value) } as Partial<CampagneBlok>)} className="w-24" />
                <span className="w-10 text-right">{blok.grootte ?? 160}px</span>
              </label>
              <UitlijningKnoppen waarde={blok.uitlijning ?? "midden"} onChange={u => onChange({ uitlijning: u } as Partial<CampagneBlok>)} />
            </StijlRij>
            {blok.bijschrift && (
              <TekstStijlRij stijl={blok.bijschriftStijl} onChange={patch => onChange({ bijschriftStijl: { ...blok.bijschriftStijl, ...patch } } as Partial<CampagneBlok>)} />
            )}
          </>
        )}

        {blok.type === "reclame" && (
          <ReclameBlokVeld blok={blok} onChange={onChange} uploadBezig={uploadBezig} onUpload={onUpload} fileInputRef={fileInputRef} />
        )}

        {blok.type === "rij" && (
          <RijBlokVeld blok={blok} onChange={onChange} uploadBezigKolom={uploadBezigKolom}
            onKolomChange={onKolomChange} onKolomUpload={onKolomUpload} onWisselKanten={onWisselKanten} />
        )}

        {blok.type === "scheiding" && (
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-xs text-gray-400 flex items-center gap-1.5">
              Hoogte
              <input type="range" min={4} max={80} step={4} value={blok.hoogte ?? 24}
                onChange={e => onChange({ hoogte: Number(e.target.value) } as Partial<CampagneBlok>)} className="w-28" />
              <span className="w-10 text-right">{blok.hoogte ?? 24}px</span>
            </label>
            <label className="text-xs text-gray-400 flex items-center gap-1.5">
              <input type="checkbox" checked={!!blok.lijn} onChange={e => onChange({ lijn: e.target.checked } as Partial<CampagneBlok>)} />
              Lijntje tonen
            </label>
            <label className={`text-xs flex items-center gap-1.5 ${blok.lijn ? "text-gray-400" : "text-gray-300"}`}>
              Dikte
              <input type="range" min={1} max={8} step={1} value={blok.lijndikte ?? 1} disabled={!blok.lijn}
                onChange={e => onChange({ lijndikte: Number(e.target.value) } as Partial<CampagneBlok>)} className="w-20 disabled:opacity-50" />
              <span className="w-8 text-right">{blok.lijndikte ?? 1}px</span>
            </label>
            <input type="color" value={blok.lijnkleur || "#D9EBC0"} disabled={!blok.lijn}
              onChange={e => onChange({ lijnkleur: e.target.value } as Partial<CampagneBlok>)}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer disabled:opacity-50" title="Lijnkleur" />
          </div>
        )}

        {blok.type === "socials" && (
          <SocialsBlokVeld blok={blok} onChange={onChange} />
        )}
      </fieldset>
    </div>
  );
}

const stijlVeld = "border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-[#1A2E0D] focus:outline-none focus:ring-2 focus:ring-[#8CC63F] bg-white";

function htmlAlign(u: Uitlijning | undefined): "left" | "center" | "right" {
  return u === "midden" ? "center" : u === "rechts" ? "right" : "left";
}

function StijlRij({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2.5 flex-wrap pt-1 border-t border-gray-50" onClick={e => e.stopPropagation()}>{children}</div>;
}

function UitlijningKnoppen({ waarde, onChange }: { waarde: Uitlijning | undefined; onChange: (u: Uitlijning) => void }) {
  const opties: { waarde: Uitlijning; Icoon: typeof AlignLeft }[] = [
    { waarde: "links", Icoon: AlignLeft },
    { waarde: "midden", Icoon: AlignCenter },
    { waarde: "rechts", Icoon: AlignRight },
  ];
  return (
    <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5">
      {opties.map(o => (
        <button key={o.waarde} type="button" onClick={() => onChange(o.waarde)}
          className={`p-1.5 rounded-md ${(waarde ?? "links") === o.waarde ? "bg-white shadow-sm text-[#3D6B1A]" : "text-gray-400 hover:text-gray-600"}`}>
          <o.Icoon size={13} />
        </button>
      ))}
    </div>
  );
}

function LettertypeSelect({ waarde, onChange }: { waarde: string | undefined; onChange: (v: string) => void }) {
  return (
    <select value={waarde || LETTERTYPEN[0].waarde} onChange={e => onChange(e.target.value)} className={stijlVeld} title="Lettertype">
      {LETTERTYPEN.map(l => <option key={l.waarde} value={l.waarde}>{l.label}</option>)}
    </select>
  );
}

// Rijke-tekst-editor (contentEditable) voor het tekstblok: hiermee kan je
// een los stukje tekst selecteren en alleen dát vet/cursief maken i.p.v. het
// hele blok. Ongecontroleerd element (zoals een textarea-vervanger hoort te
// zijn) — React zet de inhoud alleen bij het laden/wisselen van blok, niet
// bij elke toetsaanslag, anders springt de cursor steeds naar het begin.
function RijkeTekstEditor({ html, onChange, placeholder, style, className }: {
  html: string; onChange: (html: string) => void; placeholder: string; style: React.CSSProperties; className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const laatsteHtml = useRef<string>("");

  useEffect(() => {
    if (!ref.current) return;
    if (html !== laatsteHtml.current && document.activeElement !== ref.current) {
      ref.current.innerHTML = sanitizeRijkeTekst(html);
      laatsteHtml.current = html;
    }
  }, [html]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={() => {
        if (!ref.current) return;
        const nieuw = ref.current.innerHTML;
        laatsteHtml.current = nieuw;
        onChange(nieuw);
      }}
      onFocus={() => { try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch {} }}
      data-placeholder={placeholder}
      style={style}
      className={className ?? "rijke-tekst-editor w-full min-h-[90px] border-none focus:outline-none bg-transparent"}
    />
  );
}

// Werkt op de huidige tekstselectie van de browser (niet op een specifiek
// blok): zolang de knoppen onMouseDown preventDefault doen, verliest de
// contentEditable zijn selectie niet, dus execCommand werkt altijd op de
// tekst die de gebruiker net in dít blok had geselecteerd.
function RijkeTekstBoldItalicKnoppen() {
  const [, forceerUpdate] = useState(0);

  const commandoActief = (commando: "bold" | "italic") => {
    try { return document.queryCommandState(commando); } catch { return false; }
  };

  const toepassen = (commando: "bold" | "italic") => (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand(commando);
    forceerUpdate(n => n + 1);
    document.activeElement?.dispatchEvent(new Event("input", { bubbles: true }));
  };

  return (
    <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5" onMouseDown={e => e.preventDefault()}>
      <button type="button" onClick={toepassen("bold")} title="Vet (selecteer eerst tekst)"
        className={`p-1.5 rounded-md ${commandoActief("bold") ? "bg-white shadow-sm text-[#3D6B1A]" : "text-gray-400 hover:text-gray-600"}`}>
        <Bold size={13} />
      </button>
      <button type="button" onClick={toepassen("italic")} title="Cursief (selecteer eerst tekst)"
        className={`p-1.5 rounded-md ${commandoActief("italic") ? "bg-white shadow-sm text-[#3D6B1A]" : "text-gray-400 hover:text-gray-600"}`}>
        <Italic size={13} />
      </button>
    </div>
  );
}

function BoldItalicKnoppen({ vet, cursief, onVet, onCursief }: {
  vet: boolean | undefined; cursief: boolean | undefined; onVet: (v: boolean) => void; onCursief: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5">
      <button type="button" onClick={() => onVet(!vet)} title="Vet"
        className={`p-1.5 rounded-md ${vet ? "bg-white shadow-sm text-[#3D6B1A]" : "text-gray-400 hover:text-gray-600"}`}>
        <Bold size={13} />
      </button>
      <button type="button" onClick={() => onCursief(!cursief)} title="Cursief"
        className={`p-1.5 rounded-md ${cursief ? "bg-white shadow-sm text-[#3D6B1A]" : "text-gray-400 hover:text-gray-600"}`}>
        <Italic size={13} />
      </button>
    </div>
  );
}

function RegelafstandVeld({ waarde, onChange }: { waarde: number | undefined; onChange: (v: number) => void }) {
  return (
    <label className="text-xs text-gray-400 flex items-center gap-1.5">
      Regelafstand
      <input type="range" min={1} max={2.4} step={0.1} value={waarde ?? 1.5} onChange={e => onChange(Number(e.target.value))} className="w-20" />
      <span className="w-8 text-right">{(waarde ?? 1.5).toFixed(1)}</span>
    </label>
  );
}

// Volledige stijl-rij (lettertype, kleur, vet/cursief, evt. regelafstand) voor
// tekstvelden die de gedeelde TekstStijlVelden gebruiken. rijkeTekst=true voor
// velden met de RijkeTekstEditor: dan werken vet/cursief op de tekstselectie
// i.p.v. op het hele veld (zie RijkeTekstBoldItalicKnoppen).
function TekstStijlRij({ stijl, onChange, toonRegelafstand, rijkeTekst }: {
  stijl: TekstStijlVelden | undefined;
  onChange: (patch: Partial<TekstStijlVelden>) => void;
  toonRegelafstand?: boolean;
  rijkeTekst?: boolean;
}) {
  return (
    <StijlRij>
      <LettertypeSelect waarde={stijl?.lettertype} onChange={v => onChange({ lettertype: v })} />
      <input type="color" value={stijl?.kleur || "#1A2E0D"} onChange={e => onChange({ kleur: e.target.value })}
        className="w-8 h-8 rounded border border-gray-200 cursor-pointer" title="Tekstkleur" />
      {rijkeTekst ? (
        <RijkeTekstBoldItalicKnoppen />
      ) : (
        <BoldItalicKnoppen vet={stijl?.vet} cursief={stijl?.cursief} onVet={v => onChange({ vet: v })} onCursief={v => onChange({ cursief: v })} />
      )}
      {toonRegelafstand && <RegelafstandVeld waarde={stijl?.regelafstand} onChange={v => onChange({ regelafstand: v })} />}
    </StijlRij>
  );
}

// Herbruikbare "kop toevoegen"-knop + kopveld, voor elk blok/kolom met een
// optioneel kop-veld (kop als string | undefined — undefined = nog geen kop).
function KopVeld({ kop, kopStijl, onChange }: {
  kop: string | undefined;
  kopStijl: Omit<TekstStijlVelden, "regelafstand"> | undefined;
  onChange: (patch: { kop?: string; kopStijl?: Omit<TekstStijlVelden, "regelafstand"> }) => void;
}) {
  if (kop === undefined) {
    return (
      <button type="button" onClick={() => onChange({ kop: "" })}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-[#3D6B1A]">
        <Heading size={13} /> Kop toevoegen
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={kop}
          onChange={e => onChange({ kop: e.target.value })}
          placeholder="Kop..."
          style={{
            fontFamily: kopStijl?.lettertype || LETTERTYPEN[0].waarde,
            color: kopStijl?.kleur || "#1A2E0D",
            fontWeight: kopStijl?.vet === false ? 400 : 700,
            fontStyle: kopStijl?.cursief ? "italic" : "normal",
            fontSize: "20px",
          }}
          className="w-full border-none focus:outline-none bg-transparent"
        />
        <button type="button" onClick={() => onChange({ kop: undefined, kopStijl: undefined })}
          className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0" title="Kop verwijderen">
          <X size={14} />
        </button>
      </div>
      <TekstStijlRij stijl={kopStijl} onChange={patch => onChange({ kopStijl: { ...kopStijl, ...patch } })} />
    </div>
  );
}

function ReclameBlokVeld({ blok, onChange, uploadBezig, onUpload, fileInputRef }: {
  blok: Extract<CampagneBlok, { type: "reclame" }>;
  onChange: (patch: Partial<CampagneBlok>) => void;
  uploadBezig: boolean;
  onUpload: (bestand: File) => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Advertentie</div>
      <div className="flex items-center gap-3">
        {blok.pad ? (
          <img src={afbeeldingUrl(blok.pad)} alt={blok.titel} className="w-20 h-20 object-cover rounded-lg border border-gray-100" />
        ) : (
          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
            <Megaphone size={20} />
          </div>
        )}
        <div className="space-y-2 flex-1 min-w-[160px]">
          <input ref={el => { inputRef.current = el; fileInputRef(el); }} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploadBezig}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-[#374151] hover:bg-gray-50 disabled:opacity-50">
            <Upload size={13} /> {uploadBezig ? "Uploaden…" : blok.pad ? "Vervangen" : "Afbeelding kiezen"}
          </button>
        </div>
      </div>
      <input value={blok.titel} onChange={e => onChange({ titel: e.target.value } as Partial<CampagneBlok>)} placeholder="Titel"
        style={{
          fontFamily: blok.titelStijl?.lettertype || LETTERTYPEN[0].waarde, color: blok.titelStijl?.kleur || "#1A2E0D",
          fontWeight: blok.titelStijl?.vet === false ? 400 : 700, fontStyle: blok.titelStijl?.cursief ? "italic" : "normal",
        }}
        className={veld} />
      <TekstStijlRij stijl={blok.titelStijl} onChange={patch => onChange({ titelStijl: { ...blok.titelStijl, ...patch } } as Partial<CampagneBlok>)} />
      <RijkeTekstEditor
        html={blok.tekst}
        onChange={tekst => onChange({ tekst } as Partial<CampagneBlok>)}
        placeholder="Korte tekst"
        className={`rijke-tekst-editor ${veld} min-h-[52px]`}
        style={{
          fontFamily: blok.tekstStijl?.lettertype || LETTERTYPEN[0].waarde, color: blok.tekstStijl?.kleur || "#5B7A44",
          fontWeight: blok.tekstStijl?.vet ? 700 : 400, fontStyle: blok.tekstStijl?.cursief ? "italic" : "normal",
          lineHeight: blok.tekstStijl?.regelafstand ?? 1.4,
        }}
      />
      <input value={blok.link} onChange={e => onChange({ link: e.target.value } as Partial<CampagneBlok>)} placeholder="Link (https://...)" className={veld} />
      <TekstStijlRij stijl={blok.tekstStijl} onChange={patch => onChange({ tekstStijl: { ...blok.tekstStijl, ...patch } } as Partial<CampagneBlok>)} toonRegelafstand rijkeTekst />
    </div>
  );
}

const kolomVeld = "w-full border border-gray-200 rounded-md px-2 py-1 text-xs text-[#1A2E0D] bg-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F]";

const KNOP_ONDER_STANDAARD: KnopInhoud = { label: "Lees verder", url: "" };

// Optionele knop onder tekst of een afbeelding binnen één kant van een
// combinatieblok — bv. een "Lees verder"-knop onder een (ingekort) verhaal.
function KnopOnderVeld({ knopOnder, onChange }: {
  knopOnder: KnopInhoud | undefined;
  onChange: (knopOnder: KnopInhoud | undefined) => void;
}) {
  if (!knopOnder) {
    return (
      <button type="button" onClick={() => onChange({ ...KNOP_ONDER_STANDAARD })}
        className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border border-gray-200 text-[#374151] hover:bg-gray-50">
        <Link2 size={11} /> Knop toevoegen
      </button>
    );
  }
  return (
    <div className="border-t border-gray-100 pt-1.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <input value={knopOnder.label} onChange={e => onChange({ ...knopOnder, label: e.target.value })}
          placeholder="Knoptekst (bv. Lees verder)" className={kolomVeld} />
        <button type="button" onClick={() => onChange(undefined)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
      <input value={knopOnder.url} onChange={e => onChange({ ...knopOnder, url: e.target.value })}
        placeholder="https://... (link naar volledig verhaal)" className={kolomVeld} />
      <div className="flex items-center gap-2">
        <input type="color" value={knopOnder.achtergrondkleur || "#3D6B1A"} onChange={e => onChange({ ...knopOnder, achtergrondkleur: e.target.value })}
          className="w-7 h-7 rounded border border-gray-200 cursor-pointer" title="Achtergrond" />
        <input type="color" value={knopOnder.tekstkleur || "#ffffff"} onChange={e => onChange({ ...knopOnder, tekstkleur: e.target.value })}
          className="w-7 h-7 rounded border border-gray-200 cursor-pointer" title="Tekstkleur" />
      </div>
    </div>
  );
}

function KolomEditor({ kant, kolom, uploadBezig, onChange, onUpload }: {
  kant: "links" | "rechts";
  kolom: Kolom;
  uploadBezig: boolean;
  onChange: (patch: Record<string, unknown>) => void;
  onUpload: (bestand: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="border border-gray-100 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{kant === "links" ? "Eerste" : "Tweede"}</span>
        <select value={kolom.soort} onChange={e => onChange(nieuweKolomInhoud(e.target.value as Kolom["soort"]) as unknown as Record<string, unknown>)}
          className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white text-[#374151]">
          <option value="tekst">Tekst</option>
          <option value="afbeelding">Afbeelding</option>
          <option value="knop">Knop / link</option>
          <option value="reclame">Reclame</option>
        </select>
      </div>

      {kolom.soort === "tekst" && (
        <>
          <KopVeld kop={kolom.kop} kopStijl={kolom.kopStijl} onChange={patch => onChange(patch)} />
          <RijkeTekstEditor
            html={kolom.tekst}
            onChange={tekst => onChange({ tekst })}
            placeholder="Tekst... (selecteer tekst om vet/cursief te maken)"
            className="rijke-tekst-editor w-full min-h-[70px] border-none focus:outline-none text-sm bg-transparent"
            style={{
              fontFamily: kolom.lettertype || LETTERTYPEN[0].waarde, color: kolom.kleur || "#1A2E0D",
              fontWeight: kolom.vet ? 700 : 400, fontStyle: kolom.cursief ? "italic" : "normal", lineHeight: kolom.regelafstand ?? 1.5,
            }}
          />
          <TekstStijlRij stijl={kolom} onChange={patch => onChange(patch)} toonRegelafstand rijkeTekst />
          <KnopOnderVeld knopOnder={kolom.knopOnder} onChange={knopOnder => onChange({ knopOnder })} />
        </>
      )}

      {kolom.soort === "afbeelding" && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {kolom.pad ? (
              <img src={afbeeldingUrl(kolom.pad)} alt={kolom.bijschrift} className="w-12 h-12 object-cover rounded-md border border-gray-100" />
            ) : (
              <div className="w-12 h-12 rounded-md border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                <ImageIcon size={14} />
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploadBezig}
              className="text-[11px] font-medium px-2 py-1 rounded-md border border-gray-200 text-[#374151] hover:bg-gray-50 disabled:opacity-50">
              {uploadBezig ? "Bezig…" : "Kiezen"}
            </button>
          </div>
          <input value={kolom.bijschrift} onChange={e => onChange({ bijschrift: e.target.value })} placeholder="Bijschrift" className={kolomVeld} />
          {kolom.bijschrift && (
            <TekstStijlRij stijl={kolom.bijschriftStijl} onChange={patch => onChange({ bijschriftStijl: { ...kolom.bijschriftStijl, ...patch } })} />
          )}
          <input value={kolom.link} onChange={e => onChange({ link: e.target.value })} placeholder="Link" className={kolomVeld} />
          <KnopOnderVeld knopOnder={kolom.knopOnder} onChange={knopOnder => onChange({ knopOnder })} />
        </div>
      )}

      {kolom.soort === "knop" && (
        <div className="space-y-1.5">
          <input value={kolom.label} onChange={e => onChange({ label: e.target.value })} placeholder="Knoptekst" className={kolomVeld} />
          <input value={kolom.url} onChange={e => onChange({ url: e.target.value })} placeholder="https://..." className={kolomVeld} />
          <div className="flex items-center gap-2">
            <input type="color" value={kolom.achtergrondkleur || "#3D6B1A"} onChange={e => onChange({ achtergrondkleur: e.target.value })}
              className="w-7 h-7 rounded border border-gray-200 cursor-pointer" title="Achtergrond" />
            <input type="color" value={kolom.tekstkleur || "#ffffff"} onChange={e => onChange({ tekstkleur: e.target.value })}
              className="w-7 h-7 rounded border border-gray-200 cursor-pointer" title="Tekstkleur" />
          </div>
        </div>
      )}

      {kolom.soort === "reclame" && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {kolom.pad ? (
              <img src={afbeeldingUrl(kolom.pad)} alt={kolom.titel} className="w-12 h-12 object-cover rounded-md border border-gray-100" />
            ) : (
              <div className="w-12 h-12 rounded-md border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                <Megaphone size={14} />
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploadBezig}
              className="text-[11px] font-medium px-2 py-1 rounded-md border border-gray-200 text-[#374151] hover:bg-gray-50 disabled:opacity-50">
              {uploadBezig ? "Bezig…" : "Kiezen"}
            </button>
          </div>
          <input value={kolom.titel} onChange={e => onChange({ titel: e.target.value })} placeholder="Titel"
            style={{
              fontFamily: kolom.titelStijl?.lettertype || LETTERTYPEN[0].waarde, color: kolom.titelStijl?.kleur || "#1A2E0D",
              fontWeight: kolom.titelStijl?.vet === false ? 400 : 700, fontStyle: kolom.titelStijl?.cursief ? "italic" : "normal",
            }}
            className={kolomVeld} />
          <TekstStijlRij stijl={kolom.titelStijl} onChange={patch => onChange({ titelStijl: { ...kolom.titelStijl, ...patch } })} />
          <RijkeTekstEditor
            html={kolom.tekst}
            onChange={tekst => onChange({ tekst })}
            placeholder="Korte tekst"
            className={`rijke-tekst-editor ${kolomVeld} min-h-[44px]`}
            style={{
              fontFamily: kolom.tekstStijl?.lettertype || LETTERTYPEN[0].waarde, color: kolom.tekstStijl?.kleur || "#5B7A44",
              fontWeight: kolom.tekstStijl?.vet ? 700 : 400, fontStyle: kolom.tekstStijl?.cursief ? "italic" : "normal",
              lineHeight: kolom.tekstStijl?.regelafstand ?? 1.4,
            }}
          />
          <input value={kolom.link} onChange={e => onChange({ link: e.target.value })} placeholder="Link" className={kolomVeld} />
          <TekstStijlRij stijl={kolom.tekstStijl} onChange={patch => onChange({ tekstStijl: { ...kolom.tekstStijl, ...patch } })} toonRegelafstand rijkeTekst />
        </div>
      )}
    </div>
  );
}

function RijBlokVeld({ blok, onChange, uploadBezigKolom, onKolomChange, onKolomUpload, onWisselKanten }: {
  blok: Extract<CampagneBlok, { type: "rij" }>;
  onChange: (patch: Partial<CampagneBlok>) => void;
  uploadBezigKolom: (kant: "links" | "rechts") => boolean;
  onKolomChange: (kant: "links" | "rechts", patch: Record<string, unknown>) => void;
  onKolomUpload: (kant: "links" | "rechts", bestand: File) => void;
  onWisselKanten: () => void;
}) {
  const horizontaal = (blok.richting ?? "horizontaal") === "horizontaal";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5">
          <button type="button" onClick={() => onChange({ richting: "horizontaal" } as Partial<CampagneBlok>)} title="Naast elkaar"
            className={`p-1.5 rounded-md ${horizontaal ? "bg-white shadow-sm text-[#3D6B1A]" : "text-gray-400 hover:text-gray-600"}`}>
            <Columns2 size={13} />
          </button>
          <button type="button" onClick={() => onChange({ richting: "verticaal" } as Partial<CampagneBlok>)} title="Onder elkaar"
            className={`p-1.5 rounded-md ${!horizontaal ? "bg-white shadow-sm text-[#3D6B1A]" : "text-gray-400 hover:text-gray-600"}`}>
            <Rows2 size={13} />
          </button>
        </div>
        {horizontaal && (
          <label className="text-xs text-gray-400 flex items-center gap-1.5">
            Breedte eerste
            <input type="range" min={20} max={80} step={5} value={blok.breedteEerste ?? 50}
              onChange={e => onChange({ breedteEerste: Number(e.target.value) } as Partial<CampagneBlok>)} className="w-24" />
            <span className="w-9 text-right">{blok.breedteEerste ?? 50}%</span>
          </label>
        )}
        <button type="button" onClick={onWisselKanten}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-[#374151] hover:bg-gray-50">
          <ArrowLeftRight size={12} /> {horizontaal ? "Wissel links/rechts" : "Wissel volgorde"}
        </button>
      </div>
      <div className={horizontaal ? "grid grid-cols-2 gap-3" : "space-y-3"}>
        <KolomEditor kant="links" kolom={blok.links} uploadBezig={uploadBezigKolom("links")}
          onChange={patch => onKolomChange("links", patch)} onUpload={bestand => onKolomUpload("links", bestand)} />
        <KolomEditor kant="rechts" kolom={blok.rechts} uploadBezig={uploadBezigKolom("rechts")}
          onChange={patch => onKolomChange("rechts", patch)} onUpload={bestand => onKolomUpload("rechts", bestand)} />
      </div>
    </div>
  );
}

function SocialsBlokVeld({ blok, onChange }: {
  blok: Extract<CampagneBlok, { type: "socials" }>;
  onChange: (patch: Partial<CampagneBlok>) => void;
}) {
  function updateLink(index: number, patch: Partial<{ platform: SocialPlatform; url: string }>) {
    const links = blok.links.map((l, i) => i === index ? { ...l, ...patch } : l);
    onChange({ links } as Partial<CampagneBlok>);
  }
  function verwijderLink(index: number) {
    onChange({ links: blok.links.filter((_, i) => i !== index) } as Partial<CampagneBlok>);
  }
  function voegLinkToe() {
    const gebruikt = new Set(blok.links.map(l => l.platform));
    const volgende = SOCIAL_PLATFORMS.find(p => !gebruikt.has(p.waarde)) ?? SOCIAL_PLATFORMS[0];
    onChange({ links: [...blok.links, { platform: volgende.waarde, url: "" }] } as Partial<CampagneBlok>);
  }

  return (
    <div className="space-y-2">
      {blok.links.map((l, i) => {
        const p = SOCIAL_PLATFORMS.find(p => p.waarde === l.platform);
        return (
          <div key={i} className="flex items-center gap-2">
            {p && (
              <svg viewBox="0 0 36 36" width="26" height="26" className="flex-shrink-0">
                <circle cx="18" cy="18" r="18" fill={p.kleur} />
                <g transform="translate(7.2,7.2) scale(0.9)"><path d={p.pad} fill="#ffffff" /></g>
              </svg>
            )}
            <select value={l.platform} onChange={e => updateLink(i, { platform: e.target.value as SocialPlatform })}
              className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white w-28 flex-shrink-0 text-[#374151]">
              {SOCIAL_PLATFORMS.map(p => <option key={p.waarde} value={p.waarde}>{p.label}</option>)}
            </select>
            <input value={l.url} onChange={e => updateLink(i, { url: e.target.value })} placeholder="https://..." className={veld} />
            <button type="button" onClick={() => verwijderLink(i)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
              <X size={15} />
            </button>
          </div>
        );
      })}
      {blok.links.length < SOCIAL_PLATFORMS.length && (
        <button type="button" onClick={voegLinkToe}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-[#374151] hover:bg-gray-50">
          + Platform toevoegen
        </button>
      )}
      <StijlRij>
        <UitlijningKnoppen waarde={blok.uitlijning ?? "midden"} onChange={u => onChange({ uitlijning: u } as Partial<CampagneBlok>)} />
      </StijlRij>
    </div>
  );
}

function AfbeeldingBlokVeld({ blok, onChange, uploadBezig, onUpload, fileInputRef }: {
  blok: Extract<CampagneBlok, { type: "afbeelding" }>;
  onChange: (patch: Partial<CampagneBlok>) => void;
  uploadBezig: boolean;
  onUpload: (bestand: File) => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {blok.pad ? (
          <img src={afbeeldingUrl(blok.pad)} alt={blok.bijschrift} className="w-24 h-24 object-cover rounded-lg border border-gray-100" />
        ) : (
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
            <ImageIcon size={22} />
          </div>
        )}
        <div className="space-y-2 flex-1 min-w-[160px]">
          <input
            ref={el => { inputRef.current = el; fileInputRef(el); }}
            type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
          />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploadBezig}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-[#374151] hover:bg-gray-50 disabled:opacity-50">
            <Upload size={13} /> {uploadBezig ? "Uploaden…" : blok.pad ? "Vervangen" : "Foto kiezen"}
          </button>
          <input value={blok.bijschrift} onChange={e => onChange({ bijschrift: e.target.value } as Partial<CampagneBlok>)}
            placeholder="Bijschrift (optioneel)" className={veld} />
          <input value={blok.link} onChange={e => onChange({ link: e.target.value } as Partial<CampagneBlok>)}
            placeholder="Link bij klikken (optioneel)" className={veld} />
        </div>
      </div>
      {blok.bijschrift && (
        <TekstStijlRij stijl={blok.bijschriftStijl} onChange={patch => onChange({ bijschriftStijl: { ...blok.bijschriftStijl, ...patch } } as Partial<CampagneBlok>)} />
      )}
    </div>
  );
}
