"""Build a four-bar edit from the recording's measured bass attacks (4/4).
Missing kicks in fills/breaks keep the tracked pulse, not a new visual tempo.
The editorial downbeat is the strong entrance at 21.663s. No runtime analysis.
"""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]; data=root/'site/src/data'
source=json.loads((data/'bass-beats.json').read_text()); attacks=source['beats']
t=21.663;period=.5375;beats=[t];observed=[True]
while t<299.21:
 pred=t+period;near=[b for b in attacks if abs(b[0]-pred)<.105]
 if near:
  hit=min(near,key=lambda b:abs(b[0]-pred)-.014*b[1]);delta=hit[0]-pred;t=hit[0];period=max(.515,min(.555,period+.12*delta));observed.append(True)
 else:t=pred;observed.append(False)
 beats.append(round(t,6))
# Interpolate missing pulses between the surrounding measured attacks.
anchors=[i for i,v in enumerate(observed) if v]
for a,b in zip(anchors,anchors[1:]):
 for i in range(a+1,b):beats[i]=round(beats[a]+(beats[b]-beats[a])*(i-a)/(b-a),6)
result={'sourceSha256':source['sha256'],'meter':[4,4],'beatsPerPhrase':16,'entrance':beats[0],'introDissolve':1.8,'duration':299.21,'method':'Editorial 4/4 entrance; adaptive phase tracking of measured bass onsets; interpolation across missing kicks. Beat positions in quiet breaks are inferred.','beats':beats,'observed':observed}
(data/'music-grid.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print(len(beats),'pulses;',len(beats)//16,'complete four-bar phrases; median quarter-note ~112 BPM')
