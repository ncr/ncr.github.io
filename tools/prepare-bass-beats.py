"""Extract strong low-frequency attacks offline from the exact soundtrack MP3.
Usage: python3 tools/prepare-bass-beats.py /path/to/kevin_koontz-we_can_fix_everything.mp3
Requires ffmpeg and NumPy. The source recording is not copied into the site.
"""
import hashlib,json,subprocess,sys
from pathlib import Path
import numpy as np
source=Path(sys.argv[1]);rate=4000;hop=20
pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-af','highpass=f=35,lowpass=f=150','-ac','1','-ar',str(rate),'-f','f32le','-'])
x=np.frombuffer(pcm,dtype='<f4').astype(float)
energy=np.sqrt(np.maximum(0,np.convolve(x*x,np.ones(80)/80,mode='same')))[::hop]
energy=np.convolve(energy,np.ones(5)/5,mode='same')
flux=np.maximum(0,energy-np.r_[np.zeros(6),energy[:-6]])
floor=np.convolve(flux,np.ones(201)/201,mode='same')
cut=max(.0008,float(np.percentile(flux,90))*.3)
peaks=[i for i in range(9,len(flux)-9) if flux[i]>max(cut,floor[i]*2.1) and energy[i]>.004 and flux[i]>=max(flux[i-8:i+9])]
selected=[]
for i in sorted(peaks,key=lambda i:flux[i],reverse=True):
 if all(abs(i-j)*hop/rate>=.32 for j in selected):selected.append(i)
selected.sort();normal=max(float(np.percentile(flux[selected],85)),.001)
beats=[[round(max(0,i*hop/rate-.012),3),round(min(1,max(.2,float(flux[i]/normal)**.65)),3)] for i in selected]
data={'source':'https://raw.githubusercontent.com/omacom/omarchy-site/master/public/music/kevin_koontz-we_can_fix_everything.mp3','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'bandHz':[35,150],'method':'20ms RMS, 30ms positive rise, adaptive threshold, 320ms peak suppression','beats':beats}
out=Path(__file__).resolve().parents[1]/'site/src/data/bass-beats.json';out.write_text(json.dumps(data,separators=(',',':'))+'\n')
print(len(beats),'bass attacks;',beats[:30])
