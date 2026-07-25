# ♟️ Schachverein Rheinfelden – Dokumentation & CSV-Handbuch

Dieses Handbuch erklärt die Architektur der Website sowie alle Formatierungen, Typen und Besonderheiten für die Eingabe in die CSV-Dateien im Ordner `/data/`.

**Grundprinzip:** Die Website kommt komplett ohne Datenbank und ohne Backend aus. Sämtliche Inhalte stehen in CSV-Dateien, die sich in Excel, LibreOffice oder Google Sheets bearbeiten lassen. Wer eine Zeile ändert, ändert die Website.

---

## 📋 Inhaltsverzeichnis

**Grundlagen**
1. [Projektstruktur & lokaler Start](#1-projektstruktur--lokaler-start)
2. [Allgemeine Regeln für CSV-Dateien](#2-allgemeine-regeln-für-csv-dateien)
3. [Texte schreiben (Text oder HTML)](#3-texte-schreiben-text-oder-html)
4. [Bildergalerien mit Beschriftungen](#4-bildergalerien-mit-beschriftungen)

**Inhalte**

5. [Vereinsinfos, Footer & Heute-Anzeige (`info.csv`)](#5-vereinsinfos-footer--heute-anzeige-infocsv)
6. [Neuigkeiten & Berichte (`news.csv`)](#6-neuigkeiten--berichte-newscsv)
7. [Termine & Kalender (`events.csv`)](#7-termine--kalender-eventscsv)
8. [Turniere (`tournaments.csv`)](#8-turniere-tournamentscsv)
9. [Eigene Seiten (`pages.csv`)](#9-eigene-seiten-pagescsv)
10. [Menü-Steuerung & Reihenfolge](#10-menü-steuerung--reihenfolge)
11. [Mediathek (`media.csv`)](#11-mediathek-mediacsv)
12. [Mannschaften & Spieler (`teams.csv` & `players.csv`)](#12-mannschaften--spieler-teamscsv--playerscsv)
13. [Vorstand (`members.csv`)](#13-vorstand-memberscsv)
14. [Jugend (`youth.csv`)](#14-jugend-youthcsv)
15. [Zitate (`quotes.csv`)](#15-zitate-quotescsv)
16. [Stimmen aus der Community (`guestbook.csv`)](#16-stimmen-aus-der-community-guestbookcsv)

**Technisches**

17. [Liga-Center & Ergebnisdaten](#17-liga-center--ergebnisdaten)
18. [Turnier-Anmeldungen (`anmeldungen.csv`)](#18-turnier-anmeldungen-anmeldungencsv)
19. [Externe CSV-Quellen verknüpfen (`sources.csv`)](#19-externe-csv-quellen-verknüpfen-sourcescsv)

---

## 1. Projektstruktur & lokaler Start

```
/
├── index.html            Startseite (News, Termine, Mannschaften, Turniere …)
├── news-archive.html     Vollständiges Nachrichtenarchiv mit Suche & Datumsfilter
├── events-archive.html   Terminarchiv
├── mediathek.html        Mediathek
├── liga-center.html      Tabellen, Runden & Spieler-Formkurven
├── youth.html            Jugendseite
├── 404.html              Fehlerseite
├── CNAME                 Domain-Zuordnung für GitHub Pages
│
├── css/style.css         Gesamtes Design (Hell-/Dunkelmodus)
├── js/
│   ├── shared.js         Gemeinsame Logik: Menü, Datum, CSV, Footer, Textaufbereitung
│   ├── app.js            Startseite
│   ├── news-archive.js   Nachrichtenarchiv
│   ├── events-archive.js Terminarchiv
│   ├── mediathek.js      Mediathek
│   └── liga-center.js    Liga-Center
│
├── data/                 Alle Inhalte als CSV (siehe unten)
└── assets/               Bilder, Logos, Dateien
```

### Lokal starten

Die Seite lädt die CSV-Dateien per JavaScript. Ein Öffnen der `index.html` per Doppelklick funktioniert deshalb **nicht** – der Browser blockiert das Laden lokaler Dateien.

Stattdessen einen lokalen Server verwenden:
* **VS Code:** Erweiterung *Live Server* installieren, Rechtsklick auf `index.html` → *Open with Live Server*.
* **Python:** Im Projektordner `python -m http.server` ausführen, dann `http://localhost:8000` öffnen.

### Veröffentlichen

Das Projekt ist für **GitHub Pages** ausgelegt. Änderungen an CSV-Dateien werden nach dem Push automatisch live geschaltet. Die Datei `CNAME` enthält die verknüpfte Domain.

> **Tipp:** Nach Änderungen im Browser mit `Strg + F5` (Mac: `Cmd + Shift + R`) neu laden, damit alte Dateien aus dem Zwischenspeicher nicht weiterverwendet werden.

---

## 2. Allgemeine Regeln für CSV-Dateien

* **Trennzeichen:** Das Semikolon (`;`) trennt die Spalten.
* **Leere Felder:** Wenn ein Feld leer bleiben soll, einfach nichts zwischen die Semikolons schreiben (`;;`).
* **Mehrzeilige Texte & Semikolons im Text:** Wenn ein Text Semikolons oder Zeilenumbrüche enthält, muss der gesamte Text in doppelte Anführungszeichen gesetzt werden (`"..."`). Ein Anführungszeichen *innerhalb* eines solchen Textes wird verdoppelt (`""`).
* **Zeichensatz:** Dateien als **UTF-8** speichern, damit Umlaute korrekt erscheinen. (Die Website korrigiert gängige Umlaut-Fehler automatisch, sauber gespeichert ist aber besser.)
* **Reihenfolge der Spalten:** Nicht verändern. Neue Spalten immer **hinten** anhängen.
* **Datumsangaben:** Du bist komplett flexibel – unterstützt werden `TT.MM.JJJJ` (`15.04.2026`), `TT.MM.JJ` (`15.04.26`), kompakte Zahlenreihen (`20260415` oder `260415`), ISO-Formate (`2026-04-15`) sowie ausgeschriebene Monats- und Jahresangaben (`April 2026` oder `2026`). Auch `?` oder `TBD` sind erlaubt für „Datum noch offen".
* **Ja/Nein-Felder:** Erlaubt sind `ja`, `j`, `yes`, `1`, `true` (= ja) bzw. `nein`, `no`, `0`, `false` (= nein). Groß-/Kleinschreibung spielt keine Rolle.

---

## 3. Texte schreiben (Text oder HTML)

Du hast zwei Möglichkeiten, Texte (für Neuigkeiten in `news.csv` oder Beschreibungen in `events.csv`) zu verfassen:

### Möglichkeit A: Einfacher Text (ohne HTML-Kenntnisse)
Die Website formatiert deinen normalen Text automatisch:
* **Absätze:** Drücke einfach **zweimal Enter** (zwei Zeilenumbrüche), um einen neuen Absatz zu beginnen.
* **Einfache Zeilenumbrüche:** Ein einzelner Zeilenumbruch wird als Zeilenumbruch dargestellt.
* **Links (URLs):** Internetadressen wie `https://www.schachbund.de` oder `www.lichess.org` werden automatisch in klickbare Links umgewandelt.

### Möglichkeit B: WYSIWYG-HTML-Editoren nutzen
Wenn du Texte aufwendig formatieren möchtest (z. B. fette Zwischenüberschriften, Listen, Tabellen oder farbige Markierungen), kannst du jeden beliebigen **WYSIWYG-HTML-Editor** (z. B. Online-HTML-Editoren, Word-to-HTML, TinyMCE) verwenden.
* Kopiere den dort erzeugten HTML-Code und füge ihn direkt in die Spalte `content` ein.
* Die Website erkennt HTML-Code automatisch und stellt deine Formatierung exakt dar.
* *Hinweis bei CSV:* Wenn dein HTML-Code Semikolons (`;`) oder Anführungszeichen enthält, umschließe den gesamten Text mit doppelten Anführungszeichen (`"..."`) und verdopple innere Anführungszeichen (`""`).

### 📊 Tabellen, Bilder & Videos in der Vorschau
Auf den Kacheln der Startseite und im Archiv wird nur ein **Textausschnitt** angezeigt. Tabellen, Bilder und Videos lassen sich dort nicht sinnvoll darstellen. Die Website ersetzt sie deshalb **an genau der Stelle, an der sie im Text stehen**, durch einen kursiven Hinweis:

| Im Beitrag enthalten | Anzeige in der Vorschau |
| :--- | :--- |
| Eine Tabelle | *📊 Tabelle – zum Ansehen klicken* |
| Ein Bild | *🖼️ Bild – zum Ansehen klicken* |
| Mehrere Bilder direkt hintereinander | *🖼️ Bilder – zum Ansehen klicken* |
| Eine Galerie (Spalte `gallery`) | *🖼️ Bildergalerie – zum Ansehen klicken* |
| Ein Video / eine Einbettung | *▶️ Video – zum Ansehen klicken* |

Bildunterschriften bleiben als normaler Text erhalten. Beim Klick auf die Kachel erscheint der vollständige Beitrag samt Tabellen und Bildern im Detailfenster.

---

## 4. Bildergalerien mit Beschriftungen

In der Mediathek (`media.csv`), bei Artikeln (`news.csv`) und bei Terminen (`events.csv`) können Fotoalben hinterlegt werden.

* Trenne die Bilder mit einem Doppel-Pipe-Symbol: `||`
* Hinter jeder Bild-URL kann optional mit einem einzelnen Pipe-Symbol (`|`) eine **Bildunterschrift** stehen.

**Beispiel:**
```
https://example.com/saal.jpg | Turniersaal vor Runde 1 || https://example.com/sieger.jpg | Siegerehrung 2026
```

---

## 5. Vereinsinfos, Footer & Heute-Anzeige (`info.csv`)

Die Datei `info.csv` hat die Spalten `keyPath;value` – links der Schlüssel, rechts der Wert.

### Allgemein
* `clubName` – Name des Vereins (`Schach Rheinfelden`)
* `slogan` – Untertitel auf der Startseite
* `announcement` – Banner oben auf der Seite. *Intelligentes Verhalten:* Schliesst ein Besucher das Banner über das `×`, bleibt es dauerhaft ausgeblendet. Erst wenn du einen **neuen Text** einträgst, erscheint es automatisch wieder.
* `announcement_color` – Farbe des Banners (`gold`, `red`, `blue`, `green` oder ein eigener Farbwert wie `#7c3aed`).
* `heroMedia` – Hintergrund ganz oben (siehe unten).
* `footer.copyright` – Überschreibt den Copyright-Text im Footer.
* `contact.email` / `contact.phone` – Kontaktdaten im Footer (mehrere E-Mails mit `;` trennen – dann Feld in Anführungszeichen setzen).
* `legal.impressum` / `legal.datenschutz` – Eigene Texte für Impressum und Datenschutz. Bleiben sie leer, greifen hinterlegte Standardtexte.
* `socialLinks.lichess` / `socialLinks.chesscom` – Links zu den Vereinsteams.
* `location.name` / `location.address` – Spielort samt Google-Maps-Vorschau.

### Hero-Banner & Hintergrund-Slideshow
Das Feld `heroMedia` steuert den grossen Hintergrund oben auf der Startseite:
* **Option A – Video:** Link zu Videodateien (`.mp4`, `.webm`, `.mov`, `.m4v`, `.ogg`) oder zu YouTube & Vimeo (automatische Vollbildabdeckung ohne schwarze Ränder, auch auf dem Smartphone).
* **Option B – Einzelbild:** Link zu einer Bilddatei (z. B. `assets/hero.jpg`).
* **Option C – Automatische Slideshow:** Mehrere Bild-URLs durch Komma getrennt eintragen:
  ```csv
  heroMedia;assets/turnier1.jpg, assets/turnier2.jpg, assets/turnier3.jpg
  ```
  👉 Die Website wechselt automatisch **alle 5 Sekunden sanft überblendend** zum nächsten Bild.

### Bankverbindung
* `bank.ch` / `bank.de` – Bankverbindung für den Footer-Punkt „Bankverbindung" (Umschalter 🇨🇭 / 🇩🇪). Einfach **Klartext** in die Zelle, kein HTML nötig:
  * **Erste Zeile** = Überschrift (z. B. `Rhy-Rheinfelden (Schweiz)`).
  * **Jede weitere Zeile** = eine Angabe. Text vor dem Doppelpunkt wird automatisch fett (z. B. `IBAN: CH25 0900 0000 4001 9443 9`).
  * In Google Sheets erzeugt man Zeilenumbrüche in einer Zelle mit **Alt+Enter** (Mac: Ctrl+Option+Enter).
  * Ist nur eines der beiden Felder gefüllt, erscheint kein Umschalter. Sind **beide leer**, verschwindet der Footer-Punkt komplett.

### Trainingszeiten & Heute-Anzeige
* `training.1.group` / `training.1.time` bis `training.n....` – Dynamische Trainingszeiten (z. B. `training.1.time;Dienstags, 17:00 - 19:00 Uhr`). Aus diesen Uhrzeiten bedient sich die automatische Heute-Anzeige für den jeweiligen Wochentag.
* `training.1.country` – **Länderzugehörigkeit** der Gruppe (`DE` oder `CH`). Wichtig für die automatische Erkennung von Ferien und Feiertagen.
* `training.1.overrideText` – **Gruppenspezifische Überschreibung** (z. B. `Fällt heute aus`, wenn nur das Dienstagstraining ausfällt).
* `training.1.overrideStatus` – Farbe/Status dieser Überschreibung (`red`, `green` …).
* `showTodayStatus` – Hauptschalter für die Heute-Anzeige in der Navigationsleiste (`ja` / `nein`).
* `todayOverride` (oder `todayOverrideText`) – **Globale manuelle Überschreibung** mit höchster Priorität, z. B. `geschlossen wegen Vereinsausflug` (wird automatisch rot) oder `Spezialtraining ab 18:00 Uhr` (grün).
* `todayOverrideStatus` – Setzt Farbe/Status für den globalen Override explizit (`red`, `green`, `closed`, `open`).

### 🔝 Prioritäts-Hierarchie der Heute-Anzeige
Das System bestimmt den Status in der Navigationsleiste nach folgender Reihenfolge:
1. **Global Override** (`todayOverride` in `info.csv`) – überschreibt alles.
2. **Per-Training Override** (`training.N.overrideText`) – überschreibt nur diese Gruppe.
3. **Automatische Event-Erkennung** (`events.csv`) – prüft, ob heute ein rotes Ausfall-Event für das Land der Gruppe aktiv ist.
4. **Reguläre Trainingszeit** (`training.N.time`) – zeigt die normale Uhrzeit laut Wochentag (`🟢 Heute: 17:00 - 19:00 Uhr`).

### Gästebuch-Schalter
* `guestbook.show` – Hauptschalter (`ja`/`nein`). Bei `nein` verschwindet die komplette Sektion samt Nav-Link „Stimmen".
* `guestbook.formUrl` – Sende-URL für das Formular. Bleibt sie leer, läuft das Formular im Testmodus.
* `guestbook.fieldName` / `fieldOrigin` / `fieldMessage` – Feldnamen des Zielformulars (z. B. Google Forms).

---

## 6. Neuigkeiten & Berichte (`news.csv`)

```csv
id;date;category;title;author;color;image;content;gallery;bildImModal;bildAlsHintergrund
```

* `id` – Eindeutige Nummer des Artikels.
* `date` – Datum des Artikels.
* `category` – Kategorie-Badges, kommagetrennt (z. B. `Verein, Turnier`). Daraus entstehen automatisch die Filterknöpfe.
* `title` – Titel der Nachricht.
* `author` – Autor (z. B. `Vorstand`).
* `color` – Optionale Akzentfarbe der Karte (z. B. `#d4af37`, `red` oder leer für Standardgold).
* `image` – URL oder Pfad zum Hauptbild.
* `content` – Vollständiger Text oder HTML-Code (siehe Abschnitt 3).
* `gallery` – Optionale Bildergalerie (mit `||` getrennt, siehe Abschnitt 4).
* `bildImModal` – `ja` zeigt das Hauptbild zusätzlich gross im Detailfenster.
* `bildAlsHintergrund` – `ja` legt das Bild als Hintergrund über die ganze Kachel (Text erscheint weiss darüber).

> **Kachelhöhe:** Steht eine Kachel **ohne Bild** neben einer **mit Bild**, füllt ihr Text den zusätzlichen Platz automatisch aus, statt Leerraum zu lassen.

---

## 7. Termine & Kalender (`events.csv`)

```csv
id;date;endDate;time;endTime;category;color;title;author;location;locationUrl;image;gallery;content;bildImModal
```

* `id` – Eindeutige Nummer des Termins.
* `date` – Startdatum (alle Formate aus Abschnitt 2, auch `?` / `TBD`).
* `endDate` – Optionales Enddatum, ideal für mehrtägige Turniere. Erscheint kompakt in der Datumsbox (z. B. `11.–13. SEP`).
* `time` – Startuhrzeit (z. B. `13:45`). Kann leer bleiben oder Text wie `Ganztägig` enthalten.
* `endTime` – Optionale Enduhrzeit. Leer lassen, wenn die Dauer unbekannt ist – dann erscheint nur die Startzeit.
* `category` – Kategorien kommagetrennt (z. B. `SMM, Rhy 1`).
  * **Länder-Tags (`DE`, `CH`):** Trägst du zusätzlich ein Länderkürzel ein (z. B. `Freizeit, DE`), verknüpft die Website den Termin automatisch mit den passenden Trainingsgruppen aus `info.csv`.
* `color` – Optionale Akzentfarbe der Terminkachel.
  * **🔴 Automatische Ausfallerkennung:** Betrifft ein Termin das heutige Datum und ist die Farbe `red` (oder ein roter Farbcode) **oder** enthält der Titel die Wörter `kein` und `Schach`, wechselt die Heute-Anzeige automatisch auf `🔴 Heute: kein Schach`.
  * Gilt das Event nur für `DE`, bleibt das Schweizer Training unberührt – und umgekehrt.
  * Ohne Länderkürzel gilt der Ausfall für den ganzen Verein.
* `title` – Titel des Termins.
* `author` – Optionale Turnierleitung / Ansprechpartner.
* `location` – Ort des Termins.
* `locationUrl` – Link zu Google Maps / OpenStreetMap.
* `image` / `gallery` – Optionales Bild bzw. Fotogalerie.
* `content` – Ausführliche Beschreibung, Zeitplan oder Links.
* `bildImModal` – `ja` zeigt das Bild zusätzlich gross im Detailfenster.

> Termine ab heute erscheinen unter **Anstehende Termine**; vergangene lassen sich im Archiv einsehen. Jeder Termin kann einzeln oder gesammelt als **Kalenderdatei (.ics)** heruntergeladen werden.

### 🗓️ Ansichten im Terminarchiv

Das Terminarchiv (`events-archive.html`) bietet zwei Darstellungen, umschaltbar über die beiden Knöpfe rechts neben den Filtern:

| Ansicht | Eignung |
| :--- | :--- |
| **Kachelansicht** (Standard) | Einzelne Termine im Detail lesen, mit Bild und Beschreibung. |
| **Zeitleistenansicht** | Überblick über einen längeren Zeitraum – wann sich Termine häufen, überschneiden oder Lücken lassen. |

Beide Ansichten zeigen dieselbe Auswahl: Kategorie-Filter, Suche und Datumsfilter wirken auf beide gleichermassen.

#### Wie die Zeitleiste liest

* **Balkenlänge = Dauer.** Ein eintägiger Termin erscheint als kurzer Punkt, ein mehrtägiges Turnier (Spalte `endDate`) als durchgehender Balken über den gesamten Zeitraum.
* **Farbe = Spalte `color`.** Termine gleicher Farbe werden in einer gemeinsamen Spur gebündelt. So bleiben zusammengehörige Reihen – etwa alle SMM-Runden – auf einer Linie beieinander. Termine ohne eigene Farbe erhalten ein neutrales Grau.
* **Stapelung.** Überschneiden sich Termine zeitlich, rücken sie übereinander statt sich zu verdecken. Die längsten Balken liegen unten, kurze weiter oben.
* **Senkrechte Linie „Heute".** Markiert den heutigen Tag. Sie erscheint nur, wenn das aktuelle Datum im dargestellten Zeitraum liegt – bei einem reinen Vergangenheitsfilter also nicht.
* **Beschriftung der Zeitachse.** Die Skala passt sich der Spannweite an: bis eineinhalb Jahre einzelne Monate, darüber Quartale, ab fünf Jahren nur noch Jahreszahlen. So bleiben die Beschriftungen auch bei einem grossen Archiv lesbar.

#### Bedienung

* **Maus:** Fahren über einen Balken zeigt Datum und Titel, ein Klick öffnet das Detailfenster.
* **Touch:** Der erste Tipper zeigt die Beschriftung, der zweite öffnet das Detailfenster.
* **Tastatur:** Mit `Tab` von Termin zu Termin, `Enter` oder `Leertaste` öffnet das Detailfenster, `Esc` schliesst eine offene Beschriftung.

> **Termine ohne festes Datum** (`?` oder `TBD` in der Spalte `date`) lassen sich nicht auf einer Zeitachse verorten und erscheinen deshalb nur in der Kachelansicht. Enthält die Auswahl ausschliesslich solche Termine, weist die Zeitleiste darauf hin.

---

## 8. Turniere (`tournaments.csv`)

```csv
id;name;description;image;bildImModal;link;linkText;content;showInMenu;kategorie;sortierung;kategorieSortierung
```

* `id` – Eindeutige Nummer des Turniers.
* `name` – Kurzer Anzeigename auf der Karte, im Menü und im Detailfenster (z. B. `AJGP`, `SMM`).
* `description` – Fliesstext, der auf der Kartenrückseite und im Detailfenster unter dem Titel erscheint. **Tipp:** Bei Abkürzungen hier den vollen Namen einführen, z. B. *„Der Aargauer Jugendschach-Grand-Prix (AJGP) ist die Turnierserie …"*.
* `image` – Optionales Logo/Bild als Kartenhintergrund.
* `bildImModal` – `ja` zeigt das Bild zusätzlich gross im Detailfenster.
* `link` / `linkText` – Ziel und Beschriftung des Knopfes auf der Kartenrückseite.
* `content` – Ausführlicher Inhalt des Detailfensters (Text oder HTML).
* `showInMenu` – `ja` nimmt das Turnier in die Navigationsleiste auf (siehe Abschnitt 10).
* `kategorie` – Untermenü, in dem der Link erscheinen soll (z. B. `Turniere`).
* `sortierung` / `kategorieSortierung` – Reihenfolge im Menü (siehe Abschnitt 10).

### Darstellung
Die Turniere erscheinen als **Karten in einem Raster**, die sich beim Überfahren umdrehen und die Beschreibung zeigen. Statt seitlich zu scrollen, lädt ein Knopf darunter weitere Turniere nach:

| Ansicht | Karten pro Reihe | Karten pro Klick |
| :--- | :--- | :--- |
| Desktop (breit) | 4 | 8 (2 Reihen) |
| Laptop | 3 | 6 (2 Reihen) |
| Tablet | 2 | 8 (4 Reihen) |
| Handy | 1 | 6 (6 Reihen) |

Der Knopf sagt jeweils, wie viele Turniere dazukommen (z. B. *„8 weitere Turniere anzeigen"*), darunter steht der Gesamtstand (*„8 von 17 Turnieren"*). Sind alle sichtbar, klappt *„Weniger anzeigen"* wieder ein.

---

## 9. Eigene Seiten (`pages.csv`)

Mit `pages.csv` legst du zusätzliche Unterseiten an, ohne eine neue HTML-Datei zu erstellen.

```csv
id;title;content;showInMenu;url;kategorie;sortierung;kategorieSortierung
```

* `id` – Kurzname ohne Leerzeichen (z. B. `open-ascona`). Die Seite ist danach über `index.html?page=open-ascona` erreichbar.
* `title` – Titel der Seite und Beschriftung im Menü.
* `content` – Inhalt der Seite (Text oder HTML).
* `showInMenu` – `nein` blendet den Menüpunkt aus, die Seite bleibt über den Link erreichbar. Leer oder `ja` = sichtbar.
* `url` – Optionaler **direkter Link** statt einer erzeugten Seite (z. B. `liga-center.html`). Ist er gefüllt, wird `content` ignoriert.
* `kategorie` / `sortierung` / `kategorieSortierung` – Menüposition (siehe Abschnitt 10).

---

## 10. Menü-Steuerung & Reihenfolge

Die Navigationsleiste baut sich automatisch auf: aus fest eingebauten Punkten sowie aus allen Einträgen in `pages.csv` und `tournaments.csv`, bei denen `showInMenu` auf `ja` steht.

### Wohin kommt ein Eintrag?
* **Mit `kategorie`** (z. B. `Turniere`) → erscheint im gleichnamigen Untermenü. Existiert es noch nicht, wird es angelegt.
* **Ohne `kategorie`** → erscheint als einzelner Link direkt in der obersten Menüleiste.

Turniere haben keine eigene Seite, sondern öffnen das **Detailfenster** des Turniers. Auf der Startseite geschieht das ohne Neuladen.

### Reihenfolge festlegen
Zwei Zahlenspalten steuern die Position. **Kleinere Zahl = weiter vorne.** Leere Felder wandern ans Ende.

| Spalte | Steuert |
| :--- | :--- |
| `sortierung` | Position **innerhalb** eines Untermenüs |
| `kategorieSortierung` | Position der **Kategorie** bzw. des Einzellinks in der obersten Leiste |

Die fest eingebauten Menüpunkte haben folgende Werte – daran orientierst du dich beim Einsortieren:

| Position | Menüpunkt | Wert |
| :--- | :--- | :--- |
| 1 | Aktuelles | 10 |
| 2 | Verein | 20 |
| 3 | Turniere | 30 |
| 4 | Mediathek | 40 |

**Beispiele:**
* Liga-Center soll zwischen Turniere und Mediathek → `kategorieSortierung` = `35`.
* Ein Turnier soll im Untermenü ganz oben stehen → `sortierung` = `5` (der Punkt *Turnier-Übersicht* hat fest die `1`).

> **Empfehlung:** In Zehnerschritten nummerieren (10, 20, 30). So lässt sich später mühelos etwas dazwischenschieben, ohne alles neu zu vergeben.

> **Bei Gleichstand** entscheidet die Ladereihenfolge (erst `pages.csv`, dann `tournaments.csv`). Wer eine eindeutige Reihenfolge will, vergibt unterschiedliche Zahlen.

> **Doppelte Namen:** Existiert ein Menüpunkt mit gleichem Titel oder Link bereits, wird der zweite Eintrag übersprungen. Das verhindert Dubletten, wenn ein Turnier zugleich eine eigene Seite in `pages.csv` besitzt.

---

## 11. Mediathek (`media.csv`)

```csv
id;title;date;category;type;color;url;description;thumbnail;author;emoji
```

* `id` – Eindeutige Nummer.
* `title` – Titel des Eintrags.
* `date` – Datum.
* `category` – Kategorie für die Filterknöpfe (z. B. `Training`, `Turnier`).
* `type` – Bestimmt Icon und Verhalten (siehe Tabelle unten).
* `color` – Optionale Akzentfarbe.
* `url` – Ziel-Link, Video-Link oder Bild-URL. Bei Galerien mehrere Bilder mit `||` trennen.
* `description` – Kurzbeschreibung auf der Karte.
* `thumbnail` – Vorschaubild der Karte.
* `author` – Optionale Quelle / Urheber.
* `emoji` – Optionales eigenes Badge statt des Standard-Icons.

### Unterstützte Typen in der Spalte `type`

| Typ (`type`) | Icon | Verhalten beim Klick |
| :--- | :--- | :--- |
| `webseite`, `website`, `link`, `extern`, `tool` | 🌐 Webseite | Öffnet die Webseite in einem **neuen Browser-Tab**. |
| `youtube` | ▶️ YouTube | Öffnet den YouTube-Player im **Video-Fenster** auf der Seite. |
| `vimeo` | 🟦 Vimeo | Öffnet den Vimeo-Player im Fenster. |
| `bild`, `image`, `foto` | 🖼️ Bild | Öffnet eine Grossansicht des Bildes. |
| `galerie`, `gallery`, `bilder` | 🖼️ Galerie | Öffnet ein Album zum Durchblättern. |
| `pdf`, `dokument`, `doc` | 📄 Dokument | Öffnet das PDF in einem neuen Tab. |
| `taktik`, `puzzle`, `training` | ♟️ Taktik | Badge für Schach-Taktiken und Trainingsseiten. |
| `lichess` | ♘ Lichess | Für Lichess-Studien oder Partien. |

---

## 12. Mannschaften & Spieler (`teams.csv` & `players.csv`)

### `teams.csv`
```csv
id;name;country;league
```
* `id` – Kurzname ohne Leerzeichen (z. B. `rhy1`).
* `name` – Anzeigename (z. B. `Rhy 1`). **Muss exakt** mit der Spalte `Team` in `players.csv` übereinstimmen.
* `country` – Land mit Flagge (z. B. `🇨🇭 Schweiz`).
* `league` – Spielklasse (z. B. `SMM / SGM`).

> **Reihenfolge:** Die Abfolge der Mannschaftssektionen richtet sich **zu 100 % nach der Zeilenreihenfolge in `teams.csv`**. Zeilen verschieben genügt.

### `players.csv` – Zuordnung & Datenschutz
* **Mannschaftszuordnung (`Team`):** Exakter Mannschaftsname aus `teams.csv`. Bei mehreren Mannschaften kommagetrennt (z. B. `Rhy 1, Rhy 2`).
* **Sichtbarkeit über die 2. Zeile (`ja` / `nein`):** Direkt unter der Kopfzeile steht eine Konfigurationszeile:
  * **`ja`** (oder leer) → Spalte wird öffentlich angezeigt und in Filter/Durchschnitte einbezogen.
  * **`nein`** → Spalte wird **vollständig ausgeblendet** (z. B. interne Notizen, Telefonnummern).
  * **`nein` unter `name`** → **automatischer Datenschutz-Modus**: Namen werden zu Initialen gekürzt (*Max Mustermann* → *M. M.*).

### Dynamische Wertungszahlen (ELO, DWZ & mehr)
* **Automatische Erkennung:** Spalten wie `ELO`, `DWZ`, `FIDE`, `SSB`, `Rating`, `Blitz`, `Rapid`, `Classic`, `Zahl`, `NWZ` oder `Punkte` werden automatisch als Wertungszahlen erkannt.
* **Keine Verwechslung mit Metadaten:** Spalten wie *Geburtsjahr*, *Alter*, *PLZ*, *Telefon* oder *Nummer* werden strikt gefiltert und **niemals** als Wertung berechnet.
* **Mannschaftsdurchschnitte:** Für jede erkannte Wertungszahl berechnet die Website den Mannschaftsdurchschnitt (`Ø ELO`, `Ø DWZ`).

### Ansichten & Filter
* **Schwebende Kartenansicht:** Interaktive Spieler-Kacheln, per Maus/Touch bewegbar, mit Zoom. Über die Legenden-Knöpfe nach Mannschaft filterbar.
* **Listenansicht:** Alle Spieler nach Mannschaften gegliedert, mit Sortier-Dropdown (*Alphabetisch*, *Nach ELO*, *Nach DWZ* …).
* **Schieberegler:** Über das Dropdown wählst du die Wertung, zwei Punkte auf einer Linie legen den Bereich fest. Die Skala passt sich automatisch an den höchsten Wert an.
* **Spieler-Detailfenster:** Klick auf eine Karte öffnet Avatar, Titel, Mannschafts-Badges und alle freigegebenen Daten.

---

## 13. Vorstand (`members.csv`)

```csv
Name;Role;Email;Image;Schweiz;Deutschland;ELO
ja;ja;ja;ja;ja;ja;nein
```

Wie bei `players.csv` steuert die **2. Zeile** die Sichtbarkeit jeder Spalte (`ja` / `nein`).

* `Name` – Name (bei `nein` in Zeile 2 automatisch als Initialen).
* `Role` – Funktion (z. B. `Präsident`, `Jugendleiter`).
* `Email` – Kontaktadresse.
* `Image` – Porträtbild. Fehlt es, erzeugt die Website automatisch einen Avatar aus den Initialen.
* `Schweiz` / `Deutschland` – `ja` ordnet die Person dem jeweiligen Land zu. Daraus entstehen die Filterknöpfe 🇨🇭 / 🇩🇪.
* Weitere eigene Spalten erscheinen automatisch auf der Kartenrückseite.

> Der Eintrag `offen` oder `vakant` als Name kennzeichnet eine unbesetzte Position und erhält ein neutrales Fragezeichen-Bild.

---

## 14. Jugend (`youth.csv`)

Inhalte der Jugendseite (`youth.html`).

```csv
id;title;content;icon
```
* `id` – Kurzname des Abschnitts (z. B. `training`, `liga`, `schulen`).
* `title` – Überschrift des Abschnitts.
* `content` – Text oder HTML (Listen mit `<ul><li>…</li></ul>` sind hier üblich).
* `icon` – Emoji als Symbol (z. B. `♟️`, `⚔️`, `🏫`).

---

## 15. Zitate (`quotes.csv`)

Auf der Startseite erscheint bei jedem Aufruf ein zufälliges Schachzitat.

```csv
author;role;text;status
```
* `author` – Urheber (z. B. `Emanuel Lasker`).
* `role` – Optionale Ergänzung (z. B. `2. Schachweltmeister`).
* `text` – Das Zitat selbst.
* `status` – **Interne Notiz zur Quellenlage**, wird auf der Website *nicht* angezeigt (z. B. `✅ belegt`, `❓ nicht verifizierbar`).

---

## 16. Stimmen aus der Community (`guestbook.csv`)

Die Startseite zeigt ein **Testimonial-Carousel**, das zufällige Grüsse sanft ein- und ausblendet (Wechsel alle 8 Sekunden, Pause bei Maus-Hover). Über den Knopf **„✍️ Nachricht schreiben"** können Besucher selbst etwas hinterlassen.

```csv
id;date;name;origin;message;show
```
* `id` – Eindeutige Nummer.
* `date` – Datum.
* `name` – Name des Verfassers (leer = `Anonym`).
* `origin` – Optionale Herkunft (z. B. `Gastmannschaft SMM`).
* `message` – Die Nachricht (wird sicher als reiner Text dargestellt).
* `show` – `ja` = sichtbar, `nein` = ausgeblendet ohne Löschen (Moderation).

Steuerung über `info.csv`: siehe Abschnitt 5 (`guestbook.show`, `guestbook.formUrl`).

Das Formular ist durch ein unsichtbares Honeypot-Feld und eine Zeitprüfung gegen Spam-Bots geschützt.

---

## 17. Liga-Center & Ergebnisdaten

Das **Liga-Center** (`liga-center.html`) zeigt Tabellen, Rundenergebnisse und Spieler-Formkurven. Es speist sich aus vier Dateien – zwei für die Schweiz (SSB), zwei für Deutschland (BSV).

### Mannschaftsergebnisse: `ssb_spiele.csv` / `bsv_spiele.csv`
```csv
Turnier;Saison;Liga;Runde;Heimteam;Gastteam;MP_Heim;MP_Gast;EP_Heim;EP_Gast
```
* `Turnier` – Wettbewerb (`SMM`, `SGM`, `BMM`).
* `Saison` – Jahr (z. B. `2025`).
* `Liga` – Spielklasse (z. B. `3. Liga - Nordwest 2`).
* `Runde` – Rundennummer.
* `Heimteam` / `Gastteam` – Mannschaftsnamen.
* `MP_Heim` / `MP_Gast` – Mannschaftspunkte.
* `EP_Heim` / `EP_Gast` – Einzel-/Brettpunkte.

### Einzelergebnisse: `ssb_brett_details.csv` / `bsv_brett_details.csv`
```csv
Turnier;Saison;Liga;Runde;Brett;Team_Weiss;Weiss;Elo_Weiss;Team_Schwarz;Schwarz;Elo_Schwarz;Ergebnis
```
* `Brett` – Brettnummer.
* `Team_Weiss` / `Weiss` / `Elo_Weiss` – Mannschaft, Spielername und Wertung (Weiss).
* `Team_Schwarz` / `Schwarz` / `Elo_Schwarz` – dasselbe für Schwarz.
* `Ergebnis` – Ausgang der Partie (z. B. `1 - 1`, `2 - 0`, `0 - 2`).

> Der Aufruf `liga-center.html?turnier=SMM` öffnet das Liga-Center direkt beim gewünschten Wettbewerb – so sind die Knöpfe in `tournaments.csv` verlinkt.

---

## 18. Turnier-Anmeldungen (`anmeldungen.csv`)

Für Turniere mit Online-Anmeldung (z. B. Freizeit-Arena) zeigt die Turnierseite eine **Live-Anmeldeliste**. Die Datei wird üblicherweise automatisch aus einem Google-Formular befüllt.

```csv
Zeitstempel;E-Mail-Adresse;Wie sieht es mit deiner Teilnahme aus?;Vorname;Nachname;Team (optional);Team-Logo URL (optional);Anmerkung (optional)
```

* **Doppelte Anmeldungen** derselben E-Mail-Adresse werden automatisch zusammengeführt – es zählt der **neueste** Eintrag. So können Teilnehmende ihre Zusage nachträglich ändern.
* Die Antwort auf die Teilnahmefrage steuert das Statussymbol: beginnt sie mit `ja` → 🟢 Dabei, mit `nein` → 🔴 Absage, sonst ⚪ Offen.
* Die Liste lässt sich nach Status, Name, Team und Anmeldedatum sortieren sowie durchsuchen.

---

## 19. Externe CSV-Quellen verknüpfen (`sources.csv`)

Möchtest du eine Datei extern hosten (z. B. als veröffentlichte Google-Tabelle), trägst du den Link hier ein:

```csv
filename;source;description
media.csv;https://example.com/meine-mediathek.csv;Mediathek Fotos und Videos
```

* `filename` – Name der lokalen Datei, die ersetzt werden soll.
* `source` – Vollständige URL zur externen CSV. **Bleibt sie leer, wird die lokale Datei aus `/data/` geladen.**
* `description` – Notiz zur Datei (nur zur Orientierung, ohne Wirkung auf die Website).

**Nützlich zu wissen:**
* Ist die externe Quelle nicht erreichbar oder liefert sie kein gültiges CSV, greift die Website automatisch auf die lokale Datei zurück – die Seite bleibt also funktionsfähig.
* Externe Tabellen mit **Komma** als Trennzeichen werden automatisch erkannt und umgewandelt.
* Bei Google Sheets die Tabelle über *Datei → Freigeben → Im Web veröffentlichen* als **CSV** veröffentlichen und diesen Link eintragen.
