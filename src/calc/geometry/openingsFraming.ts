/**
 * Металл обрамления ворот, дверей и окон — то самое слагаемое, которое
 * расчётчик вписывает в формулу «Конструкции из труб» руками
 * (ведомость, C96: «…+0,432+…» в «22316» и «…+0,795+…» в «22318»).
 *
 * Правила у него не было ровно до тех пор, пока не выяснилось, что это
 * не ручное число, а ячейка подборщика: вывод!E68 = Лист1!O29, тонны.
 * Совпадает до пятого знака в обоих реальных проектах — 0,43176 и
 * 0,79548 — и расчётчик просто округляет её до трёх знаков.
 *
 * Формулы подборщика (лист «Лист1», столбец O):
 *
 *   O23 ворота до 6 м    = 350 × кол-во × 1,05
 *   O24 ворота свыше 6 м = 450 × кол-во × 1,05
 *   O25 двери            = (шаг рам + 4) × кол-во × 7,2 × 1,05
 *   O26 отдельные окна   = (вес_нижнего_ригеля + вес_верхнего/шаг × (2×высота + шаг)) × кол-во
 *   O27 ленточные окна   = (длина_ленты × высота × (пог.вес_нижнего + пог.вес_верхнего)
 *                            + стоек × высота × пог.вес_нижнего) × 1,05
 *   O29 = (O23 + O24 + O25 + O26 + O27) / 1000
 *
 * 350 и 450 кг — вес одних ворот, 7,2 кг/м — погонный вес перемычки
 * (в O25 стоит числом, хотя рядом та же величина считается), 1,05 — 5%
 * на раскрой.
 *
 * ОКНА СЮДА НЕ ВХОДЯТ. Их часть требует сечений перемычек, которые
 * подборщик подбирает у себя на листе «Расчет» под ветровую нагрузку, и
 * этот расчёт мы ещё не разбирали: в двух реальных проектах окон нет,
 * а на выдуманных погонный вес верхней перемычки менялся (7,2 против
 * 4,3 кг/м). Поэтому при заданных окнах результат помечается неполным —
 * значение подборщика (вывод!E68) вводится вручную.
 */

import type { OpeningGroup } from "./openings";
import { isWindowRigelType, selectWindowRigel, windowRigelFactors, WINDOW_RIGEL_TUBE_PRICE_PER_TON, type WindowRigelFactors, type WindowRigelSelection } from "./windowRigels";

/** Вес одних ворот по ширине, кг (Лист1!Q23:Q24). */
const GATE_MASS_kg = { under6: 350, over6: 450 } as const;
/** Погонный вес перемычки двери, кг/м — в формуле O25 стоит числом. */
const DOOR_LINTEL_kg_per_m = 7.2;
/** Надбавка на раскрой — 1,05 во всех строках. */
const ALLOWANCE = 1.05;
/** Ширина, с которой ворота считаются «свыше 6 м». */
const WIDE_GATE_m = 6;

export interface OpeningsFramingInput {
  /** Размеры ворот — классификация «до/свыше 6 м» у каждого своя. */
  gates: readonly OpeningGroup[];
  doorsCount: number;
  /** Шаг рам, м (вывод!F8 → Лист1!B7). */
  framePitch_m: number;
  /** Есть ли в проекте окна — от них зависит полнота результата. */
  hasWindows: boolean;
  /** Типы схем окон; один тип на размерную группу. */
  windows?: readonly OpeningGroup[];
  /** Нагрузки для инженерного подбора оконных ригелей. */
  windowWindLoad_kPa?: number;
  windowVerticalLoad_kPa?: number;
}

export interface OpeningsFramingMass {
  gates_kg: number;
  doors_kg: number;
  windows_kg: number;
  windows_cost: number;
  /** Суммарная масса обрамления, т — слагаемое формулы «Конструкции из труб». */
  total_t: number;
  /** false — в сумме нет обрамления окон, его надо ввести руками. */
  complete: boolean;
  /** Коэффициенты Excel для заданных групп окон; не заменяет подбор сечения. */
  windowFactors: Array<WindowRigelFactors & { count: number; width_m: number; height_m: number }>;
  windowSelections: Array<WindowRigelSelection & { count: number; width_m: number; height_m: number }>;
}

export function computeOpeningsFraming(input: OpeningsFramingInput): OpeningsFramingMass {
  // Несколько размеров ворот — обычные и широкие вперемешку — каждый
  // считается своим весом (Лист1!O23/O24 — это ДВЕ строки исходника,
  // ровно под этот случай), а не средним по всем воротам сразу.
  const gates_kg = input.gates.reduce((sum, g) => {
    const perGate_kg = g.width_m > WIDE_GATE_m ? GATE_MASS_kg.over6 : GATE_MASS_kg.under6;
    return sum + perGate_kg * g.count * ALLOWANCE;
  }, 0);
  const doors_kg =
    (input.framePitch_m + 4) * input.doorsCount * DOOR_LINTEL_kg_per_m * ALLOWANCE;

  const windowFactors = (input.windows ?? []).flatMap((window) => {
    const type = window.windowType;
    if (window.count <= 0 || type === undefined || !isWindowRigelType(type)) return [];
    return [{ ...windowRigelFactors(type), count: window.count, width_m: window.width_m, height_m: window.height_m }];
  });
  const windowSelections = (input.windows ?? []).flatMap((window) => {
    const type = window.windowType;
    if (window.count <= 0 || type === undefined || !isWindowRigelType(type)) return [];
    const selection = selectWindowRigel({
      type,
      height_m: window.height_m,
      framePitch_m: input.framePitch_m,
      verticalLoad_kPa: input.windowVerticalLoad_kPa ?? 0.42,
      windLoad_kPa: input.windowWindLoad_kPa ?? 0.44,
    });
    return selection ? [{ ...selection, count: window.count, width_m: window.width_m, height_m: window.height_m }] : [];
  });
  const windows_kg = windowSelections.reduce(
    (sum, selection) =>
      sum +
      selection.count *
        (selection.profile.massPerM_kg * selection.lowerLength_m +
          selection.profile.massPerM_kg * (selection.upperLength_m + 2 * selection.height_m)),
    0,
  );
  const windows_cost = (windows_kg / 1000) * WINDOW_RIGEL_TUBE_PRICE_PER_TON;
  const hasPositiveWindows = (input.windows ?? []).some((w) => w.count > 0 && w.width_m > 0 && w.height_m > 0);

  return {
    gates_kg,
    doors_kg,
    windows_kg,
    windows_cost,
    total_t: (gates_kg + doors_kg + windows_kg) / 1000,
    complete: !input.hasWindows || (hasPositiveWindows && windowSelections.length === (input.windows ?? []).filter((w) => w.count > 0 && w.width_m > 0 && w.height_m > 0).length),
    windowFactors,
    windowSelections,
  };
}
