"use client";
import { HazardMap } from "@/components/hazards/HazardMap";
interface FireHazeMapProps { language?: "id" | "en"; }
export const FireHazeMap = ({ language = "id" }: FireHazeMapProps) => <HazardMap language={language} />;
