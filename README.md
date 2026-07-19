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
11. [Stimmen aus der Community (`data/guestbook.csv`)](#11-stimmen-aus-der-community-dataguestbookcsv)

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
* `showTodayStatus` – Hauptschalter für die "Heute-Anzeige" (Today-Badge) in der Navigationsleiste oben (Erlaubte Werte: `ja` oder `nein`). Wenn auf `nein` gesetzt, wird die Anzeige ausgeblendet.
* `todayOverride` (oder `todayOverrideText`) – Optionale **globale manuelle Überschreibung** der Heute-Anzeige mit höchster Priorität. Trage hier z. B. `geschlossen wegen Vereinsausflug` (wird automatisch rot) oder `Spezialtraining ab 18:00 Uhr` (wird automatisch grün) ein.
* `todayOverrideStatus` (oder `todayOverrideColor`) – Setzt explizit die Farbe/den Status für den globalen Override (z. B. `red`, `green`, `closed`, `open`).
* `training.1.group` / `training.1.time` bis `training.n.group` / `training.n.time` – Dynamische Trainingszeiten (z. B. `training.1.time;Dienstags, 17:00 - 19:00 Uhr`). Aus diesen Uhrzeiten bedient sich die automatische Heute-Anzeige für den jeweiligen Wochentag.
* `training.1.country` bis `training.n.country` – **Länderzugehörigkeit der Trainingsgruppe** (`DE` oder `CH`). Wichtig für die automatische Erkennung von Ferien und Feiertagen (z. B. `CH` für das Schweizer Freizeitschach am Dienstag in der Reha, `DE` für die Trainings im Gambrinus).
* `training.1.overrideText` bis `training.n.overrideText` – **Gruppenspezifische Überschreibung** (z. B. wenn nur das Dienstagstraining krankheitsbedingt ausfällt, trage hier `Fällt heute aus` ein).
* `footer.copyright` – Überschreibt den Copyright-Text im Footer (z. B. `© 2027 Schach Rheinfelden. Alle Rechte vorbehalten.`)

---

## 7. Neuigkeiten & Berichte (`data/news.csv`)
Spaltenstruktur (exakt passend zu `data/news.csv`):
```csv
id;date;category;title;author;color;image;content;gallery;bildImModal
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
id;date;endDate;time;endTime;category;color;title;author;location;locationUrl;image;gallery;content;bildImModal
```
* `id`: Eindeutige Nummer des Termins.
* `date`: Startdatum oder Zeitraum – unterstützt alle gängigen Formate: `DD.MM.YYYY` (`11.09.2026`), `DD.MM.YY` (`11.09.26`), kompaktes `YYYYMMDD` (`20260911`), kompaktes `YYMMDD` (`260911`), ISO `YYYY-MM-DD`, ausgeschriebene Monate (`Juni 2026`, `06.2026`), reine Jahre (`2026`) oder auch `?` / `TBD`.
* `endDate`: Optionales Enddatum (gleiche Datumsformate wie `date` unterstützt), ideal für mehrtägige Turniere wie das Rheinfelden Open (`13.09.2026`). Erscheint automatisch kompakt in der Datumsbox (z. B. `11.–13. SEP`).
* `time`: Startuhrzeit (z. B. `13:45`). Kann auch leer gelassen werden oder Texte wie `Ganztägig` enthalten.
* `endTime`: Optionale Enduhrzeit (z. B. `20:00`). Wenn du nicht weißt, wie lange ein Event dauert, lass diese Spalte einfach leer – es wird dann sauber nur die Startzeit angezeigt (`13:45 Uhr`).
* `category`: Kategorien kommagetrennt (z. B. `SMM, Rhy 1`).
  * **Länder-Tags (`DE`, `CH`) & Automatische Ausfallerkennung:** Trägst du in `category` zusätzlich ein Länderkürzel ein (z. B. `Freizeit, DE` für deutsche Ferien oder `Freizeit, CH` für Schweizer Feiertage), verknüpft die Website diesen Termin automatisch mit den passenden Trainingsgruppen aus `info.csv` (`training.n.country`)!
* `color`: Optionale Akzentfarbe für die Terminkachel.
  * **🔴 Automatische Today-Badge Erkennung (Kein Schach / Ferien):** Wenn ein Termin das heutige Datum betrifft (`date` bis `endDate`) und die Farbe auf `red` (oder einen roten Farbcode wie `#ef4444`) gesetzt ist ODER der Titel sowohl die Wörter `kein` als auch `Schach` enthält, erkennt die Website dies vollautomatisch! Der Today-Badge in der Navigation wechselt für die betroffenen Trainingsgruppen automatisch auf rot (`🔴 Heute: kein Schach`).
  * Gilt das Event nur für `DE` (`Freizeit, DE`), bleibt das Schweizer Training (`CH`) davon unberührt und wird weiterhin grün angezeigt.
  * Hat das Ausfall-Event kein Länderkürzel in `category`, gilt der Ausfall für den gesamten Verein (alle Trainingsgruppen).
* `title`: Titel des Termins (z. B. `SMM 2026 - Runde 6` oder `Kein Freizeitschach DE (Ferien / Sommerpause)`).
* `author`: Optionale Angabe zur Turnierleitung / Ansprechpartner.
* `location`: Ort des Termins (z. B. `Bioland, Tannwaldstrasse 44, 4600 Olten`).
* `locationUrl`: Link zu Google Maps / OpenStreetMap.
* `image`: Optionales Bild für den Termin.
* `gallery`: Optionale Fotogalerie zum Termin.
* `content`: Ausführliche Beschreibung, Ausschreibungsdetails, Zeitplan oder Links (kann als Text oder HTML eingetragen werden).
* `bildImModal`: Steuert, ob das Hauptbild zusätzlich groß im Detail-Modal angezeigt werden soll (`ja` oder `nein`).
* *Hinweis:* Termine ab dem heutigen Tag erscheinen automatisch unter **Anstehende Termine**, vergangene Termine lassen sich unter **Vergangene Termine** ein- und ausblenden.

### 🔝 Prioritäts-Hierarchie der Heute-Anzeige (Today-Badge)
Das System bestimmt den Status in der Navigationsleiste automatisch nach folgender Reihenfolge:
1. **Priorität 1 (Höchste): Global Override (`todayOverride` in `info.csv`)** – Überschreibt alles (z. B. kurzfristige Notabsage des gesamten Vereins).
2. **Priorität 2: Per-Training Override (`training.N.overrideText` in `info.csv`)** – Überschreibt nur die jeweilige Trainingsgruppe an diesem Tag.
3. **Priorität 3: Automatische Event-Erkennung (`events.csv`)** – Prüft, ob heute ein rotes Ausfall-Event für das Land der Trainingsgruppe (`DE`/`CH`) aktiv ist.
4. **Priorität 4 (Standard): Reguläre Trainingszeit (`training.N.time` in `info.csv`)** – Zeigt die normale Uhrzeit laut Wochentag an (`🟢 Heute: 17:00 - 19:00 Uhr`).


---

## 9. Mannschaften & Spieler (`data/teams.csv` & `players.csv`)
Die Spieler- und Mannschaftsverwaltung bietet leistungsstarke, vollständig dynamische Funktionen, die komplett ohne Datenbank auskommen:

### Spalten & Zuordnung in `players.csv`
* **Mannschaftszuordnung (`Team`):** Trage in der Spalte `Team` den exakten Namen der Mannschaft (wie in `teams.csv` definiert) ein, z. B. `Rhy 1`. Wenn ein Spieler für mehrere Mannschaften gemeldet ist, trage die Namen einfach kommagetrennt ein (z. B. `Rhy 1, Rhy 2`).
* **Datenschutz & Sichtbarkeit über die 2. Zeile (`ja` / `nein`):**
  Direkt unter der Kopfzeile (Spaltennamen) befindet sich in der 2. Zeile eine Konfigurationszeile (`_globalSettings`):
  * Steht unter einer Spalte **`ja`** (oder bleibt das Feld leer), wird diese Spalte öffentlich angezeigt, in die Filter und in die Durchschnittsberechnungen einbezogen.
  * Steht unter einer Spalte **`nein`**, wird sie für die Website **vollständig ausgeblendet** und ignoriert (z. B. interne Notizen, Telefonnummern).
  * Steht in der 2. Zeile unter der Spalte `name` ein **`nein`**, greift der **automatische Datenschutz-Modus**: Der vollständige Name wird auf der Website zu Initialen abkürzt (z. B. *Max Mustermann* → *M. M.*).

### Dynamische Wertungszahlen (ELO, DWZ & mehr)
* **Automatische Erkennung:** Spaltennamen wie `ELO`, `DWZ`, `FIDE`, `SSB`, `Rating`, `Blitz`, `Rapid`, `Classic`, `Zahl`, `NWZ` oder `Punkte` werden von der Website automatisch als Wertungszahlen erkannt (sofern in der 2. Zeile nicht auf `nein` gesetzt).
* **Keine Verwechslung mit Metadaten:** Spalten wie *Geburtsjahr*, *Jahrgang*, *Alter*, *PLZ*, *Telefon* oder *Nummer* werden strikt gefiltert und **niemals** als Wertungszahlen oder für Durchschnitte berechnet.
* **Mannschaftsdurchschnitte:** Für jede erkannte Wertungszahl berechnet die Website automatisch den jeweiligen Mannschaftsdurchschnitt (`Ø ELO`, `Ø DWZ`) und zeigt diesen in der Listenansicht bei der Mannschaftsüberschrift an.

### Ansichten, Reihenfolge & Sortierung
* **Schwebende Kartenansicht (Raumansicht):** Interaktive Spieler-Kacheln, die per Maus/Touch bewegt werden können. Über die Legenden-Buttons oben lässt sich die Anzeige nach einzelnen Mannschaften filtern.
* **Übersichtliche Listenansicht:** Zeigt alle Spieler unterteilt in ihre jeweiligen Mannschaftssektionen an.
  * **Dynamische Reihenfolge der Mannschaften:** Die Reihenfolge der Sektionen (z. B. *1. Rhy 1 → 2. Rhy 2 → 3. Rhf 1 → 4. Rhf 2*) orientiert sich **immer exakt und zu 100 % an der Zeilenabfolge in `data/teams.csv`**. Wenn du in der `teams.csv` eine neue Mannschaft (z. B. `Rhy 3`) hinzufügst oder Zeilen verschiebst, passt sich die Anzeige automatisch an!
  * **Sortier-Dropdown:** Über das Dropdown (*Alphabetisch*, *Nach ELO*, *Nach DWZ* etc.) lässt sich die Reihenfolge der Spieler innerhalb jeder Mannschaftssektion gezielt sortieren – die Abfolge der Mannschaften selbst bleibt dabei stets übersichtlich und unverändert erhalten.

### Filterung mit Schieberegler (2 Punkte auf einer Linie)
* Mit dem Auswahl-Dropdown (`Wertung filtern:`) wählst du dynamisch aus, welche Zahl du steuern möchtest (z. B. *ELO filtern*, *DWZ filtern* oder *Kein Filter*).
* Der Schieberegler besitzt **zwei verschiebbare Punkte auf einer Linie**, mit denen du einen exakten Bereich (von Min bis Max) festlegen kannst. Der Bereich wird farblich hervorgehoben.
* **Dynamische Skala:** Das Maximum des Reglers passt sich automatisch an den jeweils höchsten Wert in deiner `players.csv` an (aufgerundet auf den nächsten 100er, mindestens bis 2000).

### Spieler-Detailansicht (Modal)
* Egal ob du in der schwebenden Kartenansicht oder in der Listenansicht auf die Karte eines Spielers klickst: Es öffnet sich sofort ein elegantes **Spieler-Modal** mit Avatar, Titel, farbigen Mannschafts-Badges und allen für diesen Spieler freigegebenen Daten (wie ELO, DWZ, FIDE, Titel usw.).

---

## 10. Externe CSV-Quellen verknüpfen (`data/sources.csv`)
Möchtest du eine Datei extern hosten (z. B. über eine Online-URL), kannst du den Link in `data/sources.csv` eintragen:
```csv
filename;source
media.csv;https://example.com/meine-mediathek.csv
```
Bleibt `source` leer, wird die lokale CSV-Datei aus dem `/data/`-Ordner geladen.

---

## 11. Stimmen aus der Community (`data/guestbook.csv`)
Die Startseite zeigt vor „Dein Team" ein **Testimonial-Carousel**, das zufällige Grüsse und Feedbacks sanft ein- und ausblendet (Wechsel alle 8 Sekunden, Pause bei Maus-Hover). Über den Button **„✍️ Nachricht schreiben"** können Besucher direkt eine eigene Nachricht hinterlassen.

Spaltenstruktur:
```csv
id;date;name;origin;message;show
```
* `id`: Eindeutige Nummer des Eintrags.
* `date`: Datum (alle gängigen Formate, siehe Abschnitt 1).
* `name`: Name des Verfassers (leer = `Anonym`).
* `origin`: Optionale Herkunft (z. B. `Gastmannschaft SMM`, `Teilnehmer Open Rheinfelden`).
* `message`: Die Nachricht selbst (wird sicher als reiner Text dargestellt).
* `show`: `ja` = sichtbar, `nein` = ausgeblendet ohne Löschen (Moderation).

Steuerung über `data/info.csv`:
* `guestbook.show` – **Hauptschalter** (`ja`/`nein`). Bei `nein` verschwindet die komplette Sektion samt Nav-Link „Stimmen" von der Website.
* `guestbook.formUrl` – Sende-URL für das Formular. Bleibt sie leer, läuft das Formular im Testmodus (Nachricht nur lokal in der aktuellen Sitzung sichtbar).

Das Formular ist durch ein unsichtbares Honeypot-Feld und eine Zeitprüfung gegen Spam-Bots geschützt.
