import { describe, expect, it } from "vitest";
import { filterBySearch, includesSearch, normalizeText } from "./search";

describe("normalizeText", () => {
  it("tira espaços das pontas e deixa minúsculo", () => {
    expect(normalizeText("  Café Coado ")).toBe("café coado");
  });
});

describe("includesSearch", () => {
  it("encontra o termo em qualquer parte do texto", () => {
    expect(includesSearch("Pão de Alho", "alho")).toBe(true);
    expect(includesSearch("Pão de Alho", "queijo")).toBe(false);
  });

  it("trata texto vazio como sem resultado", () => {
    expect(includesSearch(null, "alho")).toBe(false);
  });
});

describe("filterBySearch", () => {
  const people = [
    { name: "Ana", table: "5" },
    { name: "Bruno", table: null },
  ];

  it("devolve tudo quando a busca está vazia", () => {
    expect(filterBySearch(people, "  ", (person) => [person.name])).toBe(
      people,
    );
  });

  it("filtra por qualquer um dos textos", () => {
    expect(
      filterBySearch(people, "5", (person) => [person.name, person.table]),
    ).toEqual([people[0]]);
    expect(filterBySearch(people, "BRU", (person) => [person.name])).toEqual([
      people[1],
    ]);
  });
});
