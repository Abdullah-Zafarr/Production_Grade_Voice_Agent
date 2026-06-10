import subprocess
import time

p = subprocess.Popen(["fly", "logs", "-n"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
outs, errs = p.communicate(timeout=15)
print(outs)
