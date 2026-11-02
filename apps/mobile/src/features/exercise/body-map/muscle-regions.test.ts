import { regionsForMuscles } from "./muscle-regions";

describe("regionsForMuscles", () => {
  it("marks first catalog row primary and maps chest press", () => {
    const map = regionsForMuscles(
      [
        { name: "Pectoralis Major (Sternal)", pct: 70 },
        { name: "Anterior Deltoids & Triceps", pct: 30 },
      ],
      "Chest",
    );
    expect(map.chest).toBe("primary");
    expect(map.arms).toBe("secondary");
  });

  it("maps leg tags for squats", () => {
    const map = regionsForMuscles([{ name: "Quadriceps Femoris", pct: 55 }], "Quads");
    expect(map.quads).toBe("primary");
  });
});
