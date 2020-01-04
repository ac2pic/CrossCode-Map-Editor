import {Globals} from '../../../shared/globals';
import {CCMapLayer} from '../../../shared/phaser/tilemap/cc-map-layer';
import {RadialSweepTracer} from './radial-sweep-tracer';
import {Mesh, MeshBuilder, Scene, Vector3} from '@babylonjs/core';
import * as earcut from 'earcut';
import {Point} from '../../../models/cross-code-map';
import Tile = Phaser.Tilemaps.Tile;
import DynamicTilemapLayer = Phaser.Tilemaps.DynamicTilemapLayer;
import {UvMapper} from './uv-mapper';


export class LayerMeshGenerator {
	
	public generateLevel(collLayer: CCMapLayer, scene: Scene) {
		const map = Globals.map;
		if (!map) {
			throw new Error('map doesnt exist');
		}
		
		const phaserLayer = collLayer.getPhaserLayer();
		if (!phaserLayer) {
			throw new Error('phaser layer of collision layer does not exist');
		}
		const tiles = phaserLayer.getTilesWithin();
		const allTiles = new Set<Tile>();
		for (const tile of tiles) {
			if (tile.index === 0) {
				continue;
			}
			
			allTiles.add(tile);
		}
		
		if (allTiles.size === 0) {
			console.warn('not generating mesh, collision layer is empty');
			return [];
		}
		
		const meshes: Mesh[] = [];
		
		let meshCounter = 0;
		
		while (allTiles.size > 0) {
			const toCheck = [allTiles.values().next().value];
			const group = new Set<Tile>();
			while (toCheck.length > 0) {
				const tile = toCheck.pop()!;
				if (allTiles.delete(tile)) {
					
					group.add(tile);
					toCheck.push(...this.getNeighbours(tile, phaserLayer));
				}
			}
			meshes.push(this.generateMesh('coll layer ' + collLayer.details.level + ' - ' + (++meshCounter), group, phaserLayer, scene));
			// debug mesh
			const ground = MeshBuilder.CreateGround('debug plane', {
				width: collLayer.details.width,
				height: collLayer.details.height
			});
			ground.position.y = 1;
			meshes.push(ground);
		}
		
		return meshes;
	}
	
	private generateMesh(name: string, tiles: Set<Tile>, layer: DynamicTilemapLayer, scene: Scene) {
		const tracer = new RadialSweepTracer();
		const path = Array.from(tracer.getContour(tiles, layer));
		
		// debug tracer
		// const debugPath = Array.from(path).map(tile => {
		// 	return {x: tile.x, y: tile.y};
		// });
		// const ogmap = new Map<number, number>();
		// layer.getTilesWithin().forEach(t => {
		// 	ogmap.set(t.x * 1000 + t.y, t.index);
		// 	layer.putTileAt(0, t.x, t.y);
		// });
		// debugPath.forEach(p => layer.putTileAt(ogmap.get(p.x * 1000 + p.y) || 0, p.x, p.y));
		
		// let s = '';
		// pathArr.forEach(p => s += `poly_path.addLineTo(${p.x}, ${p.y});\n`);
		// console.log(s);
		
		const pathArr = Array.from(path).map(t => {
			return {x: t.x, y: -t.y};
		});
		
		const polyPath: Vector3[] = [];
		for (const tile of pathArr) {
			polyPath.push(new Vector3(tile.x, 0, tile.y));
		}
		
		const mesh = MeshBuilder.ExtrudePolygon(name, {shape: polyPath, depth: 2, updatable: true}, scene, earcut);
		mesh.position.x = -layer.tilemap.width * 0.5;
		mesh.position.z = layer.tilemap.height * 0.5;
		console.log(mesh);
		
		const uvMapper = new UvMapper();
		uvMapper.mapUv(mesh);
		return mesh;
	}
	
	private getNeighbours(tile: Tile, layer: DynamicTilemapLayer) {
		const out: Tile[] = [
			layer.getTileAt(tile.x + 1, tile.y),
			layer.getTileAt(tile.x - 1, tile.y),
			layer.getTileAt(tile.x, tile.y + 1),
			layer.getTileAt(tile.x, tile.y - 1),
		];
		
		return out.filter(tile => tile);
	}
}