export type TerrainType = 'healing'|'magic';
export type Terrain = { index:number; type:TerrainType; label:string };
export const stageTerrain: readonly Terrain[] = [{index:9,type:'healing',label:'回復地'},{index:54,type:'magic',label:'魔法陣'}];
export function terrainEffect(index:number): TerrainType|undefined { return stageTerrain.find((terrain)=>terrain.index===index)?.type; }
