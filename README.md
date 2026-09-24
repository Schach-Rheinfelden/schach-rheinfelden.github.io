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
20. [Bestenliste (`bestenliste.csv`)](#20-bestenliste-bestenlistecsv)

---

## 1. Projektstruktur & lokaler Start

```
/
├── index.html            Startseite (News, Termine, Mannschaften, Turniere …)
├── news-archive.html     Vollständiges Nachrichtenarchiv mit Suche & Datumsfilter
├── events-archive.html   Terminarchiv
├── mediathek.html        Mediathek
├── liga-center.html      Tabellen, Runden & Spieler-Formkurven
├── bestenliste.html      Ewige Rangliste aller Mannschaftspartien
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
│   ├── liga-center.js    Liga-Center
│   └── bestenliste.js    Bestenliste
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

---

## 20. Bestenliste (`bestenliste.csv`)

Die Seite **Bestenliste** (`bestenliste.html`) ist die ewige Rangliste des Mannschaftsschachs: jede Partie, die für Rhy 1, Rhy 2, Rhf 1 oder Rhf 2 gespielt wurde, seit 2006.

### Woher die Zahlen kommen

Gepflegt werden sie **nicht** hier, sondern im separaten Statistik-Dokument mit den Blättern `Rhy1`, `Rhy2`, `Rhf1` und `Rhf2`. Dort steht je Mannschaft eine breite Matrix: links der Name mit seinen Summen, rechts eine Spalte je gespielter Runde.

Das Apps Script `Bestenliste.gs` faltet diese Matrix ins Langformat und schreibt sie ins Blatt `bestenliste`:

> **♟️ Schach Rheinfelden → 🏆 Bestenliste → 🔄 Aus Statistik holen**
>
> Danach das Blatt wie gewohnt über **🚀 GitHub Upload** veröffentlichen.

Der Punkt **👁️ Vorschau** zeigt vorher an, wie viele Saisons je Blatt erkannt wurden, ohne etwas zu ändern – sinnvoll, nachdem im Statistik-Dokument eine neue Saison angefügt wurde.

### Aufbau der Datei

```csv
Name;Team;Liga;Saison;Jahr;Punkte;Partien;Siege;Remis;Niederlagen;Resultate
Hyötylä, Tapio;Rhy 1;SGM;07/08;2008;3.5;7;2;3;2;1,0.5,0,1,0.5,0.5,0
```

* `Name` – **`Nachname, Vorname`**, genau wie im Statistik-Dokument. Die Website dreht das für die Anzeige um.
* `Team` – `Rhy 1`, `Rhy 2`, `Rhf 1` oder `Rhf 2` (Schreibweise wie in `players.csv`).
* `Liga` – `SGM`, `SMM` oder `BMM`.
* `Saison` – Etikett aus dem Quellblatt, z. B. `07/08` oder `26`.
* `Jahr` – Jahr, in dem die Saison **endet** (siehe unten). Danach wird sortiert und gefiltert.
* `Punkte` … `Niederlagen` – Bilanz dieser einen Saison.
* `Resultate` – die Einzelergebnisse der Runden, komma­getrennt: `1` Sieg, `0.5` Remis, `0` Niederlage, leer = nicht gespielt. Daraus rechnet die Seite Siegesserien und die Rundenpunkte im Spielerfenster.

**Eine Zeile je Spieler, Mannschaft, Liga und Saison** – bewusst keine fertigen Gesamtsummen. Nur so lässt sich die Liste nach Mannschaft, Wettbewerb und Saison ausschneiden; eine vorberechnete Summe wäre für genau eine Ansicht richtig.

### Reihenfolge und Platzierung

**Gleichstand** entscheidet je Spalte der Massstab, der in ihrem Sinn „besser" heisst:

| Sortiert nach | bei Gleichstand zuerst |
| :--- | :--- |
| Punkte | **weniger** Partien – 30 aus 40 ist mehr Leistung als 30 aus 60 |
| Partien | mehr Punkte |
| Erfolg | **mehr** Partien – 75 % aus 40 wiegen schwerer als 75 % aus 4 |
| Siege | weniger Partien |

Dreht man die Sortierrichtung um, dreht sich auch dieser zweite Massstab mit.

**Die Platzierung** wird vergeben, *bevor* die Suche greift. Wer den eigenen Namen eintippt, sieht deshalb seinen echten Platz (`12.`) und nicht `1.`. Der Zähler rechts zeigt dann `1 von 103`.

Filter wie Mannschaft, Wettbewerb, Saison, Mindestpartien und der Mitglieder-Schalter bestimmen dagegen, **wer überhaupt gewertet wird** – sie verändern die Platzierung also sehr wohl. Podest, Vereinsbilanz und Rekordtafel bleiben von der Suche ebenfalls unberührt.

### Die Vereinsbilanz oben

Die vier Zahlen – Spieler, Partien, Punkte, Saisons – beziehen sich immer auf **genau die Personen, die gerade gewertet werden**. Auch „👥 Nur heutige Mitglieder" und die Mindestzahl an Partien gehen also mit: Blendest du die Ehemaligen aus, sinken nicht nur die Spieler, sondern auch die Partien und Punkte.

Das war zunächst anders – die Bilanz zählte alle gefilterten Zeilen, weil diese beiden Filter je Person greifen statt je Zeile. Vier Zahlen nebeneinander, von denen eine etwas anderes meint als die drei anderen, laden aber zum Fehlschluss ein.

### 🔥 Serien: Siege in Folge und ungeschlagen

Gezählt wird **innerhalb eines Wettbewerbs**, dort aber über die Jahre hinweg: Runde 7 der SGM 24/25 und Runde 1 der SGM 25/26 folgen tatsächlich aufeinander. Von SGM, SMM und BMM gilt der beste Wert; welcher Wettbewerb es war, steht klein unter der Zahl.

* **Siege in Folge** – lauter Siege, eine Niederlage *oder ein Remis* beendet die Serie.
* **Ungeschlagen** – ohne Niederlage, Remis zählen mit.
* Runden ohne Einsatz unterbrechen **nicht**: Wer aussetzt, verliert nichts.

**Warum nicht alles in eine Kette?** Weil SGM und BMM *parallel* laufen, von Oktober bis März. Hängt man sie hintereinander, entsteht eine Reihenfolge, die es nie gab – und die Zahl hängt davon ab, welchen Wettbewerb man zuerst einsortiert. Das erzeugt Fehler in beide Richtungen: Bei einem Spieler zerriss eine Niederlage aus dem parallel laufenden Wettbewerb eine echte Serie von 15 ungeschlagenen Partien zu 12; bei anderen verband sie zwei getrennte Läufe zu einem zu langen.

Zu den Runden gibt es im Statistik-Dokument nur Nummern, keine Daten – eine echte zeitliche Verzahnung der Wettbewerbe ist deshalb nicht möglich.

### Der Untertitel

Er nennt die Mannschaften, die **wirklich in den Daten stehen** – nicht eine feste Liste im HTML. Kommt eine dritte Rhy-Mannschaft dazu, steht sie am nächsten Tag oben im Satz. Ab fünf Mannschaften wird aus der Aufzählung eine Zahl („für unsere 6 Mannschaften"), sonst verdrängt sie den Rest des Satzes.

Die Angaben in `<title>`, `<meta name="description">` und den Open-Graph-Feldern von `bestenliste.html` sind dagegen **fest eingetragen** und nennen SMM, SGM und BMM. Das ist Text für Suchmaschinen und Link-Vorschauen; er veraltet nicht von selbst und will bei einem neuen Wettbewerb von Hand nachgezogen werden.

### Profilbilder

Avatare, ELO, DWZ und Rolle holt die Seite aus `players.csv`. Zugeordnet wird über den Namen – unabhängig von Reihenfolge, Gross-/Kleinschreibung und Akzenten, sodass `Ödül, Ismail Irfan` und `Ismail Irfan Ödül` zusammenfinden.

Wer dort **kein** Profil hat, erscheint trotzdem in der Liste, nur mit seinen Initialen statt einem Bild. Das ist der Normalfall für ehemalige Mitglieder: Von gut hundert Personen in der Bestenliste spielen rund vierzig heute noch. Der Schalter **👥 Nur heutige Mitglieder** blendet die übrigen aus.

### Was die Seite selbst rechnet

Summen, Quoten, Siegesserien, Rekorde und das Podest entstehen im Browser aus den Rohzeilen. Ändert sich nur `bestenliste.csv`, stimmt alles andere automatisch mit.

### ⭐ Ertragreichste und 🎯 stärkste Saison

Im Spielerfenster stehen **zwei** Bestmarken, weil „beste Saison" zwei verschiedene Dinge heissen kann:

* **⭐ Ertragreichste Saison** – die grösste Punktausbeute. Misst aber zu einem guten Teil, wann jemand am meisten Zeit hatte.
* **🎯 Stärkste Saison** – die beste Quote, **nur unter Saisons ab 3 Partien**. Ohne diese Schwelle gewänne immer die kürzeste Saison: Eine einzige gewonnene Partie steht mit 100 % da. Für 28 von 80 Spielern wäre die „beste Saison" dann eine mit höchstens zwei Partien.

Dazu kommt eine dritte Ebene:

* **🏆 Stärkste Bilanz** – das beste Ergebnis in **einem** Wettbewerb einer Saison, z. B. „SGM 23/24 · 5 aus 6 (83 %)". „Stärkste Saison" zählt SGM, SMM und BMM eines Jahrgangs zusammen; ein starker Lauf in einem Wettbewerb kann dort von einem schwachen im anderen aufgezehrt werden. Diese Marke zeigt ihn trotzdem.

Nennen zwei Marken denselben Wert, erscheint nur die erste. Die Schwelle steht in `js/bestenliste.js` als `SAISON_MINDESTPARTIEN` und liegt bei **3**: Bei fünf bekam nur die Hälfte der Spieler überhaupt eine stärkste Bilanz (53 von 103), mit drei sind es 76.

### 🗓️ „Aktiv von – bis"

Gemeint sind die **Kalenderjahre, in denen wirklich gespielt wurde** – nicht die Saison-Etiketten. Wer im Herbst 2011 seine erste Partie in der Saison 11/12 bestritt, ist ab **2011** aktiv, nicht ab 2012.

Der Unterschied ist kein Randfall: Bei **48 von 103** Spielern weicht er ab. Gezählt werden nur gespielte Runden; eine Saison, in der jemand nur auf der Liste stand, verlängert seine Laufbahn nicht.

Die Spalte **Zeitraum** in der Rangliste und die Zusätze auf der Rekordtafel rechnen genauso.

### Filter im Spielerfenster

Hat jemand in mehreren Wettbewerben oder für mehrere Mannschaften gespielt, erscheinen oben im Fenster Knopfreihen dafür. **Alles rechnet mit:** Kennzahlen, Sieg-Remis-Niederlage-Balken, Bestmarken, Säulendiagramm und Tabelle.

Kombinationen, die es nicht gibt – etwa „SGM" und „Rhf 1", eine Mannschaft, die nie SGM gespielt hat – sind **abgeblendet statt entfernt**. Entfernte Knöpfe liessen die Leiste bei jedem Klick eine andere Länge haben, und man suchte Knöpfe, die eben noch da waren.

**Die Filterleiste der Seite verhält sich genauso.** Wählst du Rhf 1, werden SGM und SMM abgeblendet; wählst du SGM, verschwinden die deutschen Mannschaften aus der Auswahl. Der Zeitraum zählt mit: Ist 2006–2010 eingestellt, ist BMM nicht wählbar, weil es die erst ab 2012 gibt.

Eine Reihe mit nur einer Möglichkeit entfällt ganz: Wer nie für eine zweite Mannschaft gespielt hat, braucht keine Mannschaftswahl. Das ist eine Eigenschaft der Person und ändert sich beim Filtern nicht – die Leiste bleibt also trotzdem still.

Aufgebaut ist sie als **eine Reihe je Filter**, Beschriftung links, Knöpfe rechts. Nebeneinander sähe es bei drei Wettbewerben aufgeräumt aus und zerfiele, sobald es mehr werden: Die zweite Beschriftung rutschte dann mitten in die Knöpfe der ersten. Geprüft ist das mit acht Mannschaften und fünf Wettbewerben.

In der Tabelle **Alle Saisons** hat jede Zeile einen **farbigen linken Rand** je Wettbewerb – dieselbe Sprache wie die Zeitleiste im Terminarchiv. In einer Laufbahn von zwanzig Jahren stehen dort vierzig Zeilen untereinander, die sich nur in drei Buchstaben unterscheiden; die Farbe macht daraus Blöcke, ohne dass die Zeile breiter wird.

**Die Farben vergibt die Seite selbst.** Zwölf Plätze auf dem Farbkreis, möglichst weit auseinander; der Name des Wettbewerbs bestimmt über eine Prüfsumme seinen Wunschplatz, ist der besetzt, rückt er auf den nächsten freien. Das heisst:

* **Ein neuer Wettbewerb bekommt von selbst eine Farbe** – niemand muss den Quelltext anfassen.
* **Stabil:** `SGM` behält seinen Ton über die Jahre, unabhängig davon, in welcher Reihenfolge die Zeilen in der CSV stehen.
* **Getrennt:** Zwei Wettbewerbe bekommen nie denselben Ton. Geprüft bis 20 Wettbewerbe – mehr als zwölf teilen sich einen Platz, werden dann aber um einige Grad verschoben.
* **Kein Gold:** Die Töne zwischen 30 und 65 Grad bleiben frei. Dort liegt das Vereinsgold, das auf dieser Seite „Bestwert" und „ausgewählt" bedeutet.

Sättigung und Helligkeit stehen im Stylesheet, nicht im Skript – nur so lässt sich derselbe Ton im hellen Theme dunkler ausgeben, damit er auf Weiss lesbar bleibt. Die Plätze stehen in `js/bestenliste.js` als `LIGA_TOENE`.

### Ausgeschriebene Wettbewerbsnamen

Beim Darüberfahren über eine Zeile erscheint der volle Name. Er steht in **`info.csv`**, nicht im Code:

```csv
liga.SGM;Schweizerische Gruppenmeisterschaft
liga.SMM;Schweizerische Mannschaftsmeisterschaft
liga.BMM;Badische Mannschaftsmeisterschaft
```

Fehlt der Eintrag, **erscheint kein Hinweis** – nur das Kürzel, das ohnehin in der Zeile steht. Das ist Absicht: Ein erfundener Langname sähe aus, als hätte ihn jemand nachgeschlagen.

**Bei einem neuen Wettbewerb** bekommt die Seite Filterknopf, Farbe und Tabellenzeile von selbst. Den ausgeschriebenen Namen trägst du nach, sobald du magst – eine Zeile `liga.NMM;…` in `info.csv`, fertig. Gross- und Kleinschreibung spielt keine Rolle: `liga.nmm` findet auch den Wettbewerb `NMM`.

Sie führt Punkte und Partien in **zwei getrennten Spalten**. Kompakter wäre „3½ / 7" in einer Zelle gewesen – aber dann richtet sich jede Zeile für sich aus, und weil `3½` breiter ist als `1`, wandert der Schrägstrich. Zwei Spalten richtet die Tabelle selbst aus.

### Was ein „Saisonjahr" ist

Die Spalte `Jahr` ist das Jahr, in dem eine Saison **endet** – die letzte Zahl im Etikett:

| Wettbewerb | Etikett | Saisonjahr |
| :--- | :--- | :--- |
| Schweizer Gruppenmeisterschaft | `SGM 25/26` | 2026 |
| Bezirksmannschaftsmeisterschaft | `BMM 25/26` | 2026 |
| Schweizer Mannschaftsmeisterschaft | `SMM 26` | 2026 |

Alle drei liegen damit im Saisonjahr **2025/26**. Innerhalb eines Jahrgangs zählt der Spielkalender, nicht das Etikett: SGM und BMM laufen Oktober–März, die SMM März–September. Die **SMM endet also zuletzt** und steht in absteigenden Listen ganz oben – auch wenn „SMM 26" nach weniger aussieht als „SGM 25/26". Das folgt dem Spielkalender: SGM und BMM beginnen im Herbst 2025 und enden im Frühjahr 2026, die SMM 26 wird im Lauf des Jahres 2026 gespielt – zusammen ein durchgehender Zeitraum von Herbst bis Herbst.

Nach **Kalenderjahr** zu gruppieren wäre die naheliegende Alternative und die schlechtere: Sie würde SGM und BMM mitten in der Saison zerschneiden.

Aus 50 einzelnen Wettbewerbs-Saisons werden so **21 Saisonjahre**. Deshalb stehen im Spielerfenster Werte wie „11½ aus 19" – das sind drei Wettbewerbe zusammen.

Damit „2025/26" für die SMM nicht rätselhaft bleibt, nennt die Saison-Auswahl ihren Inhalt mit: **`2025/26 · SGM 25/26 · SMM 26 · BMM 25/26`**. Filterst du auf einen Wettbewerb, schrumpft die Aufzählung entsprechend. Im Spielerfenster steht unter jeder Bestmarke klein, welche Wettbewerbe die Person in dem Jahr gespielt hat.

### Zeitraum: Saison oder Kalenderjahr

Über dem Schieberegler steht ein Umschalter:

* **Saison** – ganze Saisonjahre. SGM 25/26, BMM 25/26 und SMM 26 gehören zusammen, Meisterschaften werden nicht zerschnitten.
* **Kalenderjahr** – das echte Jahr der einzelnen Runde. Von einer Saison zählen dann nur die Partien, die tatsächlich in diesem Jahr gespielt wurden.

Der Unterschied ist erheblich: 2026 sind es **226 Partien** nach Saisonjahr, aber **163** nach Kalenderjahr. Beides ist richtig, nur eben etwas anderes.

Der Regler hat zwei Griffe. Beide aufeinander ergibt ein einzelnes Jahr; ein Griff ganz aussen heisst „keine Grenze". Er arbeitet mit Positionen in der Jahresliste, nicht mit Jahreszahlen – so entsteht keine tote Stelle, wenn ein Jahr fehlt (2020 hat wegen Corona keine SMM). Wenn ein gewähltes Jahr im neu gewählten Wettbewerb gar nicht vorkommt, rückt die Grenze auf die nächstgelegene vorhandene, statt eine leere Liste ohne erkennbaren Grund zu zeigen.

### `saisons.csv` – welche Runde in welchem Jahr

Für den Kalenderjahr-Modus braucht die Seite eine zweite, kleine Datei:

```csv
Team;Liga;Saison;Jahr;Runden;Jahre;Rundennummern
Rhy 1;SGM;25/26;2026;7;2025,2025,2025,2026,2026,2026,2026;1,2,3,4,5,6,7
Rhy 1;SGM;21/22;2022;5;2022,2022,2022,2022,2022;2,3,4,5,6
```

* `Runden` – wie viele Runden diese Mannschaft in dieser Saison hatte.
* `Jahre` – das Kalenderjahr **jeder Runde**, in derselben Reihenfolge wie `Resultate` in `bestenliste.csv`.
* `Rundennummern` – die **echten** Rundennummern. Zwei Eigenheiten stecken darin, und beide sehen wie Fehler aus, wenn man sie nicht kennt:
  * **Lücken:** Hat eine Mannschaft spielfrei, fehlt die Spalte im Statistikblatt ganz. Die SGM 21/22 von Rhy 1 besteht deshalb aus den Runden **2 bis 6** – das betrifft 25 der 78 Blöcke.
  * **Doppelte:** In den früheren BMM-Saisons von Rhf 2 wurde mit **Rückspiel** gespielt, deshalb `1,1,2,2,3,3,4,4,6,6`. Die Website schreibt das aus: „Runde 1 · Hinrunde" und „Runde 1 · Rückrunde".

In `bestenliste.csv` sind leere Runden am **Ende** weggeschnitten, weil sie nichts zur Bilanz beitragen. Für die Anzeige holt die Seite die volle Rundenzahl aus dieser Datei zurück – sonst sähe eine Saison mit fünf Runden, in der nur Runde 4 gespielt wurde, nach vier Runden aus.

78 Zeilen, eine je Mannschaft und Saison. Eine eigene Tabelle statt einer weiteren Spalte, weil die Jahre für alle Spielerinnen und Spieler derselben Mannschaft gleich sind – in jede der 801 Zeilen geschrieben stünde dieselbe Angabe hundertfach da.

**Warum steht die Mannschaft mit drin?** Weil Rhy 1 und Rhy 2 dieselbe SGM-Saison spielen, aber in verschiedenen Gruppen und damit an verschiedenen Terminen. Runde 3 der SGM 09/10 fiel für Rhy 1 ins Jahr 2009, für Rhy 2 ins Jahr 2010. In den Daten gibt es sieben solcher Fälle.

Das Apps Script erzeugt das Blatt `saisons` im selben Durchgang – **beide Blätter** müssen hochgeladen werden.

Jahre, in denen nur ein Wettbewerb stattfand, verraten sich so von selbst – etwa `2020/21 · SMM 21` (Corona).
