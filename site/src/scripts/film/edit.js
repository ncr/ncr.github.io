// The music video's edit decision list. Every time below is derived from the
// measured beat grid of "We Can Fix Everything" (music-grid.json), so cuts,
// snaps and punches land on the recording's own kicks.
//
// Song map (bar 0 = the drum entrance at 21.663 s, four bars per phrase):
//   intro     0.00–21.66  arpeggio, no kick, layers enter at 4.8 / 7.5 / 12.5 / 17.4, surge at 20.4
//   groove    bars 0–7    kick + arpeggio
//   melody    bars 8–58   lead enters; small dip in bars 44–47; fill in bar 59
//   chorus    bars 60–77  densest part of the track
//   breakdown bars 78–79  bass drops out
//   build     bars 80–87  filtered pad rising to a drop
//   groove 2  bars 88–95  one-bar stop in bar 95
//   final     bars 96–117 long high note, glide riser 237–243 s
//   stop      bars 118–119
//   peak      bars 120–125
//   outro     bars 126–   fade
import grid from '../../data/music-grid.json';
import sheetData from '../../data/film-sheets.json';

const G=grid.beats,PERIOD=.53667;
export const sheets=sheetData.sheets;
export const duration=grid.duration;

/** Time of beat n (fractional allowed; negative counts back into the intro). */
export function beat(n){
 if(n<0)return G[0]+n*PERIOD;
 const i=Math.floor(n),u=n-i;
 const at=k=>k<G.length?G[k]:G.at(-1)+(k-G.length+1)*PERIOD;
 return at(i)+(at(i+1)-at(i))*u;
}
const b=beat,bar=k=>beat(4*k);

// Wallpaper layout is shared by the whole collection (2560 × 1080 film frame).
const R={
 full:[1280,540,2560],wide:[1280,540,2900],title:[520,850,1150],name:[330,775,640],
 auxL:[390,240,860],auxL2:[330,610,760],auxR:[2150,250,780],graph:[2110,650,660],
 specs:[2100,860,860],logo:[2428,920,420],header:[1280,85,1000],
};
function dev(id,f=1){const [x0,y0,x1,y1]=sheets[id].device,w=Math.max((x1-x0)*1.25,(y1-y0)*1.25*2560/1080);return [(x0+x1)/2,(y0+y1)/2,w*f];}
function at(id,fx,fy,w){const [x0,y0,x1,y1]=sheets[id].device;return [x0+fx*(x1-x0),y0+fy*(y1-y0),w];}
/** Camera key: [x,y,w] framing plus pitch/yaw/roll in degrees, fov and the easing into this key. */
function K(t,r,o={}){const at=Array.isArray(r)?{x:r[0],y:r[1],w:r[2]}:{ref:r};return {t,...at,pitch:o.p??0,yaw:o.y??0,roll:o.r??0,fov:o.fov??35,e:o.e??'io'};}
const ORDER={long:[0,0,1,.12],sweep:[1,0,0,.12],radial:[0,1,0,.12],random:[0,0,0,1],mixed:[.5,0,.6,.3]};

function sheet(id,t0,t1,o={}){
 const brief=t1-t0<1.2&&(o.cam||[]).every(k=>k.w>=1500);
 return {kind:'sheet',id,t0,t1,res:brief?'thumb':'film',cam:o.cam||[K(t0,R.full),K(t1,R.wide,{e:'l'})],
  tex:o.tex??[[t0,1]],wipe:o.wipe??null,
  ink:o.ink??null,order:ORDER[o.order||'long'],dir:o.dir||[1,0],span:o.span??.22,depth:o.depth??[[t0,0]],
  shimmer:o.shimmer??0,punch:o.punch??null,bob:o.bob??0,swing:o.swing??0,exposure:o.exposure??[[t0,1]],
  grid:o.grid??.5,glow:o.glow??1,cover:o.cover??false,clamp:o.clamp??false,caption:o.caption,chapter:o.chapter,captionAt:o.captionAt,quiet:o.quiet,ghost:o.ghost??0};
}
// Punch: a short zoom/exposure kick on every n-th beat inside the shot.
const P=(every,amp,from=0)=>({every,amp,from});

const shots=[],cuts=[];
const add=s=>{shots.push(s);return s;};
const cut=(at,type='cut',o={})=>cuts.push({at,type,...o});

// ─── Intro: only lines, four unnamed machines ───────────────────────────────
add(sheet('o03',0,4.79,{tex:[[0,0]],ink:[[0,.05],[4.79,.5]],order:'sweep',span:.1,depth:[[0,40]],
 cam:[K(0,at('o03',.1,.45,340),{y:22,p:10}),K(4.79,at('o03',.48,.45,470),{y:8,p:4,e:'l'})],
 exposure:[[0,1],[4.15,1],[4.5,.35]],grid:.9,caption:'Najpierw tylko linie.',chapter:'Intro'}));
cut(0,'black',{post:1.8});
add(sheet('o13',4.79,8.45,{tex:[[0,0]],ink:[[4.79,.04],[8.45,.62]],order:'radial',span:.18,depth:[[0,110]],
 cam:[K(4.79,at('o13',.5,.42,520),{p:40,y:-34}),K(8.45,at('o13',.52,.58,700),{p:30,y:14,e:'l'})],grid:.8,
 caption:'Z bliska trudno jeszcze zgadnąć.'}));
cut(8.02,'fade',{pre:.001,post:.55});
add(sheet('o01',8.02,13.08,{tex:[[0,0]],ink:[[8.02,.06],[13.08,.7]],order:'long',span:.2,
 cam:[K(8.02,at('o01',.32,.3,560),{r:-14}),K(13.08,at('o01',.5,.5,860),{r:5,e:'l'})],grid:.8,caption:'Każdy detal ma swój rytm.'}));
add(sheet('o02',13.08,17.36,{tex:[[0,0]],ink:[[13.08,.08],[17.36,.72]],order:'sweep',span:.16,depth:[[0,80]],
 cam:[K(13.08,at('o02',.12,.5,720),{p:26,y:-30}),K(17.36,at('o02',.88,.48,760),{p:22,y:30,e:'l'})],grid:.8,caption:'Jeszcze chwila.'}));
cut(13.08,'cut');
// Tension: one close look per note of the transitional figure.
[[17.36,'o03',.42],[18.17,'o13',.35],[18.97,'o01',.6],[19.52,'o02',.3],[20.05,'o03',.7]].forEach(([t,id,fx],i,a)=>{
 const t1=a[i+1]?.[0]??20.4,[x,y]=at(id,fx,.45+.1*(i%2),0);
 add(sheet(id,t,t1,{quiet:true,tex:[[0,0]],ink:[[t,.62+.05*i],[t1,.72+.05*i]],order:'long',span:.2,depth:[[0,60]],
  cam:[K(t,[x,y,760],{y:i%2?-18:18,r:i%2?4:-4}),K(t1,[x,y,440],{y:i%2?-10:10,e:'o'})],grid:.8}));
 cut(t,'cut');
});
// Surge: the camera is thrown back as the last lines close.
add(sheet('o02',20.4,21.663,{tex:[[0,0]],ink:[[20.4,.8],[21.6,1]],order:'sweep',span:.16,depth:[[20.4,70],[21.6,0]],
 cam:[K(20.4,at('o02',.5,.5,300),{p:24,y:12}),K(21.663,R.full,{e:'i'})],exposure:[[20.4,.85],[21.6,1.25]],grid:.8,quiet:true}));
cut(20.4,'cut');

// ─── Groove: the reveal ─────────────────────────────────────────────────────
cut(b(0),'flash',{amt:1.2});
const four=['o03','o13','o01','o02'];
add({kind:'panels',t0:b(0),t1:b(4),layout:'grid2',caption:'Cztery maszyny. Teraz widać wszystko.',chapter:'Wejście',
 panels:four.map((id,i)=>({open:b(0),shot:sheet(id,b(0),b(4),{tex:[[b(0),0],[b(1),1,'o']],ink:[[b(0),1]],glow:1.4,cover:true,
  cam:[K(b(0),R.full),K(b(4),R.full.map((v,j)=>j==2?v*.88:v),{e:'l'})],punch:P(1,.03)})}))});
cut(b(4),'zoom',{pre:.22,post:.3,center:[.75,.25]});
add(sheet('o02',b(4),b(8),{cam:[K(b(4),[1280,540,2750]),K(b(8),[1280,520,2300],{e:'l'})],punch:P(1,.025),shimmer:.7,caption:'Sky Racer'}));
add(sheet('o02',b(8),b(12),{cam:[K(b(8),[250,780,720]),K(b(12),[470,790,760],{e:'l'})],punch:P(2,.02),shimmer:.5}));
cut(b(8),'cut');
add(sheet('o02',b(12),b(16),{cam:[K(b(12),dev('o02',.72),{y:-22,p:14}),K(b(14),dev('o02',.8),{y:14,p:8,e:'l'}),K(b(16),R.full,{e:'io'})],punch:P(1,.03),shimmer:1}));
cut(b(12),'cut');

// Quantum Simulator builds in layered depth, then lies flat into its sheet.
cut(b(16),'whip',{dir:[-1,0]});
add(sheet('o01',b(16),b(32),{tex:[[b(16),0],[b(28),0],[b(30),1]],wipe:[1,0],ink:[[b(16),0],[b(28),1,'l']],order:'long',span:.14,
 depth:[[b(16),150],[b(26),150],[b(30),0]],
 cam:[K(b(16),dev('o01',.9),{y:-42,p:32}),K(b(22),dev('o01',.78),{y:6,p:18,e:'l'}),K(b(28),dev('o01',1),{y:34,p:10,e:'l'}),K(b(30),R.full),K(b(32),[1280,540,2450],{e:'l'})],
 punch:P(2,.02),caption:'Quantum Simulator'}));

// ─── Melody: a new grammar per phrase ───────────────────────────────────────
cut(b(32),'wipe',{post:b(33)-b(32),dir:[1,0]});
add(sheet('c087',b(32),b(48),{shimmer:.8,punch:P(1,.02),chapter:'Melodia',caption:'Neutrino Bell',
 cam:[K(b(32),R.full),K(b(35.2),[1280,540,2450],{e:'l'}),K(b(36),R.auxL,{e:'s'}),K(b(39.2),R.auxL.map((v,i)=>i==0?v+90:v),{e:'l'}),
  K(b(40),dev('c087',.55),{y:16,e:'s'}),K(b(43.2),dev('c087',.6),{y:-6,e:'l'}),K(b(44),R.graph,{r:-3,e:'s'}),K(b(46.5),R.graph.map((v,i)=>i==2?v*1.1:v),{e:'l'}),K(b(48),R.full,{e:'s'})]}));
cut(b(48),'zoom',{pre:.2,post:.3});
add(sheet('o09',b(48),b(64),{tex:[[b(48),0],[b(59),0],[b(62),1]],wipe:[0,1],ink:[[b(48),0],[b(60),1,'l']],order:'sweep',dir:[0,1],span:.12,depth:[[b(48),70],[b(59),70],[b(62),0]],
 cam:[K(b(48),at('o09',.5,1,620),{p:56}),K(b(60),at('o09',.5,.08,720),{p:40,e:'l'}),K(b(62),R.full),K(b(64),[1280,540,2400],{e:'l'})],
 bob:6,punch:P(2,.02),caption:'Tether Climber'}));
cut(b(64),'iris');
add({kind:'panels',t0:b(64),t1:b(80),layout:'strips3',base:null,
 panels:[['c025',[900,720],[1650,380]],['c017',[1600,300],[950,760]],['o05',[800,380],[1750,700]]].map(([id,a,z],i)=>({open:b(64+2*i),close:b(78),slide:i%2?1:-1,
  shot:sheet(id,b(64),b(80),{cover:true,clamp:true,cam:[K(b(64),[...a,1700]),K(b(80),[...z,1500],{e:'l'})],punch:P(4,.03),shimmer:.6,caption:sheets[id].name})})),
 caption:'Fibre Braid · Memory Kiln · Cortical Mesh'});
// Proxy draws itself while the strips slide away, then runs.
add(sheet('o13',b(78),b(96),{tex:[[b(78),0],[b(88),0],[b(90),1]],wipe:[1,0],ink:[[b(78),0],[b(89),1,'l']],order:'mixed',span:.16,depth:[[b(78),90],[b(87),90],[b(90),0]],
 cam:[K(b(78),at('o13',.25,.78,820),{p:18,y:-26}),K(b(88),at('o13',.72,.32,900),{p:12,y:24,e:'l'}),K(b(90),R.full),K(b(92),[2150,238,780],{e:'s'}),K(b(96),[2120,250,700],{e:'l'})],
 bob:10,punch:P(1,.022,b(80)),caption:'Twój zastępca nabiera kształtów.',captionAt:b(80)}));
cut(b(96),'whip',{dir:[0,1]});
add(sheet('o11',b(96),b(112),{tex:[[b(96),.3],[b(104),1]],ink:[[b(96),1]],glow:1.6,shimmer:1.2,
 cam:[K(b(96),dev('o11',1.05),{y:18,p:24}),K(b(108),dev('o11',1),{y:-16,p:14,e:'l'}),K(b(109),dev('o11',.74),{e:'s'}),K(b(110),dev('o11',.52),{e:'s'}),K(b(111),dev('o11',.36),{e:'s'}),K(b(112),dev('o11',.3),{e:'l'})],
 punch:P(1,.02),caption:'Organ Foundry'}));
cut(b(112),'zoom',{pre:.2,post:.35});
// The wall: all 42 sheets; pull back from Organ Foundry, glide, dive into Dune Skimmer.
add({kind:'wall',t0:b(112),t1:b(128),focus:[['o11',b(112)],['c056',b(128)]],
 cam:[K(b(112),{tile:'o11',w:2700}),K(b(116),{tile:'o11',w:9000,dx:.4},{p:12,y:-10}),K(b(124),{tile:'c056',w:8000,dx:-.3},{p:8,y:14,e:'l'}),K(b(128),{tile:'c056',w:2600},{e:'i'})],
 wave:1,caption:'Wszystkie tapety naraz.'});
cut(b(128),'zoom',{pre:.18,post:.3});
add(sheet('c056',b(128),b(144),{tex:[[b(128),0],[b(134),0],[b(137),1]],ink:[[b(128),.02],[b(136),1,'o']],order:'radial',span:.2,
 cam:[K(b(128),dev('c056',.42),{r:-28}),K(b(136),dev('c056',1.15),{r:5,e:'l'}),K(b(140),R.full,{r:0}),K(b(144),[1280,540,2450],{e:'l'})],
 punch:P(2,.025),caption:'Dune Skimmer'}));
// The real 3D nozzle geometry of the Fusion Transport.
cut(b(144),'flash',{amt:.55});
add({kind:'nozzle',t0:b(144),t1:b(160),paper:sheets.o03.paper,
 orbit:[[b(144),-70,18,1.5],[b(150),10,32,1.05,'io'],[b(156),120,26,.9,'io'],[b(160),170,12,1.25,'io']],punch:P(1,.03),
 caption:'Podejdźmy do dyszy.',chapter:'Dysza'});
cut(b(160),'iris');
const dip=[['c031','c018'],['o07','c010'],['c080','c044'],['c060','c006']];
add({kind:'panels',t0:b(160),t1:b(176),layout:'split2',caption:dip.map(p=>p.map(id=>sheets[id].name).join(' · ')).join(' / '),
 panels:[0,1].map(side=>({open:b(160),seq:dip.map((pair,k)=>sheet(pair[side],b(160+4*k),b(164+4*k),{cover:true,clamp:true,
  cam:[K(b(160+4*k),[side?1500:1060,side?330:760,1900]),K(b(164+4*k),[side?1060:1500,side?760:330,1700],{e:'l'})],punch:P(1,.02),shimmer:.6}))}))});
// Dip in the song: quiet dinner in real 3D, then the lamp.
cut(b(176),'fade',{pre:.3,post:.6});
add({kind:'dinner',t0:b(176),t1:b(188.5),paper:sheets.o10.paper,
 orbit:[[b(176),-70,30,1.05],[b(188.5),35,16,.72,'io']],caption:'Kolacja jak każda inna.',chapter:'Kolacja'});
cut(b(188),'fade',{pre:.001,post:b(189)-b(188)});
add(sheet('o10',b(188),b(192),{ink:[[b(188),1]],glow:1.8,shimmer:.8,cam:[K(b(188),[1280,626,947]),K(b(192),[1280,335,600],{e:'io'})],caption:'Tylko lampa nasłuchuje nieprawdy.'}));
cut(b(192),'cut');
add(sheet('c002',b(192),b(208),{tex:[[b(192),0],[b(204),0],[b(206),1]],wipe:[0,1],ink:[[b(192),.02],[b(204),1,'l']],order:'sweep',dir:[0,1],span:.1,depth:[[b(192),40],[b(204),40],[b(206),0]],
 cam:[K(b(192),[1280,820,880],{p:66}),K(b(204),[1280,160,900],{p:64,e:'l'}),K(b(206),R.full),K(b(208),[1280,540,2450],{e:'l'})],punch:P(2,.02,b(196)),caption:'Tidal Loom'}));
cut(b(208),'whip',{dir:[1,0]});
// Bounder runs: one region every two beats.
[[dev('o06',.5),'Bounder'],[R.name],[R.graph],[R.auxL],[at('o06',.5,.55,760)],[R.auxR],[R.auxL2],[R.full]].forEach(([r,caption],k)=>{
 const t0=b(208+2*k),t1=b(210+2*k);add(sheet('o06',t0,t1,{cam:[K(t0,r.map((v,i)=>i==2?v*1.18:v),{r:k%2?3:-3}),K(t1,r,{e:'o'})],punch:P(1,.03),shimmer:.6,caption}));if(k)cut(t0,'cut');
});
cut(b(224),'cut');
add(sheet('c105',b(224),b(236),{tex:[[b(224),0],[b(232),0],[b(235),1]],ink:[[b(224),0],[b(233),1,'i']],order:'random',span:.08,depth:[[b(224),0],[b(233),110],[b(235.5),0]],
 cam:[K(b(224),dev('c105',.9),{y:-16,p:10}),K(b(234),dev('c105',.55),{y:20,p:16,e:'i'}),K(b(236),dev('c105',.8),{e:'o'})],punch:P(2,.02),caption:'Metric Embassy'}));
// Fill into the chorus: a glimpse of what is coming, faster and faster.
[['c030',236],['c099',237],['c042',238],['c065',238.5],['o04',239],['c030',239.5]].forEach(([id,n],k,a)=>{
 const t0=b(n),t1=b(a[k+1]?.[1]??240),d=dev(id,.5);add(sheet(id,t0,t1,{cam:[K(t0,d.map((v,i)=>i==2?v*1.3:v),{r:k%2?-6:6}),K(t1,d,{e:'o'})],ink:[[t0,1]],glow:1.6,quiet:k>0,caption:'Za chwilę refren.'}));cut(t0,'cut');
});

// ─── Chorus: one bar, one sheet, one move ───────────────────────────────────
cut(b(240),'flash',{amt:1});
add(sheet('c030',b(240),b(244),{cam:[K(b(240),dev('c030',.34)),K(b(241),R.full,{e:'s'}),K(b(244),[1280,540,2350],{e:'l'})],punch:P(1,.045),shimmer:.8,caption:'Advice Filter',chapter:'Refren'}));
cut(b(244),'whip',{dir:[-1,0]});
add(sheet('c099',b(244),b(248),{cam:[K(b(244),[420,540,1800]),K(b(245),dev('c099',1),{e:'s'}),K(b(248),dev('c099',.9),{e:'l'})],punch:P(1,.045),shimmer:.8,caption:'Sleep Cocoon'}));
cut(b(248),'flash',{amt:.45});
add(sheet('c042',b(248),b(252),{cam:[K(b(248),dev('c042',1.2),{y:38,p:26}),K(b(252),dev('c042',1.2),{y:-38,p:22,e:'l'})],punch:P(1,.045),shimmer:.8,caption:'Wind Kite'}));
cut(b(252),'whip',{dir:[0,-1]});
add(sheet('c065',b(252),b(256),{cam:[K(b(252),[1280,540,1000],{r:28}),K(b(256),[1280,540,2500],{r:0,e:'o'})],punch:P(1,.045),shimmer:.8,caption:'Seam Surgeon'}));
cut(b(256),'flash',{amt:.6});
// Split screens multiply on the beat: 2 → 4 → 9, then fall into the centre.
const g4=['c038','c101','c103','c104'],g9=['c105','c106','c107','c108','c110','c100','c070','c010','c044'];
const cell=(id,t0,t1,k)=>sheet(id,t0,t1,{cover:true,clamp:true,cam:[K(t0,[1280+(k%2?-240:240),540,2300]),K(t1,[1280,540,2000],{e:'l'})],shimmer:.7,punch:P(1,.03)});
add({kind:'panels',t0:b(256),t1:b(260),layout:'split2',caption:'Volumetric Stage · Aroma Organ',panels:['o12','o08'].map((id,k)=>({open:b(256),shot:cell(id,b(256),b(260),k)}))});
cut(b(260),'cut');
add({kind:'panels',t0:b(260),t1:b(264),layout:'grid2',caption:g4.map(id=>sheets[id].name).join(' · '),panels:g4.map((id,k)=>({open:b(260+k),shot:cell(id,b(260),b(264),k)}))});
cut(b(264),'cut');
add({kind:'panels',t0:b(264),t1:b(270),layout:'grid3',caption:'Dziewięć naraz.',panels:g9.map((id,k)=>({open:b(264+[4,0,5,2,8,3,6,1,7][k]*.5),shot:cell(id,b(264),b(270),k)}))});
cut(b(270),'zoom',{pre:.2,post:.3});
add(sheet('c110',b(270),b(272),{cam:[K(b(270),[1280,540,2300]),K(b(272),[1280,540,2150],{e:'l'})],punch:P(1,.04),caption:'Spin Table'}));
cut(b(272),'whip',{dir:[1,0]});
add({kind:'wall',t0:b(272),t1:b(288),focus:[['c070',b(288)]],
 cam:[K(b(272),{tile:'c099',w:7000,dx:.3},{y:-34,p:6}),K(b(284),{tile:'c070',w:7400,dx:-.2},{y:-30,p:10,e:'l'}),K(b(288),{tile:'c070',w:2600},{y:0,p:0,e:'i'})],
 wave:2,punch:P(1,.03),caption:'Przelot.'});
cut(b(288),'zoom',{pre:.18,post:.3});
// Four sheets drawn in one bar each.
['c070','c100','c103','c108'].forEach((id,k)=>{
 const t0=b(288+4*k),s=k%2?1:-1;
 add(sheet(id,t0,b(292+4*k),{tex:[[t0,0],[b(289.6+4*k),0],[b(291+4*k),1]],wipe:k%2?[0,1]:[1,0],ink:[[t0,0],[b(290+4*k),1,'o']],order:k%2?'radial':'random',span:.12,depth:[[t0,110],[b(290+4*k),0]],
  cam:[K(t0,dev(id,.75),{y:30*s,p:22}),K(b(290.5+4*k),dev(id,1.05),{y:-8*s,p:6}),K(b(292+4*k),R.full)],punch:P(1,.04),caption:sheets[id].name}));
 if(k)cut(t0,'flash',{amt:.5});
});
cut(b(304),'whip',{dir:[0,1]});
add(sheet('o07',b(304),b(312),{cam:[K(b(304),[1280,540,2600]),K(b(312),[1280,540,2200],{e:'l'})],punch:P(1,.06),swing:3.5,shimmer:1,caption:'Air Refinery'}));

// ─── Breakdown: bass gone, one pen left ─────────────────────────────────────
cut(b(312),'cut');
add(sheet('o03',b(312),b(320),{tex:[[0,0]],ink:[[b(312),.03],[b(320),.52]],order:'sweep',span:.08,depth:[[0,30]],
 cam:[K(b(312),at('o03',.06,.45,380),{y:14}),K(b(320),at('o03',.5,.45,480),{y:4,e:'l'})],exposure:[[b(312),.75]],grid:1,caption:'Oddech.',chapter:'Cisza'}));
// Build: layered orbit, getting faster.
cut(b(320),'fade',{pre:.001,post:.5});
add(sheet('o12',b(320),b(336),{tex:[[b(320),0],[b(333),0],[b(336),1]],ink:[[b(320),0],[b(333),1,'l']],order:'long',span:.12,depth:[[b(320),170],[b(331),170],[b(335),0]],
 cam:[K(b(320),dev('o12',1.05),{y:-55,p:32}),K(b(328),dev('o12',.9),{y:0,p:26,e:'l'}),K(b(334),dev('o12',.8),{y:55,p:18,e:'i'}),K(b(336),R.full)],
 exposure:[[b(320),.7],[b(334),1]],punch:P(4,.02,b(328)),caption:'Volumetric Stage'}));
cut(b(336),'cut');
[[[1126,486,461],'Twój trawnik: o 4% bardziej zielony.'],[[1370,389,563],'Punkt odniesienia? Sąsiad za płotem.'],[[1423,610,384],'Jego krasnal też ma kamerę.']].forEach(([r,caption],k)=>{
 const t0=b(336+4*k),t1=b(340+4*k);if(k<2){add(sheet('o04',t0,t1,{cam:[K(t0,r.map((v,i)=>i==2?v*1.25:v),{y:k?10:-10}),K(t1,r,{e:'o'})],punch:P(2,.02),shimmer:.6,caption}));if(k)cut(t0,'cut');}
});
// Bars 86–87: one cut per beat, then per half-beat, into the drop.
['o04','o08','c038','c101'].forEach((id,k)=>{const t0=b(344+k),t1=b(345+k),d=k?dev(id,.55):[1423,610,384];add(sheet(id,t0,t1,{cam:[K(t0,d.map((v,i)=>i==2?v*1.4:v)),K(t1,d,{e:'o'})],ink:[[t0,1]],glow:1.4,quiet:true}));cut(t0,'cut');});
['c104','c105','c106','c107','c108','c110','c100','c070'].forEach((id,k)=>{const t0=b(348+k*.5),t1=b(348.5+k*.5),d=dev(id,.5-.03*k);add(sheet(id,t0,t1,{cam:[K(t0,d.map((v,i)=>i==2?v*1.5:v),{r:k%2?-8:8}),K(t1,d,{e:'o'})],ink:[[t0,1]],glow:1.6,exposure:[[t0,1+.05*k]],quiet:true}));cut(t0,'cut');});

// ─── Second groove: the whole collection ────────────────────────────────────
cut(b(352),'flash',{amt:1.1});
add({kind:'wall',t0:b(352),t1:b(368),focus:[['c070',b(352)]],
 cam:[K(b(352),{tile:'c070',w:5200}),K(b(366),{center:true,w:'all'},{p:14,y:-8,e:'o'}),K(b(368),{center:true,w:'all',grow:1.04},{p:16,y:-10,e:'l'})],
 wave:3,punch:P(1,.02),caption:'42 tapety. Każda z własną historią.',chapter:'Ściana'});
cut(b(368),'zoom',{pre:.2,post:.35});
add(sheet('c106',b(368),b(384),{ink:[[b(368),1]],shimmer:.9,punch:P(1,.025),
 cam:[K(b(368),R.full),K(b(371),[1280,540,2400],{e:'l'}),K(b(372),R.auxR,{e:'s'}),K(b(375),R.auxR.map((v,i)=>i==2?v*.92:v),{e:'l'}),K(b(376),dev('c106',.6),{y:14,e:'s'}),K(b(380),dev('c106',.62),{y:10,e:'l'}),K(b(383),dev('c106',.62)),K(b(384),dev('c106',.3),{e:'i'})],
 tex:[[b(368),1],[b(380),1],[b(380.6),.25],[b(383),.25],[b(384),.8]],glow:1.5,caption:'Muon Customs'}));

// ─── Final chorus ───────────────────────────────────────────────────────────
cut(b(384),'flash',{amt:.9});
add(sheet('c001',b(384),b(400),{tex:[[b(384),0],[b(392),0],[b(396),1]],wipe:[1,0],ink:[[b(384),0],[b(394),1,'io']],order:'mixed',span:.16,depth:[[b(384),130],[b(392),130],[b(396),0]],
 cam:[K(b(384),[1280,540,3400],{p:46,y:-36}),K(b(394),dev('c001',.72),{p:20,y:10}),K(b(400),dev('c001',.95))],
 punch:P(4,.02),caption:'A tu można zwolnić.',chapter:'Żagiel'}));
cut(b(400),'cut');
add({kind:'wall',t0:b(400),t1:b(416),focus:[['o08',b(416)]],
 cam:[K(b(400),{tile:'c001',w:3000}),K(b(404),{tile:'c001',w:6000},{p:-40,r:4,e:'io'}),K(b(412),{tile:'o08',w:9000,dy:.4},{p:-52,r:14,y:10,e:'l'}),K(b(416),{tile:'o08',w:2600},{e:'i'})],
 wave:2,caption:'Wybierz swoje akwarium. Zostań na chwilę.'});
cut(b(416),'zoom',{pre:.2,post:.3});
add(sheet('o08',b(416),b(420),{ink:[[b(416),1]],depth:[[b(416),90]],tex:[[b(416),.6]],glow:1.4,cam:[K(b(416),dev('o08',.9),{fov:16}),K(b(420),dev('o08',.9),{fov:72,p:10,e:'io'})],punch:P(1,.03),caption:'Aroma Organ'}));
cut(b(420),'whip',{dir:[0,-1]});
add(sheet('c038',b(420),b(424),{cam:[K(b(420),[1280,160,1500]),K(b(421),dev('c038',1),{e:'s'}),K(b(424),dev('c038',.9),{e:'l'})],punch:P(1,.045),shimmer:.8,caption:'Quiet Stair'}));
cut(b(424),'flash',{amt:.5});
add(sheet('c101',b(424),b(428),{cam:[K(b(424),[1280,540,2500]),K(b(428),[1280,540,2300],{e:'l'})],punch:P(1,.09),swing:4,shimmer:1,caption:'Velvet Hammer'}));
cut(b(428),'whip',{dir:[1,0]});
add(sheet('c104',b(428),b(432),{cam:[K(b(428),[1280,540,1500],{r:-32}),K(b(429.5),[1280,540,2450],{r:0,e:'s'}),K(b(432),[1280,540,2300],{e:'l'})],punch:P(1,.045),caption:'Key Concord'}));
cut(b(432),'wipe',{post:b(433)-b(432),dir:[-1,0]});
const belts=[['c105','c106','c107'],['c108','c110','c100'],['c103','c044','c010'],['c080','c060','c006']];
add({kind:'panels',t0:b(432),t1:b(448),layout:'strips3',caption:'Taśma.',
 panels:[0,1,2].map(i=>({open:b(432+i*.5),seq:belts.map((row,k)=>sheet(row[i],b(432+4*k),b(436+4*k),{cover:true,clamp:true,
  cam:[K(b(432+4*k),[(i+k)%2?800:1760,(i+k)%2?300:780,1600]),K(b(436+4*k),[(i+k)%2?1760:800,(i+k)%2?780:300,1600],{e:'l'})],punch:P(1,.03),shimmer:.6}))}))});
cut(b(448),'flash',{amt:.7});
add(sheet('o14',b(448),b(464),{tex:[[b(448),0],[b(455),0],[b(458),1]],ink:[[b(448),0],[b(456),1,'o']],order:'mixed',span:.12,depth:[[b(448),160],[b(454),160],[b(458),0]],
 cam:[K(b(448),dev('o14',.85),{y:48,p:36}),K(b(456),dev('o14',.95),{y:-40,p:14,e:'l'}),K(b(458),R.full),K(b(464),[1280,540,2350],{e:'l'})],punch:P(1,.035,b(456)),shimmer:.9,caption:'Presence Rig'}));
cut(b(464),'whip',{dir:[-1,0]});
add(sheet('c107',b(464),b(472),{cam:[K(b(464),[1280,540,2600]),K(b(472),[1280,540,2250],{e:'l'})],punch:P(1,.06),swing:3,shimmer:1,caption:'Resonance Tailor'}));
// Stop: lines only, then a sudden pull in.
cut(b(472),'cut');
add(sheet('c110',b(472),b(480),{tex:[[0,0]],ink:[[b(472),.06],[b(479),.75]],order:'radial',span:.14,depth:[[0,50]],
 cam:[K(b(472),dev('c110',.9),{y:-10}),K(b(479),dev('c110',.8),{y:6,e:'l'}),K(b(480),dev('c110',.3),{e:'i'})],exposure:[[b(472),.8]],grid:1,caption:'Spin Table'}));

// ─── Peak: every beat a sheet ───────────────────────────────────────────────
cut(b(480),'flash',{amt:1.2});
['o03','o10','o02','c087'].forEach((id,k)=>{const t0=b(480+2*k),t1=b(482+2*k);add(sheet(id,t0,t1,{cam:[K(t0,dev(id,.5),{r:k%2?-5:5}),K(b(481+2*k),R.full,{e:'s'}),K(t1,[1280,540,2400],{e:'l'})],punch:P(1,.05),shimmer:1,caption:sheets[id].name,chapter:k?undefined:'Kulminacja'}));if(k)cut(t0,k%2?'whip':'flash',{dir:[k%4<2?1:-1,0],amt:.45});});
['o09','c001','o01','c025','o13','c100','o11','o05','c017','c056','c010','c080','c031','c018','o04','o07'].forEach((id,k)=>{
 const t0=b(488+k),t1=b(489+k),s=k%2?1:-1;add(sheet(id,t0,t1,{cam:[K(t0,[1280-120*s,540,2200]),K(t1,[1280+60*s,540,2350],{e:'o'})],punch:P(1,.07),shimmer:1,quiet:k>0,caption:'Szesnaście tapet, szesnaście uderzeń.'}));
 cut(t0,k%4==0?'flash':k%4==2?'whip':'cut',{amt:.4,dir:[s,0]});
});

// ─── Outro: the whole collection, fading ────────────────────────────────────
cut(b(504),'zoom',{pre:.2,post:.4});
add({kind:'wall',t0:b(504),t1:duration,focus:[['o07',b(504)]],
 cam:[K(b(504),{tile:'o07',w:2700}),K(b(514),{center:true,w:'all'},{p:10,e:'io'}),K(duration,{center:true,w:'all',grow:1.12},{p:14,e:'l'})],
 wave:3,exposure:[[b(504),1],[b(512),1],[duration-.4,0]],caption:'Przyszłość ma miejsce na dobrą zabawę.',chapter:'Finał'});

shots.sort((a,b)=>a.t0-b.t0);cuts.sort((a,b)=>a.at-b.at);
export const edit={shots,cuts};

/** Caption track for the player below the picture. */
export function captions(){
 const list=[];
 for(const s of shots){
  const id=s.id||s.panels?.[0]?.shot?.id||s.panels?.[0]?.seq?.[0]?.id||s.focus?.[0]?.[0]||(s.kind==='nozzle'?'o03':s.kind==='dinner'?'o10':'o03');
  if(s.quiet)continue;
  const caption=s.caption??(sheets[id]?.name||'');
  const last=list.at(-1);
  if(last&&last.caption===caption&&last.id===id)continue;
  list.push({at:+(s.captionAt??s.t0).toFixed(3),id,caption,x:.5,y:.5,w:1,h:1,motion:'cut',...(s.chapter?{chapter:s.chapter}:{})});
 }
 return list;
}
