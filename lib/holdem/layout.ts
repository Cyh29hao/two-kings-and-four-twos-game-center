// Ten-player tables need two distinct side rows, rather than overlapping ellipse points.
const crowded:Record<number,number[][]>={
 6:[[50,82],[14,68],[14,32],[50,18],[86,32],[86,68]],
 7:[[50,85],[20,78],[9,42],[32,15],[68,15],[91,42],[80,78]],
 8:[[50,85],[22,82],[9,50],[22,18],[50,15],[78,18],[91,50],[78,82]],
 9:[[50,85],[24,84],[9,65],[9,35],[35,15],[65,15],[91,35],[91,65],[76,84]],
 10:[[50,85],[25,84],[9,65],[9,35],[25,16],[50,15],[75,16],[91,35],[91,65],[75,84]],
};
export function holdemSeatPosition(capacity:number,relative:number){
 const preset=crowded[capacity]?.[relative];
 if(preset)return {x:preset[0],y:preset[1]};
 const angle=Math.PI/2+relative*Math.PI*2/capacity;
 return {x:50+41*Math.cos(angle),y:50+32*Math.sin(angle)};
}
