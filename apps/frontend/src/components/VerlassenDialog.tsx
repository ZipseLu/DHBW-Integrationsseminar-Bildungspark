import { Modal } from './Modal'

/** What the KI-Erstellung reports to the app shell (FE-27) */
export type KiStand = { ungespeichert: number; laeuft: boolean }

export const KEIN_KI_STAND: KiStand = { ungespeichert: 0, laeuft: false }

export const hatUngesichertes = (stand: KiStand) => stand.laeuft || stand.ungespeichert > 0

/** Warning text for the confirmation dialog */
export function verlustText(stand: KiStand): string {
  if (stand.laeuft) return 'Die KI erstellt gerade noch Varianten. Wenn du die Seite wechselst, gehen alle Varianten dieser Runde verloren.'
  const anzahl = stand.ungespeichert === 1 ? '1 Variante ist' : `${stand.ungespeichert} Varianten sind`
  return `${anzahl} noch nicht gespeichert. Wenn du die Seite wechselst, ${stand.ungespeichert === 1 ? 'geht sie' : 'gehen sie'} verloren.`
}

type Props = {
  stand: KiStand
  onBleiben: () => void
  onVerlassen: () => void
}

/** Asks before leaving the KI-Erstellung with unsaved variants (FE-27) */
export function VerlassenDialog({ stand, onBleiben, onVerlassen }: Props) {
  return (
    <Modal title="Nicht gespeicherte Varianten" onClose={onBleiben}>
      <div className="px-6 py-5 flex flex-col gap-4">
        <p className="text-sm">{verlustText(stand)}</p>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Mit „💾 Alle zur Bibliothek hinzufügen“ landen die Varianten unter „Arbeitsblätter“.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            autoFocus
            onClick={onBleiben}
            className="flex-1 py-2.5 rounded font-medium text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Zurück zu den Varianten
          </button>
          <button type="button" onClick={onVerlassen} className="px-4 py-2.5 rounded text-sm hover:opacity-70 transition-opacity" style={{ border: '1px solid var(--border)' }}>
            Trotzdem wechseln
          </button>
        </div>
      </div>
    </Modal>
  )
}
