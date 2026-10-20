// Server-side fixture adapter. The browser loads catalogs through the API.
import {
  games as seedGames,
  initialQuests as seedQuests,
} from "../../../backend/src/seed-data";
import type { Game, Quest } from "./contracts";
export const games = seedGames as Game[];
export const initialQuests = () => seedQuests() as Quest[];
