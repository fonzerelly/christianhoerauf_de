// ERZEUGT von baue-bilder-der-app.sh aus frontend/src/domain/picture/ – nicht von Hand ändern.
var BILDER_DER_APP = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region ../../frontend/src/domain/lists.ts
	/** Das Element an der Stelle `index`; wirft, wenn es die Stelle nicht gibt. */
	function itemAt(list, index) {
		if (index < 0 || index >= list.length) throw new RangeError(`Stelle ${String(index)} liegt nicht in einer Liste der Länge ${String(list.length)}`);
		return list[index];
	}
	/** Das letzte Element; wirft bei einer leeren Liste. */
	function lastOf(list) {
		return itemAt(list, list.length - 1);
	}
	//#endregion
	//#region ../../frontend/src/domain/picture/cells.ts
	/** Haben zwei Stellen dieselbe Zelle? */
	function isSameCell(first, second) {
		return first.x === second.x && first.y === second.y;
	}
	/**
	* Die Zellen auf einer geraden Linie von `from` nach `to`, beide eingeschlossen. Im Raster geht
	* es nur waagrecht oder senkrecht weiter; eine Schräge wird deshalb eine Treppe. Bei jedem
	* Schritt wählt die Funktion die Richtung, die näher an der geraden Linie bleibt; bei Gleichstand
	* waagrecht.
	*/
	function cellsOnLine(from, to) {
		const deltaX = to.x - from.x;
		const deltaY = to.y - from.y;
		const stepX = Math.sign(deltaX);
		const stepY = Math.sign(deltaY);
		const distanceFromLine = (x, y) => Math.abs((x - from.x) * deltaY - (y - from.y) * deltaX);
		const cells = [from];
		let { x, y } = from;
		while (x !== to.x || y !== to.y) {
			if (x === to.x) y += stepY;
			else if (y === to.y) x += stepX;
			else if (distanceFromLine(x + stepX, y) <= distanceFromLine(x, y + stepY)) x += stepX;
			else y += stepY;
			cells.push({
				x,
				y
			});
		}
		return cells;
	}
	/**
	* Die Zellen entlang einer Kurve, gegeben als dicht liegende Punkte mit Nachkommastellen. Jeder
	* Punkt fällt in die Zelle, in der er liegt; springt die Kurve dabei über eine Zelle hinweg,
	* füllt `cellsOnLine` die Lücke. Eine Zacke aus einer einzigen Zelle (die Kurve streift eine
	* Nachbarzelle nur und kehrt gleich zurück) fällt weg, weil sie im Bild nur als Ausreißer wirkt.
	*/
	function cellsOnCurve(points) {
		const cells = [];
		for (const point of points) {
			const cell = {
				x: Math.floor(point.x),
				y: Math.floor(point.y)
			};
			const last = cells.at(-1);
			if (last === void 0) cells.push(cell);
			else if (!isSameCell(last, cell)) cells.push(...cellsOnLine(last, cell).slice(1));
		}
		return withoutSingleCellSpikes(cells);
	}
	/**
	* Schließt einen Umriss, von dem nur die linke Hälfte gerastert ist: Sie läuft von unten in der
	* mittleren Spalte bis oben in der mittleren Spalte. Die rechte Hälfte ist ihr Spiegelbild in
	* einem Feld von `width` Spalten und läuft wieder hinunter. So wird der Umriss auch im groben
	* Raster genau symmetrisch. Steigt die linke Hälfte zuletzt eine Zelle in die mittlere Spalte
	* hinab, entstünde an der Naht eine Zacke; sie fällt weg.
	*/
	function closeByMirroring(leftHalf, width) {
		const rightHalf = leftHalf.map(({ x, y }) => ({
			x: width - 1 - x,
			y
		})).reverse().slice(1);
		return withoutSingleCellSpikes([...leftHalf, ...rightHalf]);
	}
	/**
	* Entfernt Zacken aus einer Zelle: Bei A, B, A fallen B und das zweite A weg. Läuft der Weg
	* länger auf sich zurück (A, B, C, B, A), ist das keine Zacke, sondern ein gewollter Strich hin
	* und zurück, und alles bleibt.
	*/
	function withoutSingleCellSpikes(cells) {
		const result = [];
		for (let index = 0; index < cells.length; index++) {
			const before = cells[index - 1];
			const after = cells[index + 1];
			const twoBefore = cells[index - 2];
			const twoAfter = cells[index + 2];
			const turnsBackAtOnce = before !== void 0 && after !== void 0 && isSameCell(before, after);
			const turnsBackLonger = twoBefore !== void 0 && twoAfter !== void 0 && isSameCell(twoBefore, twoAfter);
			if (turnsBackAtOnce && !turnsBackLonger) {
				index++;
				continue;
			}
			result.push(itemAt(cells, index));
		}
		return result;
	}
	//#endregion
	//#region ../../frontend/src/domain/picture/face-with-hand-over-mouth.ts
	/** So viele Punkte je Bogen; dicht genug, dass zwischen zwei Punkten höchstens eine Zelle liegt. */
	const SAMPLES = 400;
	const EYE_SIDEWAYS = .38;
	const EYE_RAISED = .35;
	const EYE_HALF_WIDTH = .2;
	const EYE_HEIGHT = .18;
	/** Abstand zweier Fingerwände in Zellen: Jeder Finger ist eine Zelle breit, die Wände teilen sie sich. */
	const FINGER_WIDTH = 2;
	const FINGER_COUNT = 4;
	/** Länge der Finger vom kleinen Finger (links) bis zum Zeigefinger, als Anteil des Platzes bis zu den Augen. */
	const FINGER_SHARES = [
		.6,
		.9,
		1,
		.8
	];
	const WRIST_SHARE = .16;
	const PALM_SHARE = .2;
	/** So viele Zeilen bleiben mindestens zwischen den Augen und den Fingerspitzen frei. */
	const GAP_BELOW_EYES = 2;
	/** Ein Bogen einer Ellipse um `center`, von Winkel `from` bis `to` (0 zeigt nach rechts, π/2 nach unten). */
	function arc(center, radiusX, radiusY, from, to) {
		const points = [];
		for (let sample = 0; sample <= SAMPLES; sample++) {
			const angle = from + (to - from) * sample / SAMPLES;
			points.push({
				x: center.x + radiusX * Math.cos(angle),
				y: center.y + radiusY * Math.sin(angle)
			});
		}
		return cellsOnCurve(points);
	}
	/** Die Zellen auf einem Weg, der von `start` aus waagrecht und senkrecht von Eckpunkt zu Eckpunkt läuft. */
	function cellsThrough(start, corners) {
		const cells = [start];
		let from = start;
		for (const corner of corners) {
			cells.push(...cellsOnLine(from, corner).slice(1));
			from = corner;
		}
		return cells;
	}
	/**
	* Die Hand: aus dem Kinn das Handgelenk hinauf, links um die Handfläche, vier Finger nebeneinander
	* nach oben, rechts am Fingeransatz ein kurzer Daumen, die Handfläche hinunter und das Handgelenk
	* zurück ins Kinn.
	* Die Finger reichen so weit hinauf, dass zu den Augen `GAP_BELOW_EYES` Zeilen frei bleiben.
	*/
	function hand(size, chin, eyesBottom) {
		const palmBottom = chin.y - Math.max(2, Math.round(size * WRIST_SHARE));
		const fingerBase = palmBottom - Math.max(4, Math.round(size * PALM_SHARE));
		const room = fingerBase - (eyesBottom + GAP_BELOW_EYES);
		const left = chin.x - FINGER_COUNT / 2 * FINGER_WIDTH;
		const right = left + 8;
		const corners = [
			{
				x: chin.x,
				y: palmBottom
			},
			{
				x: left + 1,
				y: palmBottom
			},
			{
				x: left + 1,
				y: palmBottom - 1
			},
			{
				x: left,
				y: palmBottom - 1
			},
			{
				x: left,
				y: fingerBase
			}
		];
		FINGER_SHARES.forEach((share, finger) => {
			const x = left + finger * FINGER_WIDTH;
			const tip = fingerBase - Math.max(1, Math.round(room * share));
			corners.push({
				x,
				y: tip
			}, {
				x: x + FINGER_WIDTH,
				y: tip
			}, {
				x: x + FINGER_WIDTH,
				y: fingerBase
			});
		});
		corners.push({
			x: right + 1,
			y: fingerBase
		}, {
			x: right + 1,
			y: fingerBase + 2
		}, {
			x: right,
			y: fingerBase + 2
		}, {
			x: right,
			y: palmBottom - 1
		}, {
			x: right - 1,
			y: palmBottom - 1
		}, {
			x: right - 1,
			y: palmBottom
		}, {
			x: chin.x,
			y: palmBottom
		}, chin);
		return cellsThrough(chin, corners);
	}
	/**
	* Ein Smiley, der sich die Hand vor den Mund hält (🤭), in einem Feld von `size` × `size` Zellen
	* (`size` ungerade, damit das Kinn genau in der mittleren Spalte liegt). Vier Striche:
	* 1. das Gesicht, ein Kreis vom Kinn links herum zurück zum Kinn,
	* 2. die Hand, die aus dem Kinn wächst und den Mund verdeckt,
	* 3. und 4. das linke und das rechte Auge, lachend: Bögen, nach oben gewölbt.
	* Gesicht und Augen sind spiegelgleich; nur die Hand hat den Daumen rechts.
	*/
	function faceWithHandOverMouth(size) {
		const middle = (size - 1) / 2;
		const radius = middle;
		const center = {
			x: middle + .5,
			y: middle + .5
		};
		const face = closeByMirroring(arc(center, radius, radius, Math.PI / 2, 3 * Math.PI / 2), size);
		const leftEye = arc({
			x: center.x - EYE_SIDEWAYS * radius,
			y: center.y - EYE_RAISED * radius
		}, EYE_HALF_WIDTH * radius, EYE_HEIGHT * radius, Math.PI, 2 * Math.PI);
		const rightEye = leftEye.map(({ x, y }) => ({
			x: size - 1 - x,
			y
		})).reverse();
		const eyesBottom = Math.max(...leftEye.map((cell) => cell.y));
		return [
			face,
			hand(size, {
				x: middle,
				y: size - 1
			}, eyesBottom),
			leftEye,
			rightEye
		];
	}
	//#endregion
	//#region ../../frontend/src/domain/picture/heart.ts
	const CURVE_HALF_WIDTH = 16;
	const CURVE_TOP = 11.923;
	/** So viele Punkte je Hälfte; dicht genug, dass zwischen zwei Punkten höchstens eine Zelle liegt. */
	const SAMPLES_PER_HALF = 400;
	function heartCurve(t) {
		return {
			x: CURVE_HALF_WIDTH * Math.sin(t) ** 3,
			y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
		};
	}
	/** Die Höhe des Herzens in Zellen bei dieser Breite: so hoch, wie die Kurve es vorgibt. */
	function heartHeightOf(width) {
		return Math.round(width * 28.923000000000002 / 32);
	}
	/**
	* Der Umriss eines Herzens als Weg durch die Zellen eines Felds von `width` Spalten (ungerade,
	* damit Spitze und Kerbe genau in der mittleren Spalte liegen) und `heartHeightOf(width)` Zeilen.
	* Der Weg beginnt an der Spitze, läuft links hinauf über den linken Bogen zur Kerbe, über den
	* rechten Bogen zurück und endet wieder an der Spitze.
	*
	* Gerastert wird nur die linke Hälfte; die rechte ist ihr Spiegelbild (`closeByMirroring`).
	*/
	function heartPath(width) {
		const height = heartHeightOf(width);
		const toField = ({ x, y }) => ({
			x: (x + CURVE_HALF_WIDTH) / 32 * (width - 1) + .5,
			y: (CURVE_TOP - y) / 28.923000000000002 * (height - 1) + .5
		});
		const points = [];
		for (let sample = 0; sample <= SAMPLES_PER_HALF; sample++) points.push(toField(heartCurve(Math.PI + Math.PI * sample / SAMPLES_PER_HALF)));
		return closeByMirroring(cellsOnCurve(points), width);
	}
	//#endregion
	//#region ../../frontend/src/domain/picture/picture.ts
	/** Kleiner als so viele Zellen in der Breite ist ein Bild nicht mehr zu erkennen. */
	const SMALLEST_SIZE = {
		heart: 11,
		face_with_hand_over_mouth: 17
	};
	/** Waagrecht, dann senkrecht ohne Leuchtspur von `from` zu `to`; eine Ecke auf der Linie entfällt. */
	function hop(from, to) {
		const corner = {
			x: to.x,
			y: from.y
		};
		const waypoints = [];
		if (!isSameCell(corner, from) && !isSameCell(corner, to)) waypoints.push({
			...corner,
			marker: "hop"
		});
		waypoints.push({
			...to,
			marker: "hop"
		});
		return waypoints;
	}
	/**
	* Macht aus Strichen (Wegen durch Nachbarzellen) einen Weg im Format einer Glyphe: Jede Zelle
	* wird ein Wegpunkt. Beginnt ein Strich nicht dort, wo der vorige endet, springt der Lichtpunkt
	* ohne Leuchtspur hin (`hop`, erst waagrecht, dann senkrecht). Zuletzt springt er zurück an den
	* Anfang des ersten Strichs, damit er dort hinausgehen kann, wo er hereingekommen ist.
	*/
	function glyphOfStrokes(strokes) {
		const waypoints = [];
		for (const stroke of strokes) {
			const [first, ...rest] = stroke;
			if (first === void 0) continue;
			const end = waypoints.at(-1);
			if (end === void 0) waypoints.push(first);
			else if (!isSameCell(end, first)) waypoints.push(...hop(end, first));
			waypoints.push(...rest);
		}
		const start = waypoints[0];
		if (start !== void 0 && !isSameCell(lastOf(waypoints), start)) waypoints.push(...hop(lastOf(waypoints), start));
		return waypoints.map(({ x, y, marker }) => marker === void 0 ? {
			x,
			y
		} : {
			x,
			y,
			marker
		});
	}
	/**
	* Das Bild in der Breite `size` (ungerade, siehe `heartPath` und `faceWithHandOverMouth`). Das
	* Herz ist etwas niedriger als breit, der Smiley quadratisch.
	*/
	function drawPicture(name, size) {
		switch (name) {
			case "heart": return {
				width: size,
				height: heartHeightOf(size),
				glyph: glyphOfStrokes([heartPath(size)])
			};
			case "face_with_hand_over_mouth": return {
				width: size,
				height: size,
				glyph: glyphOfStrokes(faceWithHandOverMouth(size))
			};
		}
	}
	//#endregion
	exports.SMALLEST_SIZE = SMALLEST_SIZE;
	exports.drawPicture = drawPicture;
	return exports;
})({});
