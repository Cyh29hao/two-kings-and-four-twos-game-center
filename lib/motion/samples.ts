import type {FrameMotion} from './timeline';
export type MotionSample={id:string;name:string;category:'effect'|'emote';detail:string;motion:FrameMotion;reference?:FrameMotion;sourceUrl?:string;sourceLabel?:string;beats?:string[]};
// Stage-one samples only. This catalog is never exposed by the live chat API.
const badge=(id:string,label:string,durations:number[]):FrameMotion=>({id,label,poster:`/motion-samples/${id}/poster.webp`,sheets:[{src:`/motion-samples/${id}/atlas.webp`,columns:4,rows:4,cellWidth:360,cellHeight:360}],frames:durations.map((duration,cell)=>({sheet:0,cell,duration}))});
const EMOTE_SAMPLES:MotionSample[]=[
  {
    "id": "king-laugh",
    "motion": {
      "id": "king-laugh",
      "label": "国王大笑",
      "poster": "/motion-samples/king-laugh/poster.webp",
      "sheets": [
        {
          "src": "/motion-samples/king-laugh/atlas.webp",
          "columns": 6,
          "rows": 4,
          "cellWidth": 336,
          "cellHeight": 336
        }
      ],
      "frames": [
        {
          "sheet": 0,
          "cell": 0,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 1,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 2,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 3,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 4,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 5,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 6,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 7,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 8,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 9,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 10,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 11,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 12,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 13,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 14,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 15,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 16,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 17,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 18,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 19,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 20,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 21,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 22,
          "duration": 33.333333333333336
        },
        {
          "sheet": 0,
          "cell": 23,
          "duration": 33.333333333333336
        }
      ]
    },
    "reference": {
      "id": "reference-king",
      "label": "国王大笑原版动作参考",
      "poster": "/motion-samples/reference-king/poster.webp",
      "sheets": [
        {
          "src": "/motion-samples/reference-king/atlas.webp",
          "columns": 8,
          "rows": 2,
          "cellWidth": 256,
          "cellHeight": 256
        }
      ],
      "frames": [
        {
          "sheet": 0,
          "cell": 0,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 1,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 2,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 3,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 4,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 5,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 6,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 7,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 8,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 9,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 10,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 11,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 12,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 13,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 14,
          "duration": 50
        },
        {
          "sheet": 0,
          "cell": 15,
          "duration": 50
        }
      ]
    },
    "name": "国王 · 大笑",
    "category": "emote",
    "detail": "经典大嘴笑与独立晃动的王冠，保留一个完整短循环。",
    "beats": [
      "笑脸轻弹",
      "王冠晃动",
      "回到起势"
    ],
    "sourceUrl": "https://tenor.com/view/clash-royale-laugh-lol-lmao-gif-11336783",
    "sourceLabel": "转载的完整原版动作参考"
  },
  {
    "id": "princess-yawn",
    "motion": {
      "id": "princess-yawn",
      "label": "公主哈欠",
      "poster": "/motion-samples/princess-yawn/poster.webp",
      "sheets": [
        {
          "src": "/motion-samples/princess-yawn/atlas.webp",
          "columns": 6,
          "rows": 4,
          "cellWidth": 336,
          "cellHeight": 336
        }
      ],
      "frames": [
        {
          "sheet": 0,
          "cell": 0,
          "duration": 76.66666666666667
        },
        {
          "sheet": 0,
          "cell": 1,
          "duration": 76.66666666666667
        },
        {
          "sheet": 0,
          "cell": 2,
          "duration": 76.66666666666667
        },
        {
          "sheet": 0,
          "cell": 3,
          "duration": 76.66666666666667
        },
        {
          "sheet": 0,
          "cell": 4,
          "duration": 76.66666666666667
        },
        {
          "sheet": 0,
          "cell": 5,
          "duration": 76.66666666666667
        },
        {
          "sheet": 0,
          "cell": 6,
          "duration": 129
        },
        {
          "sheet": 0,
          "cell": 7,
          "duration": 129
        },
        {
          "sheet": 0,
          "cell": 8,
          "duration": 129
        },
        {
          "sheet": 0,
          "cell": 9,
          "duration": 129
        },
        {
          "sheet": 0,
          "cell": 10,
          "duration": 129
        },
        {
          "sheet": 0,
          "cell": 11,
          "duration": 129
        },
        {
          "sheet": 0,
          "cell": 12,
          "duration": 129
        },
        {
          "sheet": 0,
          "cell": 13,
          "duration": 129
        },
        {
          "sheet": 0,
          "cell": 14,
          "duration": 129
        },
        {
          "sheet": 0,
          "cell": 15,
          "duration": 129
        },
        {
          "sheet": 0,
          "cell": 16,
          "duration": 52.354166666666686
        },
        {
          "sheet": 0,
          "cell": 17,
          "duration": 52.354166666666686
        },
        {
          "sheet": 0,
          "cell": 18,
          "duration": 52.354166666666686
        },
        {
          "sheet": 0,
          "cell": 19,
          "duration": 52.354166666666686
        },
        {
          "sheet": 0,
          "cell": 20,
          "duration": 52.354166666666686
        },
        {
          "sheet": 0,
          "cell": 21,
          "duration": 52.354166666666686
        },
        {
          "sheet": 0,
          "cell": 22,
          "duration": 52.354166666666686
        },
        {
          "sheet": 0,
          "cell": 23,
          "duration": 52.354166666666686
        }
      ]
    },
    "reference": {
      "id": "reference-princess",
      "label": "公主哈欠原版动作参考",
      "poster": "/motion-samples/reference-princess/poster.webp",
      "sheets": [
        {
          "src": "/motion-samples/reference-princess/atlas.webp",
          "columns": 8,
          "rows": 7,
          "cellWidth": 256,
          "cellHeight": 256
        }
      ],
      "frames": [
        {
          "sheet": 0,
          "cell": 0,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 1,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 2,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 3,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 4,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 5,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 6,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 7,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 8,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 9,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 10,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 11,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 12,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 13,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 14,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 15,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 16,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 17,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 18,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 19,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 20,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 21,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 22,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 23,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 24,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 25,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 26,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 27,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 28,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 29,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 30,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 31,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 32,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 33,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 34,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 35,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 36,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 37,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 38,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 39,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 40,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 41,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 42,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 43,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 44,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 45,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 46,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 47,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 48,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 49,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 50,
          "duration": 41.708333333333336
        },
        {
          "sheet": 0,
          "cell": 51,
          "duration": 41.708333333333336
        }
      ]
    },
    "name": "公主 · 哈欠",
    "category": "emote",
    "detail": "闭眼张口、手套轻移，长哈欠后缓缓收口。",
    "beats": [
      "小哈欠",
      "嘴渐张大",
      "保持长哈欠",
      "缓缓收口"
    ],
    "sourceUrl": "https://creatorset.com/products/clash-royale-princess-yawning-emote-green-screen",
    "sourceLabel": "转载的完整原版动作参考"
  },
  {
    "id": "skeleton-cry",
    "motion": {
      "id": "skeleton-cry",
      "label": "骷髅哭",
      "poster": "/motion-samples/skeleton-cry/poster.webp",
      "sheets": [
        {
          "src": "/motion-samples/skeleton-cry/atlas.webp",
          "columns": 6,
          "rows": 4,
          "cellWidth": 336,
          "cellHeight": 336
        }
      ],
      "frames": [
        {
          "sheet": 0,
          "cell": 0,
          "duration": 140
        },
        {
          "sheet": 0,
          "cell": 1,
          "duration": 140
        },
        {
          "sheet": 0,
          "cell": 2,
          "duration": 140
        },
        {
          "sheet": 0,
          "cell": 3,
          "duration": 140
        },
        {
          "sheet": 0,
          "cell": 4,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 5,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 6,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 7,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 8,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 9,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 10,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 11,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 12,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 13,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 14,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 15,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 16,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 17,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 18,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 19,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 20,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 21,
          "duration": 132.22222222222223
        },
        {
          "sheet": 0,
          "cell": 22,
          "duration": 105
        },
        {
          "sheet": 0,
          "cell": 23,
          "duration": 105
        }
      ]
    },
    "reference": {
      "id": "reference-skeleton",
      "label": "骷髅哭原版动作参考",
      "poster": "/motion-samples/reference-skeleton/poster.webp",
      "sheets": [
        {
          "src": "/motion-samples/reference-skeleton/atlas.webp",
          "columns": 8,
          "rows": 6,
          "cellWidth": 256,
          "cellHeight": 256
        }
      ],
      "frames": [
        {
          "sheet": 0,
          "cell": 0,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 1,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 2,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 3,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 4,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 5,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 6,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 7,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 8,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 9,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 10,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 11,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 12,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 13,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 14,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 15,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 16,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 17,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 18,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 19,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 20,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 21,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 22,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 23,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 24,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 25,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 26,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 27,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 28,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 29,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 30,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 31,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 32,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 33,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 34,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 35,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 36,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 37,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 38,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 39,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 40,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 41,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 42,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 43,
          "duration": 70
        },
        {
          "sheet": 0,
          "cell": 44,
          "duration": 70
        }
      ]
    },
    "name": "骷髅 · 哭",
    "category": "emote",
    "detail": "头部弹起再回落，蓝色泪流里的亮纹持续变化。",
    "beats": [
      "低位哭泣",
      "头部弹起",
      "泪纹流动",
      "回到低位"
    ],
    "sourceUrl": "https://tenor.com/en-GB/view/clash-royale-skeleton-crying-emote-gif-22035041",
    "sourceLabel": "转载的完整原版动作参考"
  }
];
export const MOTION_SAMPLES:MotionSample[]=[
 {id:'bomb',name:'炸弹',category:'effect',detail:'引线燃烧、局部爆开，再留下静态牌型标识。',motion:badge('bomb','炸弹',[150,100,90,80,80,70,70,120,100,100,90,90,90,120,180,380]),beats:['引线燃烧','局部爆开','烟团散去','牌型保留']},
 {id:'airplane',name:'飞机',category:'effect',detail:'青玉色小飞机、旋转螺旋桨和金色尾迹。',motion:badge('airplane','飞机',[140,100,100,110,110,110,110,130,130,110,110,100,100,120,160,300]),beats:['螺旋桨启动','机身轻抬','尾迹展开','落定']},
 {id:'hu',name:'麻将 · 胡',category:'effect',detail:'立体金字与短暂光圈，落在胡牌者面前。',motion:badge('hu','胡',[100,90,90,100,100,100,100,140,120,110,100,100,100,120,180,350]),beats:['金字入场','光圈绽开','金星消散','静态保留']},
 ...EMOTE_SAMPLES,
];
