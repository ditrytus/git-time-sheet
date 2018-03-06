import subprocess as sub
import os

proc = sub.Popen([
    "git",
    "log",
    "--no-walk",
    "-20",
    "--author-date-order",
    "--author=\"Jakub\"",
    "--pretty=format:\"%H %an %aI\""],
    stdout=sub.PIPE,
    cwd="C:\\Users\\Jakub_admin\\Documents\\srw")

while proc.poll() is None:
    l = proc.stdout.readline() # This blocks until it receives a newline.
    print(repr(l))

# std_out = proc.stdout.readline()
# for line in std_out:
#     print(line)

# print std_out.re
# print(repr(std_out).replace("\\n", "\n").replace("\\t", "\t"))