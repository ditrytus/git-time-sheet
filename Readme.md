# git-time-sheet

NodeJS script that generates a CSV file with a time sheet based on a commits in a selected git repository.

## Usage

```
node gts.js -h

usage: gts.js [-h] [-v] [-r REPOSITORY] -a AUTHOR [-l LIMIT]
              [-p {day,week,month,year}] [-n PERIODNUMBER]
              [-w WORKINGDAYSTART] [-o OUTPUT]


Generates time sheet report from git log.

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  -r REPOSITORY, --repository REPOSITORY
                        Path to a folder with git repository. Default:
                        working directory.
  -a AUTHOR, --author AUTHOR
                        Author of commits. Only commits which author contains
                        this value will be included.
  -l LIMIT, --limit LIMIT
                        Maximum number of commits that will be inspected.
                        This value limits the amount of processed commits so
                        that the script does not have to inspect entire log
                        every time. Default: 200.
  -p {day,week,month,year}, --period {day,week,month,year}
                        Period length for which to generate the report.
                        Default: month.
  -n PERIODNUMBER, --periodNumber PERIODNUMBER
                        Number of period where 0 means the current period, -1
                        previous one. Ex. -p month -n -2 = two months ago.
                        Default: 0.
  -w WORKINGDAYSTART, --workingDayStart WORKINGDAYSTART
                        An hour when you usually start work. It is used to
                        calculate duration of first commit in a given day in
                        format HH:mm. Default: 09:00.
  -o OUTPUT, --output OUTPUT
                        Output CSV file name (with extension). Default: out.
                        csv.
```

### Examples:

#### On Windows:

```
node gts.js -a Jakub -w 09:20 -n -1 -o test.csv
```

#### On Linux:

```
./gts.js -a Jakub -w 09:20 -n -1 -o test.csv
```

## Output

CSV file with the following collumns:
- Commit SHA
- Author
- Date
- JIRA tiket number if found (ex. ABC-2043)
- Estimated duration (HH:mm:ss)

### Example:
```
0a966e5e1df9bbc9e202cfb2f1e514324d292e02;Jakub Gruszecki;2018-02-01 10:25:41;SRW-50;01:05:00
9c3cbea6031d62b471446f2870d513a8c25e1c8a;Jakub Gruszecki;2018-02-01 10:26:14;SRW-50;00:00:00
ce2365b07036f090526c71846e73cc1fa2b5af55;Jakub Gruszecki;2018-02-01 17:16:39;SRW-196;06:50:00
2b03eab0254e63c6f0732895e2427309f162c51a;Jakub Gruszecki;2018-02-02 10:29:26;SRW-196;01:09:00
9ba583d1f4ef0bab761a7ad516866cc4c0c2e0e6;Jakub Gruszecki;2018-02-02 11:54:43;SRW-196;01:25:00
```

## Estimating duration

If commit was a first during the day than the duration is a difference between the start of working day and commit time. If first commit was before start if working day than 5 minutes is assumed.

Duratuion of all subsequent commits in a given day is estimated as a time since the last commit in the same repository.