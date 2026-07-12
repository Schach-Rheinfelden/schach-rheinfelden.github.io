# ♟️ Schachverein Rheinfelden – Dokumentation & CSV-Handbuch

Dieses Handbuch erklärt ausführlich die Architektur der Website sowie alle Formatierungen, Typen und Besonderheiten für die Eingabe in die CSV-Dateien im Ordner `/data/`.

---

## 📋 Inhaltsverzeichnis
1. [Allgemeine Regeln für CSV-Dateien](#1-allgemeine-regeln-für-csv-dateien)
2. [Texte & Neuigkeiten schreiben (Ohne HTML-Tags)](#2-texte--neuigkeiten-schreiben-ohne-html-tags)
3. [Mediathek (`data/media.csv`) – Typen & Icons](#3-mediathek-datamediacsv--typen--icons)
4. [Hero-Banner & Hintergrund-Slideshow (`data/info.csv`)](#4-hero-banner--hintergrund-slideshow-datainfocsv)
5. [Bildergalerien mit Beschriftungen](#5-bildergalerien-mit-beschriftungen)
6. [Vereinsinfos, Footer & Copyright (`data/info.csv`)](#6-vereinsinfos-footer--copyright-datainfocsv)
7. [Neuigkeiten & Berichte (`data/news.csv`)](#7-neuigkeiten--berichte-datanewscsv)
8. [Termine & Kalender (`data/events.csv`)](#8-termine--kalender-dataeventscsv)
9. [Mannschaften & Spieler (`data/teams.csv` & `players.csv`)](#9-mannschaften--spieler-datateamscsv--playerscsv)
10. [Externe CSV-Quellen verknüpfen (`data/sources.csv`)](#10-externe-csv-quellen-verknüpfen-datasourcescsv)

---

## 1. Allgemeine Regeln für CSV-Dateien
* **Trennzeichen:** Das Semikolon (`;`) trennt die Spalten.
* **Leere Felder:** Wenn ein Feld leer bleiben soll, einfach nichts zwischen die Semikolons schreiben (`;;`).
* **Mehrzeilige Texte & Semikolons im Text:** Wenn ein Text Semikolons oder Zeilenumbrüche enthält, muss der gesamte Text in doppelte Anführungszeichen gesetzt werden (`"..."`).
* **Datumsangaben:** Du bist komplett flexibel – unterstützt werden `TT.MM.JJJJ` (`15.04.2026`), `TT.MM.JJ` (`15.04.26`), kompakte Zahlenreihen (`20260415` oder `260415`), ISO-Formate (`2026-04-15`) sowie ausgeschriebene Monats- und Jahresangaben (`April 2026` oder `2026`).

---

## 2. Texte & Neuigkeiten schreiben (Text oder HTML / WYSIWYG-Editoren)
Du hast zwei Möglichkeiten, Texte (für Neuigkeiten in `news.csv` oder Beschreibungen in `events.csv`) zu verfassen:

### Möglichkeit A: Einfacher Text (Ohne HTML-Kenntnisse)
Die Website formatiert deinen normalen Text automatisch:
* **Absätze:** Drücke einfach **zweimal Enter** (zwei Zeilenumbrüche), um einen neuen Absatz zu beginnen (`<p>`).
* **Einfache Zeilenumbrüche:** Ein einzelner Zeilenumbruch wird automatisch als Zeilenumbruch (`<br>`) dargestellt.
* **Links (URLs):** Internetadressen wie `https://www.schachbund.de` oder `www.lichess.org` im Text werden automatisch in klickbare Links umgewandelt!

### Möglichkeit B: WYSIWYG HTML-Editoren nutzen
Wenn du Texte aufwendig formatieren möchtest (z. B. fette Zwischenüberschriften, Listen, Tabellen oder farbige Markierungen), kannst du jeden beliebigen **WYSIWYG HTML-Editor** (z. B. Online HTML-Editoren, Word-to-HTML, TinyMCE) verwenden.
* Kopiere einfach den dort generierten HTML-Code und füge ihn direkt in die Spalte `content` ein.
* Die Website erkennt HTML-Code automatisch und stellt deine Formatierung exakt dar!
* *Hinweis bei CSV:* Wenn dein HTML-Code Semikolons (`;`) oder Anführungszeichen enthält, umschließe den gesamten HTML-Text in der CSV mit doppelten Anführungszeichen (`"..."`).


---

## 3. Mediathek (`data/media.csv`) – Typen & Icons
Spaltenstruktur:
```csv
id;title;date;category;type;color;url;description;thumbnail;author;emoji
```

### Unterstützte Typen in der Spalte `type`
Der eingetragene Typ bestimmt automatisch das Icon und was beim Klick passiert:

| Typ (`type`) | Icon | Verhalten beim Klick |
| :--- | :--- | :--- |
| `webseite`, `website`, `link`, `extern`, `tool` | 🌐 Webseite | Öffnet die Webseite direkt in einem **neuen Browser-Tab**. |
| `youtube` | ▶️ YouTube | Öffnet den YouTube-Player direkt im **Video-Modal** auf der Seite. |
| `vimeo` | 🟦 Vimeo | Öffnet den Vimeo-Player direkt im **Modal**. |
| `bild`, `image`, `foto` | 🖼️ Bild | Öffnet eine Großansicht (**Lightbox-Modal**) des Bildes. |
| `galerie`, `gallery`, `bilder` | 🖼️ Galerie | Öffnet ein Album-Modal mit allen Bildern zum Durchblättern. |
| `pdf`, `dokument`, `doc` | 📄 Dokument | Öffnet das PDF-Dokument in einem neuen Tab. |
| `taktik`, `puzzle`, `training` | ♟️ Taktik | Spezielles Badge für Schach-Taktiken und Trainingsseiten. |
| `lichess` | ♘ Lichess | Für Lichess-Studien oder Partien. |

---

## 4. Hero-Banner & Hintergrund-Slideshow (`data/info.csv`)
Das Feld `heroMedia` in `info.csv` steuert den großen Hintergrund ganz oben auf der Startseite:

* **Option A – Video:** Link zu Videodateien (`.mp4`, `.webm`, `.mov`, `.m4v`, `.ogg`) oder zu YouTube & Vimeo (automatische Vollbildabdeckung ohne schwarze Ränder auch auf dem Smartphone).
* **Option B – Einzelbild:** Link zu einer Bilddatei (z. B. `img/hero.jpg`).
* **Option C – Automatische Slideshow (Mehrere Bilder):**
  Trage einfach mehrere Bild-URLs getrennt durch ein Komma (`,`) ein:
  ```csv
  heroMedia;img/turnier1.jpg, img/turnier2.jpg, img/turnier3.jpg
  ```
  👉 Die Website wechselt automatisch **alle 5 Sekunden sanft überblendend** zum nächsten Bild!

---

## 5. Bildergalerien mit Beschriftungen
In der Mediathek (`media.csv`), bei Artikeln (`news.csv`) und bei Terminen (`events.csv`) können Fotoalben hinterlegt werden.

* Trenne die Bilder mit einem Doppel-Pipe-Symbol: `||`
* Hinter jeder Bild-URL kann optional mit einem einzelnen Pipe-Symbol (`|`) eine **Bildunterschrift** stehen.

**Beispiel:**
```
https://example.com/saal.jpg | Turniersaal vor Runde 1 || https://example.com/sieger.jpg | Siegerehrung 2026
```

---

## 6. Vereinsinfos, Footer & Copyright (`data/info.csv`)
Die Datei `info.csv` hat die Spalten `keyPath;value`.

Wichtige Schlüssel:
* `clubName` – Name des Vereins (`Schach Rheinfelden`)
* `slogan` – Untertitel
* `announcement` – Banner oben auf der Seite (*Intelligentes Verhalten:* Wenn ein Besucher das Banner über das `×`-Symbol schließt, bleibt es dauerhaft ausgeblendet. Erst wenn du in `info.csv` einen neuen Text für das Announcement veröffentlichst, erscheint das Banner automatisch wieder!)
* `footer.copyright` – Überschreibt den Copyright-Text im Footer (z. B. `© 2027 Schach Rheinfelden. Alle Rechte vorbehalten.`)

---

## 7. Neuigkeiten & Berichte (`data/news.csv`)
Spaltenstruktur (exakt passend zu `data/news.csv`):
```csv
id;date;category;title;author;color;image;content;gallery
```
* `id`: Eindeutige Nummer des Artikels (z. B. `1`, `2`).
* `date`: Datum des Artikels (z. B. `11.07.2026`).
* `category`: Kategorie-Badge (z. B. `Verein`, `Turnier`, `SMM`).
* `title`: Titel der Nachricht.
* `author`: Autor (z. B. `Vorstand`).
* `color`: Optionale Akzentfarbe für die Karte (z. B. `#d4af37` oder leer lassen für Standardgold).
* `image`: URL oder Pfad zum Hauptbild/Teaser-Bild.
* `content`: Vollständiger Text oder HTML-Code des Artikels (kann mit einem WYSIWYG HTML-Editor formatiert werden!).
* `gallery`: Optionale Bildergalerie (mit `||` getrennt).

---

## 8. Termine & Kalender (`data/events.csv`)
Spaltenstruktur (exakt passend zu `data/events.csv`):
```csv
id;date;endDate;time;endTime;category;color;title;author;location;locationUrl;image;gallery;content
```
* `id`: Eindeutige Nummer des Termins.
* `date`: Startdatum oder Zeitraum – unterstützt alle gängigen Formate: `DD.MM.YYYY` (`11.09.2026`), `DD.MM.YY` (`11.09.26`), kompaktes `YYYYMMDD` (`20260911`), kompaktes `YYMMDD` (`260911`), ISO `YYYY-MM-DD`, ausgeschriebene Monate (`Juni 2026`, `06.2026`), reine Jahre (`2026`) oder auch `?` / `TBD`.
* `endDate`: Optionales Enddatum (gleiche Datumsformate wie `date` unterstützt), ideal für mehrtägige Turniere wie das Rheinfelden Open (`13.09.2026`). Erscheint automatisch kompakt in der Datumsbox (z. B. `11.–13. SEP`).
* `time`: Startuhrzeit (z. B. `13:45`). Kann auch leer gelassen werden oder Texte wie `Ganztägig` enthalten.
* `endTime`: Optionale Enduhrzeit (z. B. `20:00`). Wenn du nicht weißt, wie lange ein Event dauert, lass diese Spalte einfach leer – es wird dann sauber nur die Startzeit angezeigt (`13:45 Uhr`).
* `category`: Kategorien kommagetrennt (z. B. `SMM, Rhy 1`).
* `color`: Optionale Akzentfarbe für die Terminkachel.
* `title`: Titel des Termins (z. B. `SMM 2026 - Runde 6`).
* `author`: Optionale Angabe zur Turnierleitung / Ansprechpartner.
* `location`: Ort des Termins (z. B. `Bioland, Tannwaldstrasse 44, 4600 Olten`).
* `locationUrl`: Link zu Google Maps / OpenStreetMap.
* `image`: Optionales Bild für den Termin.
* `gallery`: Optionale Fotogalerie zum Termin.
* `content`: Ausführliche Beschreibung, Ausschreibungsdetails, Zeitplan oder Links (kann als Text oder HTML eingetragen werden).
* *Hinweis:* Termine ab dem heutigen Tag erscheinen automatisch unter **Anstehende Termine**, vergangene Termine lassen sich unter **Vergangene Termine** ein- und ausblenden.


---

## 9. Mannschaften & Spieler (`data/teams.csv` & `players.csv`)
* Die `teamId` in `players.csv` verknüpft den Spieler mit der passenden Mannschaft in `teams.csv`.
* ELO, DWZ und Titel (`GM`, `IM`, `FM`) werden auf den Mannschaftsseiten elegant dargestellt.

---

## 10. Externe CSV-Quellen verknüpfen (`data/sources.csv`)
Möchtest du eine Datei extern hosten (z. B. über eine Online-URL), kannst du den Link in `data/sources.csv` eintragen:
```csv
filename;source
media.csv;https://example.com/meine-mediathek.csv
```
Bleibt `source` leer, wird die lokale CSV-Datei aus dem `/data/`-Ordner geladen.
