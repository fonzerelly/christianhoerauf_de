---
titel: "Softwarearchitekt"
organisation: "Hafenlogistik Nord AG"
abschnitt: beruf
von: "2015"
bis: heute
technologien: [Rust, Kotlin, Kafka, Containerverfolgung, Microservices]
stichpunkte:
  - "Architektur der Containerverfolgung im Hamburger Hafen"
  - "Scanner-Software für Kräne in Rust seit 2019"
---

Seit 2015 arbeitet Chris als Softwarearchitekt bei der Hafenlogistik Nord AG in Hamburg. Er kam
von [[pixelwerk]].

Er verantwortet die Software, mit der der Hafen verfolgt, wo jeder Container gerade steht. Aus
einem einzigen großen Programm machte er bis 2018 mehrere kleine Dienste, die über Kafka
Nachrichten austauschen. Seitdem kann jedes Team seinen Dienst einzeln ausliefern.

Seit 2019 schreibt er die Software für die Scanner an den Kränen in Rust. Die Scanner lesen die
Nummern der Container, während der Kran sie hebt. Rust wählte er wegen der Speichersicherheit: Die
Scanner haben wenig Speicher, und ein Absturz auf dem Kran hält den ganzen Umschlag auf.
