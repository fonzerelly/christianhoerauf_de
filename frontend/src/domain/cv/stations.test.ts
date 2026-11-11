import { describe, expect, it } from "vitest";
import { itemAt } from "../lists";
import { engagementLabel, entryQuestions, shortName, stationsOf, yearLabel } from "./stations";
import type { Cv } from "./stations";

const TODAY = 2026.85;

/** Ein ausgedachter Lebenslauf (das Repo ist öffentlich; der echte steht nur im Backend). */
const CV: Cv = {
  sections: [
    {
      name: "beruf",
      entries: [
        {
          time: "10/2020 – heute",
          title: "Entwicklerin",
          organization: "Beispiel AG",
          bulletPoints: ["Datenstrecke mit Kafka", "Neues Frontend"],
        },
        {
          time: "2014 – 09/2020",
          title: "Beraterin",
          organization: "Muster Software AG",
          bulletPoints: [],
        },
      ],
    },
    {
      name: "studium",
      entries: [
        {
          time: "2008 – 2013",
          title: "Informatik",
          organization: "Universität Musterstadt",
          bulletPoints: [],
        },
        {
          time: "2016 – 2019",
          title: "Mathematik, berufsbegleitend",
          organization: "Fernhochschule Beispiel",
          bulletPoints: [],
        },
      ],
    },
    {
      name: "lehre",
      entries: [
        {
          time: "2022 – heute",
          title: "Lehrauftrag",
          organization: "Hochschule Beispiel",
          bulletPoints: [],
        },
      ],
    },
    {
      name: "zivildienst",
      entries: [
        { time: "2007", title: "Zivildienst", organization: "ehrenamtlich", bulletPoints: [] },
      ],
    },
    {
      name: "projekte",
      entries: [
        { title: "Projekt ohne Zeit", bulletPoints: [] },
        { time: "irgendwann", title: "Unlesbar", bulletPoints: [] },
      ],
    },
  ],
};

const titles = (stations: readonly { title: string }[]): string[] =>
  stations.map(({ title }) => title);

describe("stationsOf", () => {
  const stations = stationsOf(CV, TODAY);

  it("nimmt nur Einträge mit lesbarem Zeitraum, sortiert nach Beginn", () => {
    expect(
      titles([...stations.mainTrack, ...stations.engagements].sort((a, b) => a.from - b.from)),
    ).toEqual([
      "Zivildienst",
      "Informatik",
      "Beraterin",
      "Mathematik, berufsbegleitend",
      "Entwicklerin",
      "Lehrauftrag",
    ]);
  });

  it("legt den Beruf und alles, was vor ihm endete, auf die Linie", () => {
    expect(titles(stations.mainTrack)).toEqual([
      "Zivildienst",
      "Informatik",
      "Beraterin",
      "Entwicklerin",
    ]);
    expect(stations.careerStart).toBe(2014);
  });

  it("macht, was neben dem Beruf lief, zum Engagement", () => {
    expect(titles(stations.engagements)).toEqual(["Mathematik, berufsbegleitend", "Lehrauftrag"]);
  });

  it("gibt jeder Station eine Nummer in der Reihenfolge des Beginns", () => {
    expect(stations.mainTrack.map(({ id }) => id)).toEqual([0, 1, 2, 4]);
  });

  it("nimmt eine klein geschriebene Organisation nicht als Namen („ehrenamtlich“)", () => {
    expect(stations.mainTrack[0]?.organization).toBeUndefined();
    expect(stations.mainTrack[1]?.organization).toBe("Universität Musterstadt");
  });

  it("nimmt ohne Beruf den ersten Eintrag als Beginn", () => {
    const withoutCareer = stationsOf(
      { sections: CV.sections.filter(({ name }) => name !== "beruf") },
      TODAY,
    );

    expect(withoutCareer.careerStart).toBe(2007);
  });

  it("kommt mit einem leeren Lebenslauf zurecht", () => {
    expect(stationsOf({ sections: [] }, TODAY)).toEqual({
      careerStart: TODAY,
      mainTrack: [],
      engagements: [],
    });
  });
});

describe("Beschriftungen", () => {
  const { mainTrack, engagements } = stationsOf(CV, TODAY);
  const informatik = itemAt(mainTrack, 1);
  const beraterin = itemAt(mainTrack, 2);
  const entwicklerin = itemAt(mainTrack, 3);
  const mathematik = itemAt(engagements, 0);

  it("kürzt den Namen um die Rechtsform, sonst steht der Titel da", () => {
    expect(shortName(entwicklerin)).toBe("Beispiel");
    expect(shortName(beraterin)).toBe("Muster");
    expect(shortName(itemAt(mainTrack, 0))).toBe("Zivildienst");
  });

  it("beschriftet mit dem ersten Jahr des Zeitraums", () => {
    expect(yearLabel(entwicklerin)).toBe("2020");
    expect(yearLabel(informatik)).toBe("2008");
  });

  it("beschriftet ein Engagement mit Titel (bis zum Komma) und Organisation", () => {
    expect(engagementLabel(mathematik)).toBe("Mathematik · Fernhochschule Beispiel");
  });

  it("beschriftet ein Engagement ohne Organisation nur mit dem Titel", () => {
    const withoutOrganization = {
      id: mathematik.id,
      section: mathematik.section,
      time: mathematik.time,
      title: mathematik.title,
      bulletPoints: [],
      from: mathematik.from,
      to: mathematik.to,
    };

    expect(engagementLabel(withoutOrganization)).toBe("Mathematik");
  });
});

describe("entryQuestions", () => {
  const { mainTrack } = stationsOf(CV, TODAY);
  const zivildienst = itemAt(mainTrack, 0);
  const entwicklerin = itemAt(mainTrack, 3);

  it("fragt allgemein nach der Station und je Stichpunkt nach mehr", () => {
    expect(entryQuestions(entwicklerin)).toEqual([
      {
        label: "Was hat Chris bei Beispiel AG gemacht?",
        question: "Was hat Chris bei Beispiel AG gemacht?",
      },
      {
        label: "Datenstrecke mit Kafka",
        question: "Erzähl mir mehr über Chris und „Datenstrecke mit Kafka“ bei Beispiel AG.",
      },
      {
        label: "Neues Frontend",
        question: "Erzähl mir mehr über Chris und „Neues Frontend“ bei Beispiel AG.",
      },
    ]);
  });

  it("nennt ohne Organisation den Titel", () => {
    const withPoint = { ...zivildienst, bulletPoints: ["Pflege"] };

    expect(entryQuestions(withPoint).map(({ question }) => question)).toEqual([
      "Was hat Chris in der Zeit „Zivildienst“ gemacht?",
      "Erzähl mir mehr über Chris und „Pflege“ (Zivildienst).",
    ]);
  });
});
