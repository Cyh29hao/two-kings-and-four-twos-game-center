import {face,suit} from '@/lib/game/engine';

/** Deliberately independent of the landlord card's large decorative suit. */
export function HoldemCard({card,size='community'}:{card:number;size?:'community'|'seat'|'own'|'report'|'hero'}){
 const red=[1,3].includes(card%4),label=`${suit(card)}${face(card)}`;
 return <div className={`th-card th-card-${size}${red?' is-red':''}`} role="img" aria-label={label} data-card={card}>
  <div className="th-card-index" aria-hidden="true"><b>{face(card)}</b><span>{suit(card)}</span></div>
  <span className="th-card-decoration" aria-hidden="true">{suit(card)}</span>
 </div>;
}
