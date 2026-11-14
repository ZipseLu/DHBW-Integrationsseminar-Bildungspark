/**
 * File types of uploaded worksheets (Trello "Upload von Arbeitsblättern").
 *
 * The type is taken from the file content ("magic bytes"), not from the name or the
 * Content-Type sent by the browser – both can be wrong or forged. The file extension
 * must match the detected type, so "bild.png" containing a PDF is rejected.
 */

export const MAX_DATEI_BYTES = 20 * 1024 * 1024

/** Allowed types: extension(s), MIME type for the download, label for messages */
export const DATEITYPEN = {
  pdf: { endungen: ['.pdf'], mime: 'application/pdf', label: 'PDF' },
  docx: { endungen: ['.docx'], mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word (.docx)' },
  doc: { endungen: ['.doc'], mime: 'application/msword', label: 'Word (.doc)' },
  txt: { endungen: ['.txt'], mime: 'text/plain; charset=utf-8', label: 'Text' },
  md: { endungen: ['.md'], mime: 'text/markdown; charset=utf-8', label: 'Markdown' },
  png: { endungen: ['.png'], mime: 'image/png', label: 'PNG-Bild' },
  jpg: { endungen: ['.jpg', '.jpeg'], mime: 'image/jpeg', label: 'JPEG-Bild' },
}

export const ERLAUBTE_ENDUNGEN = Object.values(DATEITYPEN).flatMap((t) => t.endungen)

/** Error with a machine-readable code (route -> 415 or 400) */
export class DateitypError extends Error {
  constructor(message, code, status = 415) {
    super(message)
    this.name = 'DateitypError'
    this.code = code
    this.status = status
  }
}

export function endungVon(dateiname) {
  const punkt = dateiname.lastIndexOf('.')
  return punkt > 0 ? dateiname.slice(punkt).toLowerCase() : ''
}

const beginntMit = (buffer, bytes) => bytes.every((byte, i) => buffer[i] === byte)

/** Type from the first bytes, or null if unknown */
export function typAusInhalt(buffer) {
  if (beginntMit(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf' // %PDF-
  if (beginntMit(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (beginntMit(buffer, [0xff, 0xd8, 0xff])) return 'jpg'
  if (beginntMit(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'doc' // OLE compound file
  // Word files are ZIP archives that contain word/document.xml
  if (beginntMit(buffer, [0x50, 0x4b, 0x03, 0x04]) && buffer.includes('word/document.xml')) return 'docx'
  return null
}

/** Text files have no signature: valid UTF-8 without control characters (except tab/newline) */
export function istText(buffer) {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  if (text.includes('�')) return false
  return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)
}

/**
 * Determines the type of an upload and checks it against the file name.
 * @returns {keyof typeof DATEITYPEN}
 * @throws {DateitypError}
 */
export function bestimmeDateityp(dateiname, buffer) {
  const endung = endungVon(dateiname)
  const erwartet = Object.entries(DATEITYPEN).find(([, t]) => t.endungen.includes(endung))?.[0]
  if (!erwartet) {
    throw new DateitypError(
      `Dateityp „${endung || 'ohne Endung'}“ wird nicht unterstützt. Erlaubt sind PDF, Word, Text oder Bild (${ERLAUBTE_ENDUNGEN.join(', ')}).`,
      'dateityp_nicht_erlaubt',
    )
  }
  const erkannt = erwartet === 'txt' || erwartet === 'md' ? (istText(buffer) ? erwartet : null) : typAusInhalt(buffer)
  if (erkannt !== erwartet) {
    throw new DateitypError(`Der Inhalt der Datei passt nicht zur Endung „${endung}“ – ist die Datei beschädigt oder umbenannt?`, 'inhalt_passt_nicht')
  }
  return erwartet
}
