/**
 * Reads the text of an uploaded worksheet (Trello "Upload von Arbeitsblättern").
 *
 *   docx      paragraphs of word/document.xml (same ZIP reader as the Lehrplan import)
 *   txt, md   the file content (UTF-8, byte order mark removed)
 *   pdf, doc, images   no text – stored as files; the text can be added by hand
 *
 * No extra dependencies; PDF text or OCR would need a library and is out of scope.
 */
import { readZipEntry, textOf } from '../lehrplan/parser.js'

/** Longer texts are cut – the KI prompt only uses the beginning anyway */
export const MAX_TEXT_ZEICHEN = 100_000

export const LESBARE_TYPEN = ['docx', 'txt', 'md']

/** Line endings to \n, at most one empty line in a row, trimmed */
export function normalisiereText(text) {
  return text
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Text of a .docx file: one line per paragraph (also inside tables) */
export function docxText(buffer) {
  const xml = readZipEntry(buffer, 'word/document.xml').toString('utf8')
  const body = xml.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? xml
  // <w:p …/> is an empty paragraph; <w:pPr> etc. do not match because of the lookahead
  return [...body.matchAll(/<w:p(?=[\s>/])[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g)].map((m) => (m[1] ? textOf(m[1]) : '')).join('\n')
}

/**
 * @returns {{text: string|null, gekuerzt: boolean, hinweis: string|null}}
 *   text null = this type cannot be read; an unreadable docx gives a hint instead of an error,
 *   so the file is still stored
 */
export function leseText(dateityp, buffer) {
  if (!LESBARE_TYPEN.includes(dateityp)) {
    return { text: null, gekuerzt: false, hinweis: 'Aus PDF-, .doc- und Bilddateien wird kein Text gelesen – den Text bitte einfügen, wenn die KI das Blatt anpassen soll.' }
  }
  let roh
  try {
    roh = dateityp === 'docx' ? docxText(buffer) : buffer.toString('utf8')
  } catch {
    return { text: null, gekuerzt: false, hinweis: 'Der Text der Word-Datei konnte nicht gelesen werden – die Datei ist trotzdem gespeichert.' }
  }
  const text = normalisiereText(roh)
  if (!text) return { text: null, gekuerzt: false, hinweis: 'Die Datei enthält keinen lesbaren Text.' }
  const gekuerzt = text.length > MAX_TEXT_ZEICHEN
  return {
    text: gekuerzt ? text.slice(0, MAX_TEXT_ZEICHEN) : text,
    gekuerzt,
    hinweis: gekuerzt ? `Der Text war sehr lang und wurde nach ${MAX_TEXT_ZEICHEN.toLocaleString('de-DE')} Zeichen gekürzt.` : null,
  }
}
